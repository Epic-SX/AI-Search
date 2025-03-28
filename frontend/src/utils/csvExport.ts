import { ProductInfo } from '@/types';

// Helper function to escape CSV fields
export const csvEscape = (field: string): string => {
  if (!field) return '';
  
  // If the field is not a string, convert it to string
  const strField = typeof field === 'string' ? field : String(field);
  
  // If the field contains commas, quotes, or newlines, wrap it in quotes
  // and escape any existing quotes by doubling them
  if (strField.includes(',') || strField.includes('"') || strField.includes('\n')) {
    return `"${strField.replace(/"/g, '""')}"`;
  }
  return strField;
};

// Calculate price with tax
const calculatePriceWithTax = (price: number): number => {
  if (!price || price <= 0) return 0;
  return Math.round(price * 1.1); // 10% tax in Japan
};

// Convert product data to CSV format with proper Japanese encoding
export const convertToCSV = (products: ProductInfo[]): string => {
  if (products.length === 0) return '';
  
  // Define CSV headers based on the specified structure in the image
  const headers = [
    '検索キーワード',
    '商品名',
    'ブランド名',
    'モデル',
    'ASIN',
    'JAN',
    '価格',
    '価格＋税',
    '在庫状態',
    '在庫数',
    '購入先',
    'URL'
  ];
  
  // Create CSV header row
  let csvContent = headers.join(',') + '\n';
  
  // Process products in chunks to avoid memory issues with large datasets
  const chunkSize = 500;
  
  for (let i = 0; i < products.length; i += chunkSize) {
    const chunk = products.slice(i, i + chunkSize);
    
    // Add data rows
    chunk.forEach(product => {
      const basePrice = product.price || 0;
      const priceWithTax = basePrice > 0 ? Math.round(basePrice * 1.1) : 0; // 10% tax
      
      const row = [
        // 検索キーワード - Search term that led to this product
        csvEscape(product.search_term || ''),
        // 商品名 - Product name/title
        csvEscape(product.title || ''),
        // ブランド名 - Brand name
        csvEscape(product.brand || product.manufacturer || ''),
        // モデル - Model number
        csvEscape(product.model || product.model_number || ''),
        // ASIN - Amazon Standard Identification Number
        csvEscape(product.asin || ''),
        // JAN - Japanese Article Number (similar to UPC/EAN)
        csvEscape(product.jan || product.jan_code || ''),
        // 価格 - Price (without tax)
        basePrice,
        // 価格+税 - Price with tax
        priceWithTax,
        // 在庫状態 - Stock status (convert boolean to string if needed)
        csvEscape(typeof product.availability === 'boolean' 
          ? (product.availability ? '在庫あり' : '在庫なし') 
          : (product.stock_status || '')),
        // 在庫数 - Stock quantity
        product.stock_quantity || '',
        // 購入先 - Purchase source/store
        csvEscape(product.store || product.shop || ''),
        // URL - Product URL
        csvEscape(product.url || '')
      ];
      
      csvContent += row.join(',') + '\n';
    });
  }
  
  return csvContent;
};

// Download product information as CSV with proper Japanese encoding
export const downloadProductInfoAsCSV = (product: ProductInfo, getDisplayStoreName: (product: ProductInfo) => string): void => {
  // Create a downloadable object with product information in Japanese
  const basePrice = product.price || 0;
  const priceWithTax = calculatePriceWithTax(basePrice);
  
  // Create a ProductInfo object with all the needed fields
  const downloadData: ProductInfo = {
    url: product.url || '',
    title: product.title || 'No Title',
    price: basePrice,
    asin: product.asin || '',
    image_url: product.image_url || '',
    search_term: product.search_term || '',
    brand: product.brand || product.manufacturer || '',
    model: product.model || product.model_number || '',
    jan: product.jan || product.jan_code || '',
    stock_status: typeof product.availability === 'boolean' 
      ? (product.availability ? '在庫あり' : '在庫なし')
      : (product.stock_status || ''),
    stock_quantity: product.stock_quantity || '',
    store: getDisplayStoreName(product)
  };
  
  // Add a non-serialized property for CSV conversion
  (downloadData as any).price_with_tax = priceWithTax;
  
  // Convert to CSV
  const csvContent = convertToCSV([downloadData]);
  
  // Add UTF-8 BOM to ensure Excel recognizes the encoding correctly
  const BOM = '\uFEFF';
  const csvWithBOM = BOM + csvContent;
  
  // Create a blob with UTF-8 encoding
  const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  // Create download link and trigger click
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(downloadData.title || 'product').substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Download multiple products as CSV with proper Japanese encoding
export const downloadMultipleProductsAsCSV = (products: ProductInfo[], getDisplayStoreName: (product: ProductInfo) => string): void => {
  if (products.length === 0) return;
  
  // Format the data for download with Japanese headers
  const downloadData = products.map(product => {
    const basePrice = product.price || 0;
    const priceWithTax = calculatePriceWithTax(basePrice);
    
    // Create a ProductInfo object with all the needed fields
    const productData: ProductInfo = {
      url: product.url || '',
      title: product.title || 'No Title',
      price: basePrice,
      asin: product.asin || '',
      image_url: product.image_url || '',
      search_term: product.search_term || '',
      brand: product.brand || product.manufacturer || '',
      model: product.model || product.model_number || '',
      jan: product.jan || product.jan_code || '',
      stock_status: typeof product.availability === 'boolean' 
        ? (product.availability ? '在庫あり' : '在庫なし')
        : (product.stock_status || ''),
      stock_quantity: product.stock_quantity || '',
      store: product.store || getDisplayStoreName(product)
    };
    
    // Add a non-serialized property for CSV conversion
    (productData as any).price_with_tax = priceWithTax;
    
    return productData;
  });
  
  // Convert to CSV
  const csvContent = convertToCSV(downloadData);
  
  // Add UTF-8 BOM to ensure Excel recognizes the encoding correctly
  const BOM = '\uFEFF';
  const csvWithBOM = BOM + csvContent;
  
  // Create a blob with UTF-8 encoding
  const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  // Create download link and trigger click
  const a = document.createElement('a');
  a.href = url;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.download = `products_export_${timestamp}.csv`;
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}; 