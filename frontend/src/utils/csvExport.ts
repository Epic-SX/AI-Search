import { ProductInfo } from '@/types';

// Helper function to escape CSV fields
export const csvEscape = (field: string): string => {
  // If the field contains commas, quotes, or newlines, wrap it in quotes
  // and escape any existing quotes by doubling them
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
};

// Convert product data to CSV format with proper Japanese encoding
export const convertToCSV = (products: any[]): string => {
  if (products.length === 0) return '';
  
  // Define CSV headers in Japanese
  const headers = ['タイトル', '価格', 'URL', '画像URL', '説明', 'ショップ', '送料', '評価'];
  
  // Create CSV header row
  let csvContent = headers.join(',') + '\n';
  
  // Add data rows
  products.forEach(product => {
    const row = [
      // Properly escape fields with quotes if they contain commas or quotes
      csvEscape(product.タイトル || ''),
      product.価格 || 0,
      csvEscape(product.URL || ''),
      csvEscape(product.画像URL || ''),
      csvEscape(product.説明 || ''),
      csvEscape(product.ショップ || ''),
      product.送料 || 0,
      product.評価 || ''
    ];
    
    csvContent += row.join(',') + '\n';
  });
  
  return csvContent;
};

// Download product information as CSV with proper Japanese encoding
export const downloadProductInfoAsCSV = (product: ProductInfo, getDisplayStoreName: (product: ProductInfo) => string): void => {
  // Create a downloadable object with product information in Japanese
  const downloadData = {
    タイトル: product.title || 'No Title',
    価格: product.price || 0,
    URL: product.url,
    画像URL: product.image_url || '',
    説明: product.description || '',
    ショップ: getDisplayStoreName(product),
    送料: (product as any).shipping_fee || 0,
    評価: (product as any).rating || ''
  };
  
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
  a.download = `${downloadData.タイトル.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
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
  const downloadData = products.map(product => ({
    タイトル: product.title || 'No Title',
    価格: product.price || 0,
    URL: product.url,
    画像URL: product.image_url || '',
    説明: product.description || '',
    ショップ: product.store || getDisplayStoreName(product),
    送料: (product as any).shipping_fee || 0,
    評価: (product as any).rating || ''
  }));
  
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
  a.download = `selected_products_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}; 