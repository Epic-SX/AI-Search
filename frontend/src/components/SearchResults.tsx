import { useState, useMemo } from 'react';
import { SearchResult, ProductInfo } from '@/types';
import { FaExternalLinkAlt, FaStar, FaAmazon, FaDownload, FaCheck } from 'react-icons/fa';
import { SiRakuten, SiYahoo } from 'react-icons/si';
import { 
  Grid, Typography, Card, CardContent, CardMedia, Box, Chip, Divider, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
  Button, Pagination, Stack, Tooltip, Rating, Checkbox, IconButton
} from '@mui/material';
import SimpleRakutenImage from './SimpleRakutenImage';
// Import CSV export utilities
import { downloadProductInfoAsCSV, downloadMultipleProductsAsCSV } from '@/utils/csvExport';

// Constants
const UNKNOWN_STORE = "不明なストア";
const NO_TITLE = "タイトルなし";
const FALLBACK_IMAGE = "https://r.r10s.jp/com/img/home/logo/ogp.png";
// Number of products per page
const PRODUCTS_PER_PAGE = 6;
// Number of products per source to display in the comparison view
const PRODUCTS_PER_SOURCE = 5;

// List of alternative Rakuten sample images to use as fallbacks
const RAKUTEN_ALTERNATIVE_IMAGES = [
  "https://r.r10s.jp/com/img/home/logo/ogp.png",
  "https://r.r10s.jp/com/img/thumb/event/sdgs/common/logo_sdgs.png",
  "https://r.r10s.jp/com/img/shop/point/common/logo_point_cmn.png",
  "https://r.r10s.jp/com/img/shop/point/common/bnr_point_01.png"
];

// Function to process Rakuten image URLs
const processRakutenImageUrl = (url: string): string => {
  // If the URL is empty or undefined, use a fallback
  if (!url) {
    console.log(`Using fallback image for empty URL`);
    return RAKUTEN_ALTERNATIVE_IMAGES[0];
  }
  
  // If the URL is a placeholder, use a fallback
  if (url.includes('placehold.co')) {
    console.log(`Using fallback image for placeholder URL: ${url}`);
    return RAKUTEN_ALTERNATIVE_IMAGES[0];
  }
  
  // If the URL is the default "now_printing.jpg", use an alternative image
  if (url.includes('now_printing.jpg')) {
    console.log(`Detected default "now_printing.jpg" image, using alternative`);
    return RAKUTEN_ALTERNATIVE_IMAGES[0];
  }
  
  // Convert http to https if needed
  let processedUrl = url;
  if (processedUrl.startsWith('http:')) {
    processedUrl = processedUrl.replace('http:', 'https:');
  }
  
  // Handle shop.r10s.jp domain (direct shop images)
  if (processedUrl.includes('shop.r10s.jp')) {
    console.log(`Detected shop.r10s.jp domain URL: ${processedUrl}`);
    
    // According to Rakuten Advertising API documentation, these URLs should be used directly
    // Add cache-busting parameter to prevent caching issues
    const cacheBuster = new Date().getTime();
    if (processedUrl.includes('?')) {
      processedUrl = `${processedUrl}&_cb=${cacheBuster}`;
    } else {
      processedUrl = `${processedUrl}?_cb=${cacheBuster}`;
    }
    
    console.log(`Added cache-busting parameter to shop.r10s.jp URL: ${processedUrl}`);
    return processedUrl;
  }
  
  // Log the final URL for debugging
  console.log(`Using Rakuten image URL: ${processedUrl}`);
  
  // Return the URL as is, without any further modifications
  return processedUrl;
};

interface SearchResultsProps {
  results: SearchResult;
}

export default function SearchResults({ results }: SearchResultsProps) {
  const [imageErrors, setImageErrors] = useState<{[key: string]: boolean}>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState<{[key: string]: boolean}>({});
  
  const handleImageError = (id: string) => {
    setImageErrors(prev => ({...prev, [id]: true}));
  };

  // Safe formatter for prices
  const formatPrice = (price: number | null | undefined) => {
    return price ? price.toLocaleString() : '0';
  };
  
  // Calculate pagination
  const hasDetailedProducts = results.detailed_products && results.detailed_products.length > 0;
  const totalProducts = hasDetailedProducts ? results.detailed_products.length : 0;
  const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);
  
  // Get current page products
  const getCurrentPageProducts = () => {
    if (!hasDetailedProducts) return [];
    
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;
    return results.detailed_products.slice(startIndex, endIndex);
  };
  
  // Handle page change
  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
    // Scroll to the top of the detailed products section
    const detailedProductsElement = document.getElementById('detailed-products');
    if (detailedProductsElement) {
      detailedProductsElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getStoreName = (name: string) => {
    // If name is empty, try to determine from URL
    if (!name && results.detailed_products) {
      // Find the product with this store name
      const product = results.detailed_products.find(p => p.store === name || p.source === name);
      if (product && product.url) {
        if (product.url.includes('amazon')) return 'Amazon';
        if (product.url.includes('rakuten.co.jp') || product.url.includes('r10s.jp')) return '楽天市場';
        if (product.url.includes('yahoo')) return 'Yahoo!ショッピング';
      }
    }
    
    const lowerStoreName = name?.toLowerCase() || '';
    if (lowerStoreName.includes('amazon')) {
      return 'Amazon';
    } else if (lowerStoreName.includes('rakuten') || lowerStoreName.includes('楽天')) {
      return '楽天市場';
    } else if (lowerStoreName.includes('yahoo') || lowerStoreName.includes('ヤフー')) {
      return 'Yahoo!ショッピング';
    } else {
      return name || UNKNOWN_STORE;
    }
  };

  const getStoreIcon = (name: string) => {
    const lowerStoreName = name?.toLowerCase() || '';
    if (lowerStoreName.includes('amazon')) return 'Amazon';
    if (lowerStoreName.includes('rakuten') || lowerStoreName.includes('楽天')) return 'Rakuten';
    if (lowerStoreName.includes('yahoo') || lowerStoreName.includes('ヤフー')) return 'Yahoo';
    return 'Shop';
  };

  const getStoreColor = (name: string) => {
    const lowerStoreName = name?.toLowerCase() || '';
    if (lowerStoreName.includes('amazon')) return '#FF9900';
    if (lowerStoreName.includes('rakuten')) return '#BF0000';
    if (lowerStoreName.includes('yahoo')) return '#6001D2';
    return '#666666';
  };

  const getBestPricesByStore = () => {
    if (!results.detailed_products) return [];

    // Create a map to store the cheapest product for each store
    const cheapestByStore = new Map<string, ProductInfo>();
    
    // For Amazon specifically, track the cheapest non-zero price product
    let cheapestAmazonNonZero: ProductInfo | null = null;
    
    // Process each product from detailed_products
    results.detailed_products.forEach(product => {
      // Determine store name, checking multiple sources
      let storeName = product.store || '';
      
      // If store name is missing or unknown, try to determine from other sources
      if (!storeName || storeName === UNKNOWN_STORE) {
        // Try source field
        if (product.source) {
          storeName = product.source;
        }
        // Try shop field
        else if (product.shop) {
          storeName = product.shop;
        }
        // Try to determine from URL
        else if (product.url) {
          if (product.url.includes('rakuten.co.jp') || product.url.includes('r10s.jp')) {
            storeName = '楽天市場';
          } else if (product.url.includes('amazon')) {
            storeName = 'Amazon';
          } else if (product.url.includes('yahoo')) {
            storeName = 'Yahoo!ショッピング';
          }
        }
        // Try to determine from image URL
        else if (product.image_url) {
          if (product.image_url.includes('thumbnail.image.rakuten.co.jp') || 
              product.image_url.includes('r.r10s.jp') || 
              product.image_url.includes('tshop.r10s.jp')) {
            storeName = '楽天市場';
          } else if (product.image_url.includes('amazon')) {
            storeName = 'Amazon';
          } else if (product.image_url.includes('yahoo')) {
            storeName = 'Yahoo!ショッピング';
          }
        }
      }
      
      // Normalize the store name to ensure consistent grouping
      const normalizedStoreName = getStoreName(storeName);
      
      // Skip products with no price
      if (product.price === null || product.price === undefined) {
        return;
      }
      
      // Special handling for Amazon products
      if (normalizedStoreName === 'Amazon') {
        // Skip Amazon products with price 0
        if (product.price === 0) {
          return;
        }
        
        // Update cheapest Amazon product with non-zero price
        if (!cheapestAmazonNonZero || 
            (product.price !== undefined && 
             cheapestAmazonNonZero.price !== undefined && 
             product.price < cheapestAmazonNonZero.price)) {
          // Update the store name before storing
          product.store = normalizedStoreName;
          cheapestAmazonNonZero = product;
        }
      } else {
        // For non-Amazon stores, use the original logic
        const currentCheapest = cheapestByStore.get(normalizedStoreName);
        
        // If we don't have a product for this store yet, or if this product is cheaper
        if (!currentCheapest || 
            (product.price !== undefined && 
             currentCheapest.price !== undefined && 
             product.price < currentCheapest.price)) {
          // Update the store name before adding to map
          product.store = normalizedStoreName;
          cheapestByStore.set(normalizedStoreName, product);
        }
      }
    });
    
    // If we found a non-zero price Amazon product, add it to the map
    if (cheapestAmazonNonZero) {
      cheapestByStore.set('Amazon', cheapestAmazonNonZero);
    }
    
    // Convert map values to array and sort by price
    const bestPrices = Array.from(cheapestByStore.values())
      .filter(product => product.price !== null && product.price !== undefined)
      .sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    
    return bestPrices;
  };

  // Group products by source
  const groupedProducts = useMemo(() => {
    if (!results.detailed_products || results.detailed_products.length === 0) {
      return { amazon: [], rakuten: [], yahoo: [], other: [] };
    }
    
    const grouped = {
      amazon: [] as ProductInfo[],
      rakuten: [] as ProductInfo[],
      yahoo: [] as ProductInfo[],
      other: [] as ProductInfo[]
    };
    
    console.log("Detailed products:", results.detailed_products);
    
    results.detailed_products.forEach(product => {
      // First check the source field which is more reliable
      if (product.source) {
        const source = product.source.toLowerCase();
        if (source.includes('amazon')) {
          grouped.amazon.push(product);
          return;
        } else if (source.includes('rakuten') || source.includes('楽天')) {
          grouped.rakuten.push(product);
          return;
        } else if (source.includes('yahoo') || source.includes('ヤフー')) {
          grouped.yahoo.push(product);
          return;
        }
      }
      
      // If source is not available, try to determine from store or URL
      if (!product.store) {
        // If store is undefined, try to determine from the URL
        if (product.url && product.url.includes('amazon')) {
          product.store = 'Amazon';
        } else if (product.url && (product.url.includes('rakuten') || product.url.includes('r10s.jp'))) {
          product.store = '楽天市場';
        } else if (product.url && product.url.includes('yahoo')) {
          product.store = 'Yahoo!ショッピング';
        }
      }
      
      // Check store name
      if (product.store) {
        const storeName = product.store.toLowerCase();
        if (storeName.includes('amazon')) {
          grouped.amazon.push(product);
          return;
        } else if (storeName.includes('rakuten') || storeName.includes('楽天')) {
          grouped.rakuten.push(product);
          return;
        } else if (storeName.includes('yahoo') || storeName.includes('ヤフー')) {
          grouped.yahoo.push(product);
          return;
        }
      }
      
      // Last resort: check URL directly
      if (product.url) {
        if (product.url.includes('amazon')) {
          grouped.amazon.push(product);
          return;
        } else if (product.url.includes('rakuten.co.jp') || product.url.includes('r10s.jp')) {
          grouped.rakuten.push(product);
          return;
        } else if (product.url.includes('yahoo')) {
          grouped.yahoo.push(product);
          return;
        }
      }
      
      // If we can't determine the source, add to other
      grouped.other.push(product);
    });
    
    // Log the grouped products for debugging
    console.log("Grouped products:", {
      amazon: grouped.amazon.length,
      rakuten: grouped.rakuten.length,
      yahoo: grouped.yahoo.length,
      other: grouped.other.length
    });
    
    return grouped;
  }, [results.detailed_products]);

  const bestPrices = getBestPricesByStore();

  // Handle product selection
  const handleProductSelect = (productId: string) => {
    setSelectedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };
  
  // Generate a unique ID for each product
  const getProductId = (product: ProductInfo, source: string, index: number) => {
    return `${source}-${index}-${product.url?.substring(0, 50) || ''}`;
  };
  
  // Handle select all products
  const handleSelectAll = (checked: boolean) => {
    const newSelectedProducts = { ...selectedProducts };
    
    // Update Amazon products - only those that are displayed
    groupedProducts.amazon
      .filter(product => product.price !== undefined && product.price > 0)
      .slice(0, PRODUCTS_PER_SOURCE)
      .forEach((product, index) => {
        const productId = getProductId(product, 'amazon', index);
        newSelectedProducts[productId] = checked;
      });
    
    // Update Rakuten products - only those that are displayed
    groupedProducts.rakuten
      .slice(0, PRODUCTS_PER_SOURCE)
      .forEach((product, index) => {
        const productId = getProductId(product, 'rakuten', index);
        newSelectedProducts[productId] = checked;
      });
    
    // Update Yahoo products - only those that are displayed
    groupedProducts.yahoo
      .slice(0, PRODUCTS_PER_SOURCE)
      .forEach((product, index) => {
        const productId = getProductId(product, 'yahoo', index);
        newSelectedProducts[productId] = checked;
      });
    
    setSelectedProducts(newSelectedProducts);
  };
  
  // Check if all products are selected
  const areAllProductsSelected = () => {
    let allSelected = true;
    let hasProducts = false;
    
    // Check Amazon products - only those that are displayed
    groupedProducts.amazon
      .filter(product => product.price !== undefined && product.price > 0)
      .slice(0, PRODUCTS_PER_SOURCE)
      .forEach((product, index) => {
        hasProducts = true;
        const productId = getProductId(product, 'amazon', index);
        if (!selectedProducts[productId]) {
          allSelected = false;
        }
      });
    
    // Check Rakuten products - only those that are displayed
    groupedProducts.rakuten
      .slice(0, PRODUCTS_PER_SOURCE)
      .forEach((product, index) => {
        hasProducts = true;
        const productId = getProductId(product, 'rakuten', index);
        if (!selectedProducts[productId]) {
          allSelected = false;
        }
      });
    
    // Check Yahoo products - only those that are displayed
    groupedProducts.yahoo
      .slice(0, PRODUCTS_PER_SOURCE)
      .forEach((product, index) => {
        hasProducts = true;
        const productId = getProductId(product, 'yahoo', index);
        if (!selectedProducts[productId]) {
          allSelected = false;
        }
      });
    
    return hasProducts && allSelected;
  };
  
  // Count total products
  const getTotalProductCount = () => {
    // Only count products that are actually displayed in the UI (limited by PRODUCTS_PER_SOURCE)
    const amazonCount = Math.min(groupedProducts.amazon.filter(product => product.price !== undefined && product.price > 0).length, PRODUCTS_PER_SOURCE);
    const rakutenCount = Math.min(groupedProducts.rakuten.length, PRODUCTS_PER_SOURCE);
    const yahooCount = Math.min(groupedProducts.yahoo.length, PRODUCTS_PER_SOURCE);
    
    return amazonCount + rakutenCount + yahooCount;
  };
  
  // Count selected products
  const getSelectedProductCount = () => {
    return Object.keys(selectedProducts).filter(key => selectedProducts[key]).length;
  };
  
  // Get display store name for a product
  const getDisplayStoreName = (product: ProductInfo) => {
    // First check if we have a direct store name
    if (product.source) return product.source;
    if (product.store) return product.store;
    if (product.shop) return product.shop;
    
    // If not, determine from URL
    if ((product.source || product.store || '').toLowerCase().includes('amazon')) return 'Amazon';
    if ((product.source || product.store || '').toLowerCase().includes('rakuten') || 
        (product.source || product.store || '').toLowerCase().includes('楽天') ||
        (product.url || '').toLowerCase().includes('rakuten.co.jp') ||
        (product.url || '').toLowerCase().includes('r10s.jp')) return '楽天市場';
    
    // Check URL patterns
    if (product.url) {
      if (product.url.includes('yahoo')) return 'Yahoo!ショッピング';
    }
    
    // Last resort: check image URL patterns
    if (product.image_url) {
      if (product.image_url.includes('thumbnail.image.rakuten.co.jp') || 
          product.image_url.includes('r.r10s.jp') || 
          product.image_url.includes('tshop.r10s.jp')) {
        return '楽天市場';
      } else if (product.image_url.includes('amazon')) {
        return 'Amazon';
      } else if (product.image_url.includes('yahoo')) {
        return 'Yahoo!ショッピング';
      }
    }
    
    return '不明なショップ';
  };

  // Inside the getDisplayStoreName function, add a check for JAN code
  const isJanCodeMatch = (product: ProductInfo) => {
    if (product.additional_info && product.additional_info.searched_by_jan) {
      return true;
    }
    return false;
  };

  // Add this function to render the JAN badge
  const renderJanBadge = (product: ProductInfo) => {
    if (isJanCodeMatch(product)) {
      return (
        <Chip 
          label="JAN一致" 
          size="small" 
          color="success" 
          sx={{ 
            ml: 1, 
            height: '20px',
            fontSize: '0.7rem',
            fontWeight: 'bold'
          }} 
        />
      );
    }
    return null;
  };

  // Render the component
  return (
    <Box sx={{ mt: 4 }}>
      {/* Debug information - only visible in development */}
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          検索キーワード
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {results.keywords.map((keyword, index) => (
            <Chip 
              key={index} 
              label={keyword} 
              color="primary" 
              variant="outlined" 
              size="medium"
            />
          ))}
        </Box>
        {results.jan_code && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>JAN Code:</strong> {results.jan_code} を使用して検索しました
            </Typography>
          </Box>
        )}
      </Box>

      {results.detailed_products && results.detailed_products.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            価格比較
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            ※ 詳細情報から各ECサイトの最安値商品を表示しています。
          </Typography>
          <TableContainer component={Paper} sx={{ boxShadow: 1, border: '1px solid #e0e0e0' }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 'bold', minWidth: '90px' }}>ランキング</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 'bold', minWidth: '100px' }}>ショップ</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 'bold', width: '40%' }}>商品名</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 'bold', minWidth: '120px' }}>価格（税込）</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 'bold', minWidth: '80px' }}>画像</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 'bold', minWidth: '100px' }}>リンク</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bestPrices.map((item, index) => {
                  // Determine store name from image URL if needed
                  let displayStoreName = item.store || '';
                  
                  // If store name is missing or unknown, try to determine from image URL
                  if (!displayStoreName || displayStoreName === UNKNOWN_STORE) {
                    if (item.image_url) {
                      if (item.image_url.includes('thumbnail.image.rakuten.co.jp') || 
                          item.image_url.includes('r.r10s.jp') || 
                          item.image_url.includes('tshop.r10s.jp')) {
                        displayStoreName = '楽天市場';
                      } else if (item.image_url.includes('amazon')) {
                        displayStoreName = 'Amazon';
                      } else if (item.image_url.includes('yahoo')) {
                        displayStoreName = 'Yahoo!ショッピング';
                      }
                    }
                    
                    // Also check URL if image URL didn't help
                    if ((!displayStoreName || displayStoreName === UNKNOWN_STORE) && item.url) {
                      if (item.url.includes('rakuten.co.jp') || item.url.includes('r10s.jp')) {
                        displayStoreName = '楽天市場';
                      } else if (item.url.includes('amazon')) {
                        displayStoreName = 'Amazon';
                      } else if (item.url.includes('yahoo')) {
                        displayStoreName = 'Yahoo!ショッピング';
                      }
                    }
                  }
                  
                  // Generate ranking badge based on index
                  const getRankingBadge = (position: number) => {
                    if (position === 0) {
                      return (
                        <Box sx={{ 
                          display: 'inline-flex',
                          justifyContent: 'center',
                          alignItems: 'center', 
                          bgcolor: 'gold', 
                          color: 'black', 
                          fontWeight: 'bold',
                          borderRadius: '4px',
                          px: 1.5,
                          py: 0.5,
                          minWidth: '40px',
                          textAlign: 'center'
                        }}>
                          1位
                        </Box>
                      );
                    } else if (position === 1) {
                      return (
                        <Box sx={{ 
                          display: 'inline-flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          bgcolor: 'silver', 
                          color: 'black', 
                          fontWeight: 'bold',
                          borderRadius: '4px',
                          px: 1.5,
                          py: 0.5,
                          minWidth: '40px',
                          textAlign: 'center'
                        }}>
                          2位
                        </Box>
                      );
                    } else if (position === 2) {
                      return (
                        <Box sx={{ 
                          display: 'inline-flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          bgcolor: '#cd7f32', 
                          color: 'white', 
                          fontWeight: 'bold',
                          borderRadius: '4px',
                          px: 1.5,
                          py: 0.5,
                          minWidth: '40px',
                          textAlign: 'center'
                        }}>
                          3位
                        </Box>
                      );
                    } else {
                      return (
                        <Typography variant="body2" sx={{ 
                          color: 'text.secondary',
                          display: 'inline-flex',
                          justifyContent: 'center',
                          minWidth: '40px',
                          textAlign: 'center'
                        }}>
                          {position + 1}位
                        </Typography>
                      );
                    }
                  };
                  
                  return (
                  <TableRow key={index} sx={{ 
                    '&:nth-of-type(odd)': { backgroundColor: '#f9f9f9' },
                    '&:hover': { backgroundColor: '#f5f5f5' }
                  }}>
                    <TableCell sx={{ verticalAlign: 'middle' }}>
                      {getRankingBadge(index)}
                    </TableCell>
                    <TableCell sx={{ verticalAlign: 'middle' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStoreIcon(displayStoreName) === 'Amazon' && <FaAmazon size={24} color="#FF9900" />}
                        {getStoreIcon(displayStoreName) === 'Rakuten' && <SiRakuten size={24} color="#BF0000" />}
                        {getStoreIcon(displayStoreName) === 'Yahoo' && <SiYahoo size={24} color="#6001D2" />}
                        <Typography variant="body2" fontWeight="medium">
                          {displayStoreName || UNKNOWN_STORE}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ 
                      whiteSpace: 'normal', 
                      verticalAlign: 'middle'
                    }}>
                      {item.title}
                      {item.additional_info && item.additional_info.searched_by_jan && (
                        <Chip 
                          label="JAN一致" 
                          size="small" 
                          color="success" 
                          sx={{ 
                            height: '20px', 
                            fontSize: '0.7rem', 
                            fontWeight: 'bold',
                            ml: 1,
                            verticalAlign: 'middle',
                            display: 'inline-flex'
                          }} 
                        />
                      )}
                    </TableCell>
                    <TableCell sx={{ verticalAlign: 'middle' }}>
                      <Typography variant="body1" fontWeight="bold" color="primary">
                        ¥{formatPrice(item.price)} <Typography component="span" variant="caption" color="text.secondary">(税込)</Typography>
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ verticalAlign: 'middle' }}>
                      {item.image_url ? (
                        <Box
                          component="img"
                          src={imageErrors[`price-${index}`] ? FALLBACK_IMAGE : item.image_url}
                          alt={item.title || '商品画像'}
                          onError={() => handleImageError(`price-${index}`)}
                          sx={{ 
                            width: 80, 
                            height: 80, 
                            objectFit: 'contain',
                            border: '1px solid #eee',
                            borderRadius: 1,
                            p: 1
                          }}
                        />
                      ) : (
                        <Box
                          component="img"
                          src={FALLBACK_IMAGE}
                          alt="No Image"
                          sx={{ 
                            width: 80, 
                            height: 80, 
                            objectFit: 'contain',
                            border: '1px solid #eee',
                            borderRadius: 1,
                            p: 1
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell sx={{ verticalAlign: 'middle' }}>
                      <Button
                        component="a"
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="outlined"
                        size="small"
                        onClick={(e) => e.stopPropagation()}
                        startIcon={<FaExternalLinkAlt />}
                        sx={{ whiteSpace: 'nowrap', minWidth: '100px' }}
                      >
                        商品ページ
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* New Side-by-Side Comparison View */}
      {hasDetailedProducts && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h5" gutterBottom sx={{ mb: 0 }}>
                ECサイト別商品比較
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                <Checkbox 
                  checked={areAllProductsSelected()}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  sx={{ 
                    color: 'primary.main',
                    '&.Mui-checked': {
                      color: 'primary.main',
                    }
                  }}
                />
                <Typography variant="body2">
                  全て選択 ({getSelectedProductCount()}/{getTotalProductCount()})
                </Typography>
              </Box>
            </Box>
            
            {/* Download all selected products button - keep only CSV */}
            {getSelectedProductCount() > 0 && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<FaDownload />}
                  onClick={() => {
                    // Find all selected products
                    const selectedProductsData: ProductInfo[] = [];
                    
                    // Check Amazon products
                    groupedProducts.amazon
                      .filter(product => product.price !== undefined && product.price > 0)
                      .forEach((product, index) => {
                        const productId = getProductId(product, 'amazon', index);
                        if (selectedProducts[productId]) {
                          selectedProductsData.push({
                            ...product,
                            store: 'Amazon'
                          });
                        }
                      });
                    
                    // Check Rakuten products
                    groupedProducts.rakuten.forEach((product, index) => {
                      const productId = getProductId(product, 'rakuten', index);
                      if (selectedProducts[productId]) {
                        selectedProductsData.push({
                          ...product,
                          store: '楽天市場'
                        });
                      }
                    });
                    
                    // Check Yahoo products
                    groupedProducts.yahoo.forEach((product, index) => {
                      const productId = getProductId(product, 'yahoo', index);
                      if (selectedProducts[productId]) {
                        selectedProductsData.push({
                          ...product,
                          store: 'Yahoo!ショッピング'
                        });
                      }
                    });
                    
                    // Download as CSV
                    downloadMultipleProductsAsCSV(selectedProductsData, getDisplayStoreName);
                  }}
                >
                  CSV ({getSelectedProductCount()})
                </Button>
              </Box>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            ※ 各ECサイトの検索結果を表示しています。商品が見つからない場合は、検索キーワードを変更してみてください。
          </Typography>
          <Grid container spacing={2}>
            {/* Amazon Column */}
            <Grid item xs={12} md={4}>
              <Box sx={{ 
                bgcolor: '#f8f8f8', 
                borderRadius: 2, 
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <Box sx={{ 
                  bgcolor: '#FF9900', 
                  color: 'white', 
                  p: 1, 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1
                }}>
                  <FaAmazon size={24} />
                  <Typography variant="h6">Amazon.co.jp</Typography>
                </Box>
                <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  {groupedProducts.amazon.length > 0 ? (
                    groupedProducts.amazon
                      .filter(product => product.price !== undefined && product.price > 0)
                      .slice(0, PRODUCTS_PER_SOURCE)
                      .map((product, index) => {
                        const productId = getProductId(product, 'amazon', index);
                        const isSelected = selectedProducts[productId] || false;
                        
                        return (
                        <Box 
                          key={index} 
                          onClick={() => handleProductSelect(productId)}
                          sx={{ 
                            mb: 2, 
                            p: 2, 
                            bgcolor: 'white', 
                            borderRadius: 1,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            '&:last-child': { mb: 0 },
                            position: 'relative',
                            border: isSelected ? '2px solid #FF9900' : '1px solid #eee',
                            '&:hover': {
                              boxShadow: '0 3px 8px rgba(0,0,0,0.15)',
                              cursor: 'pointer'
                            },
                            '&:hover .product-checkbox': {
                              opacity: 1,
                              visibility: 'visible'
                            }
                          }}
                        >
                          <Box 
                            className="product-checkbox"
                            sx={{ 
                              position: 'absolute', 
                              top: 10, 
                              left: 10, 
                              zIndex: 10,
                              opacity: isSelected ? 1 : 0,
                              visibility: isSelected ? 'visible' : 'hidden',
                              transition: 'opacity 0.2s ease-in-out, visibility 0.2s ease-in-out'
                            }}
                          >
                            <Checkbox 
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleProductSelect(productId);
                              }}
                              sx={{ 
                                color: '#FF9900',
                                backgroundColor: 'rgba(255,255,255,0.9)',
                                borderRadius: '4px',
                                padding: '4px',
                                '&.Mui-checked': {
                                  color: '#FF9900',
                                }
                              }}
                            />
                          </Box>
                          <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                            <Box
                              component="img"
                              src={imageErrors[`amazon-${index}`] ? FALLBACK_IMAGE : (product.image_url || FALLBACK_IMAGE)}
                              alt={product.title || '商品画像'}
                              onError={() => handleImageError(`amazon-${index}`)}
                              sx={{ 
                                width: 80, 
                                height: 80, 
                                objectFit: 'contain',
                                border: '1px solid #eee',
                                borderRadius: 1,
                                p: 1
                              }}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography 
                                variant="subtitle1" 
                                sx={{ fontWeight: 'medium', mb: 1, display: 'flex', alignItems: 'center' }}
                              >
                                {product.title}
                                {renderJanBadge(product)}
                              </Typography>
                              <Typography variant="h6" color="#FF9900" fontWeight="bold">
                                {formatPrice(product.price)}円
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Button
                              component="a"
                              href={product.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              variant="outlined"
                              size="small"
                              onClick={(e) => e.stopPropagation()}
                              sx={{ 
                                color: '#FF9900', 
                                borderColor: '#FF9900',
                                '&:hover': {
                                  borderColor: '#FF9900',
                                  bgcolor: 'rgba(255, 153, 0, 0.04)'
                                }
                              }}
                            >
                              商品ページ
                            </Button>
                            {isSelected && (
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadProductInfoAsCSV(product, getDisplayStoreName);
                                  }}
                                  variant="contained"
                                  size="small"
                                  startIcon={<FaDownload />}
                                  sx={{ 
                                    bgcolor: '#FF9900',
                                    '&:hover': {
                                      bgcolor: '#E68A00'
                                    }
                                  }}
                                >
                                  CSV
                                </Button>
                              </Box>
                            )}
                          </Box>
                        </Box>
                        );
                      })
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body1">
                        商品が見つかりませんでした
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        検索キーワードを変更するか、他のECサイトをご確認ください。
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>
            
            {/* Rakuten Column */}
            <Grid item xs={12} md={4}>
              <Box sx={{ 
                bgcolor: '#f8f8f8', 
                borderRadius: 2, 
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <Box sx={{ 
                  bgcolor: '#BF0000', 
                  color: 'white', 
                  p: 1, 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1
                }}>
                  <SiRakuten size={24} />
                  <Typography variant="h6">楽天市場</Typography>
                </Box>
                <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  {groupedProducts.rakuten.length > 0 ? (
                    groupedProducts.rakuten.slice(0, PRODUCTS_PER_SOURCE).map((product, index) => {
                      const productId = getProductId(product, 'rakuten', index);
                      const isSelected = selectedProducts[productId] || false;
                      
                      return (
                      <Box 
                        key={index} 
                        onClick={() => handleProductSelect(productId)}
                        sx={{ 
                          mb: 2, 
                          p: 2, 
                          bgcolor: 'white', 
                          borderRadius: 1,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          '&:last-child': { mb: 0 },
                          position: 'relative',
                          border: isSelected ? '2px solid #BF0000' : '1px solid #eee',
                          '&:hover': {
                            boxShadow: '0 3px 8px rgba(0,0,0,0.15)',
                            cursor: 'pointer'
                          },
                          '&:hover .product-checkbox': {
                            opacity: 1,
                            visibility: 'visible'
                          }
                        }}
                      >
                        <Box 
                          className="product-checkbox"
                          sx={{ 
                            position: 'absolute', 
                            top: 10, 
                            left: 10, 
                            zIndex: 10,
                            opacity: isSelected ? 1 : 0,
                            visibility: isSelected ? 'visible' : 'hidden',
                            transition: 'opacity 0.2s ease-in-out, visibility 0.2s ease-in-out'
                          }}
                        >
                          <Checkbox 
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleProductSelect(productId);
                            }}
                            sx={{ 
                              color: '#BF0000',
                              backgroundColor: 'rgba(255,255,255,0.9)',
                              borderRadius: '4px',
                              padding: '4px',
                              '&.Mui-checked': {
                                color: '#BF0000',
                              }
                            }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                          <SimpleRakutenImage
                            imageUrl={product.image_url || ''}
                            title={product.title}
                            height={80}
                            width={80}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography 
                              variant="subtitle1" 
                              sx={{ fontWeight: 'medium', mb: 1, display: 'flex', alignItems: 'center' }}
                            >
                              {product.title}
                              {renderJanBadge(product)}
                            </Typography>
                            <Typography variant="h6" color="#BF0000" fontWeight="bold">
                              {formatPrice(product.price)}円
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Button
                            component="a"
                            href={product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="outlined"
                            size="small"
                            onClick={(e) => e.stopPropagation()}
                            sx={{ 
                              color: '#BF0000', 
                              borderColor: '#BF0000',
                              '&:hover': {
                                borderColor: '#BF0000',
                                bgcolor: 'rgba(191, 0, 0, 0.04)'
                              }
                            }}
                          >
                            商品ページ
                          </Button>
                          {isSelected && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadProductInfoAsCSV(product, getDisplayStoreName);
                                }}
                                variant="contained"
                                size="small"
                                startIcon={<FaDownload />}
                                sx={{ 
                                  bgcolor: '#BF0000',
                                  '&:hover': {
                                    bgcolor: '#A00000'
                                  }
                                }}
                              >
                                CSV
                              </Button>
                            </Box>
                          )}
                        </Box>
                      </Box>
                      );
                    })
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body1">
                        商品が見つかりませんでした
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        楽天市場では該当する商品が見つかりませんでした。
                        <br />
                        別のキーワードで検索するか、他のECサイトをご利用ください。
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>
            
            {/* Yahoo Column */}
            <Grid item xs={12} md={4}>
              <Box sx={{ 
                bgcolor: '#f8f8f8', 
                borderRadius: 2, 
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <Box sx={{ 
                  bgcolor: '#6001D2', 
                  color: 'white', 
                  p: 1, 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1
                }}>
                  <SiYahoo size={24} />
                  <Typography variant="h6">Yahoo!ショッピング</Typography>
                </Box>
                <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  {groupedProducts.yahoo.length > 0 ? (
                    groupedProducts.yahoo.slice(0, PRODUCTS_PER_SOURCE).map((product, index) => {
                      const productId = getProductId(product, 'yahoo', index);
                      const isSelected = selectedProducts[productId] || false;
                      
                      return (
                      <Box 
                        key={index} 
                        onClick={() => handleProductSelect(productId)}
                        sx={{ 
                          mb: 2, 
                          p: 2, 
                          bgcolor: 'white', 
                          borderRadius: 1,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          '&:last-child': { mb: 0 },
                          position: 'relative',
                          border: isSelected ? '2px solid #6001D2' : '1px solid #eee',
                          '&:hover': {
                            boxShadow: '0 3px 8px rgba(0,0,0,0.15)',
                            cursor: 'pointer'
                          },
                          '&:hover .product-checkbox': {
                            opacity: 1,
                            visibility: 'visible'
                          }
                        }}
                      >
                        <Box 
                          className="product-checkbox"
                          sx={{ 
                            position: 'absolute', 
                            top: 10, 
                            left: 10, 
                            zIndex: 10,
                            opacity: isSelected ? 1 : 0,
                            visibility: isSelected ? 'visible' : 'hidden',
                            transition: 'opacity 0.2s ease-in-out, visibility 0.2s ease-in-out'
                          }}
                        >
                          <Checkbox 
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleProductSelect(productId);
                            }}
                            sx={{ 
                              color: '#6001D2',
                              backgroundColor: 'rgba(255,255,255,0.9)',
                              borderRadius: '4px',
                              padding: '4px',
                              '&.Mui-checked': {
                                color: '#6001D2',
                              }
                            }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                          <Box
                            component="img"
                            src={imageErrors[`yahoo-${index}`] ? FALLBACK_IMAGE : (product.image_url || FALLBACK_IMAGE)}
                            alt={product.title || '商品画像'}
                            onError={() => handleImageError(`yahoo-${index}`)}
                            sx={{ 
                              width: 80, 
                              height: 80, 
                              objectFit: 'contain',
                              border: '1px solid #eee',
                              borderRadius: 1,
                              p: 1
                            }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography 
                              variant="subtitle1" 
                              sx={{ fontWeight: 'medium', mb: 1, display: 'flex', alignItems: 'center' }}
                            >
                              {product.title}
                              {renderJanBadge(product)}
                            </Typography>
                            <Typography variant="h6" color="#6001D2" fontWeight="bold">
                              {formatPrice(product.price)}円
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Button
                            component="a"
                            href={product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="outlined"
                            size="small"
                            onClick={(e) => e.stopPropagation()}
                            sx={{ 
                              color: '#6001D2', 
                              borderColor: '#6001D2',
                              '&:hover': {
                                borderColor: '#6001D2',
                                bgcolor: 'rgba(96, 1, 210, 0.04)'
                              }
                            }}
                          >
                            商品ページ
                          </Button>
                          {isSelected && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadProductInfoAsCSV(product, getDisplayStoreName);
                                }}
                                variant="contained"
                                size="small"
                                startIcon={<FaDownload />}
                                sx={{ 
                                  bgcolor: '#6001D2',
                                  '&:hover': {
                                    bgcolor: '#5001B2'
                                  }
                                }}
                              >
                                CSV
                              </Button>
                            </Box>
                          )}
                        </Box>
                      </Box>
                      );
                    })
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body1">
                        商品が見つかりませんでした
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Yahoo!ショッピングでは該当する商品が見つかりませんでした。
                        <br />
                        別のキーワードで検索するか、他のECサイトをご利用ください。
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
} 