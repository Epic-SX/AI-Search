import { useState, useMemo } from 'react';
import { ImageSearchResult, ModelNumber, ProductInfo, PriceInfo } from '@/types';
import { FaExternalLinkAlt, FaStar, FaAmazon } from 'react-icons/fa';
import { SiRakuten, SiYahoo } from 'react-icons/si';
import { MdCompareArrows } from 'react-icons/md';
import { 
  Grid, Typography, Card, CardContent, CardMedia, Box, Chip, Divider, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
  Button, Pagination, Stack, Tooltip, Rating, Alert 
} from '@mui/material';
import SimpleAmazonImage from './SimpleAmazonImage';
import SimpleRakutenImage from './SimpleRakutenImage';

// Define a reliable fallback image URL
const FALLBACK_IMAGE = "https://placehold.co/300x300/eee/999?text=No+Image";
// Japanese text for unknown store
const UNKNOWN_STORE_JP = '不明なショップ';
// Japanese text for no title
const NO_TITLE_JP = '商品名なし';
// Japanese text for no results
const NO_RESULTS_JP = '検索結果がありません';
// Number of products per page
const PRODUCTS_PER_PAGE = 6;

// Extend the ProductInfo type to include additional properties
interface ExtendedProductInfo extends ProductInfo {
  additional_info?: {
    is_fallback?: boolean;
    [key: string]: any;
  };
  is_fallback?: boolean;
}

// Function to process Rakuten image URLs
const processRakutenImageUrl = (url: string): string => {
  if (!url || url.includes('placehold.co')) {
    return "https://placehold.co/300x300/BF0000/FFFFFF?text=Rakuten+Product";
  }
  
  // Convert http to https if needed
  let processedUrl = url;
  if (processedUrl.startsWith('http:')) {
    processedUrl = processedUrl.replace('http:', 'https:');
  }
  
  // Add size parameter if needed
  if (!processedUrl.includes('_ex=') && !processedUrl.includes('?_ex=')) {
    processedUrl = `${processedUrl}${processedUrl.includes('?') ? '&' : '?'}_ex=300x300`;
  }
  
  console.log(`Processed Rakuten image URL: ${processedUrl}`);
  return processedUrl;
};

// Function to check if an image URL is likely to be a placeholder or invalid
const isLikelyPlaceholder = (url: string): boolean => {
  // Check for common placeholder patterns
  const placeholderPatterns = [
    /\/\?/,                   // URLs with query parameters often used in placeholders
    /blank/i,                 // "blank" in the URL
    /placeholder/i,           // "placeholder" in the URL
    /default/i,               // "default" in the URL
    /no[-_]?image/i,          // "no-image" or "noimage" in the URL
    /\?.*text=/i,             // URLs with text parameter (like placehold.co)
    /\/\?\d+$/,               // URLs ending with ?123 (common Amazon placeholder pattern)
    /\/images\/I\//i,         // Amazon placeholder image pattern
    /\/images\/G\//i,         // Another Amazon placeholder image pattern
    /\/images\/S\//i,         // Another Amazon placeholder image pattern
    /\/images\/P\//i,         // Another Amazon placeholder image pattern
    /\/images\/Q\//i,         // Another Amazon placeholder image pattern
    /\/images\/A\//i,         // Another Amazon placeholder image pattern
    /\/images\/M\//i,         // Another Amazon placeholder image pattern
    /\/images\/T\//i,         // Another Amazon placeholder image pattern
    /\/images\/U\//i,         // Another Amazon placeholder image pattern
    /\/images\/V\//i,         // Another Amazon placeholder image pattern
    /\/images\/W\//i,         // Another Amazon placeholder image pattern
    /\/images\/X\//i,         // Another Amazon placeholder image pattern
    /\/images\/Y\//i,         // Another Amazon placeholder image pattern
    /\/images\/Z\//i,         // Another Amazon placeholder image pattern
    /\/images\/\?/i,          // Another Amazon placeholder image pattern
    /\/images\/\*/i,          // Another Amazon placeholder image pattern
    /\/images\/\+/i,          // Another Amazon placeholder image pattern
    /\/images\/\-/i,          // Another Amazon placeholder image pattern
    /\/images\/\=/i,          // Another Amazon placeholder image pattern
    /\/images\/\//i,          // Another Amazon placeholder image pattern
    /\/images\/\\/i,          // Another Amazon placeholder image pattern
    /\/images\/\./i,          // Another Amazon placeholder image pattern
    /\/images\/\,/i,          // Another Amazon placeholder image pattern
    /\/images\/\;/i,          // Another Amazon placeholder image pattern
    /\/images\/\:/i,          // Another Amazon placeholder image pattern
    /\/images\/\'/i,          // Another Amazon placeholder image pattern
    /\/images\/\"/i,          // Another Amazon placeholder image pattern
    /\/images\/\(/i,          // Another Amazon placeholder image pattern
    /\/images\/\)/i,          // Another Amazon placeholder image pattern
    /\/images\/\[/i,          // Another Amazon placeholder image pattern
    /\/images\/\]/i,          // Another Amazon placeholder image pattern
    /\/images\/\{/i,          // Another Amazon placeholder image pattern
    /\/images\/\}/i,          // Another Amazon placeholder image pattern
    /\/images\/\|/i,          // Another Amazon placeholder image pattern
    /\/images\/\\/i,          // Another Amazon placeholder image pattern
    /\/images\/\^/i,          // Another Amazon placeholder image pattern
    /\/images\/\$/i,          // Another Amazon placeholder image pattern
    /\/images\/\#/i,          // Another Amazon placeholder image pattern
    /\/images\/\@/i,          // Another Amazon placeholder image pattern
    /\/images\/\!/i,          // Another Amazon placeholder image pattern
    /\/images\/\~/i,          // Another Amazon placeholder image pattern
    /\/images\/\`/i,          // Another Amazon placeholder image pattern
    /\/images\/\%/i,          // Another Amazon placeholder image pattern
    /\/images\/\&/i,          // Another Amazon placeholder image pattern
    /\/images\/\*/i,          // Another Amazon placeholder image pattern
    /\/images\/\?/i,          // Another Amazon placeholder image pattern
    /\/images\/\+/i,          // Another Amazon placeholder image pattern
    /\/images\/\-/i,          // Another Amazon placeholder image pattern
    /\/images\/\=/i,          // Another Amazon placeholder image pattern
    /\/images\/\//i,          // Another Amazon placeholder image pattern
    /\/images\/\\/i,          // Another Amazon placeholder image pattern
    /\/images\/\./i,          // Another Amazon placeholder image pattern
    /\/images\/\,/i,          // Another Amazon placeholder image pattern
    /\/images\/\;/i,          // Another Amazon placeholder image pattern
    /\/images\/\:/i,          // Another Amazon placeholder image pattern
    /\/images\/\'/i,          // Another Amazon placeholder image pattern
    /\/images\/\"/i,          // Another Amazon placeholder image pattern
    /\/images\/\(/i,          // Another Amazon placeholder image pattern
    /\/images\/\)/i,          // Another Amazon placeholder image pattern
    /\/images\/\[/i,          // Another Amazon placeholder image pattern
    /\/images\/\]/i,          // Another Amazon placeholder image pattern
    /\/images\/\{/i,          // Another Amazon placeholder image pattern
    /\/images\/\}/i,          // Another Amazon placeholder image pattern
    /\/images\/\|/i,          // Another Amazon placeholder image pattern
    /\/images\/\\/i,          // Another Amazon placeholder image pattern
    /\/images\/\^/i,          // Another Amazon placeholder image pattern
    /\/images\/\$/i,          // Another Amazon placeholder image pattern
    /\/images\/\#/i,          // Another Amazon placeholder image pattern
    /\/images\/\@/i,          // Another Amazon placeholder image pattern
    /\/images\/\!/i,          // Another Amazon placeholder image pattern
    /\/images\/\~/i,          // Another Amazon placeholder image pattern
    /\/images\/\`/i,          // Another Amazon placeholder image pattern
    /\/images\/\%/i,          // Another Amazon placeholder image pattern
    /\/images\/\&/i,          // Another Amazon placeholder image pattern
  ];
  
  return placeholderPatterns.some(pattern => pattern.test(url));
};

interface ImageSearchResultsProps {
  result: ImageSearchResult;
}

export default function ImageSearchResults({ result }: ImageSearchResultsProps) {
  console.log("Raw search result data:", result);
  
  const [imageErrors, setImageErrors] = useState<{[key: string]: boolean}>({});
  const [currentPage, setCurrentPage] = useState(1);
  
  const handleImageError = (id: string) => {
    setImageErrors(prev => ({...prev, [id]: true}));
  };

  // Get a better product image URL or fallback
  const getProductImageUrl = (imageUrl: string | undefined, storeName: string | undefined): string => {
    // If no image URL is provided, return fallback
    if (!imageUrl) return FALLBACK_IMAGE;
    
    // For Amazon products, use the image URL directly if it's from Amazon
    if (storeName?.toLowerCase().includes('amazon')) {
      // If it's an Amazon URL, use it directly
      if (imageUrl.includes('amazon') || 
          imageUrl.includes('media-amazon') || 
          imageUrl.includes('ssl-images-amazon')) {
        return imageUrl;
      }
    }
    
    // Check if the URL is likely a placeholder
    if (isLikelyPlaceholder(imageUrl)) {
      // For Amazon products, use a better placeholder
      if (storeName?.toLowerCase().includes('amazon')) {
        return 'https://placehold.co/300x300/f5f5f5/232F3E?text=Amazon+Product';
      }
      // For Rakuten products
      if (storeName?.toLowerCase().includes('rakuten') || storeName?.toLowerCase().includes('楽天')) {
        return 'https://placehold.co/300x300/f5f5f5/BF0000?text=Rakuten+Product';
      }
      // For Yahoo products
      if (storeName?.toLowerCase().includes('yahoo') || storeName?.toLowerCase().includes('ヤフー')) {
        return 'https://placehold.co/300x300/f5f5f5/6001D2?text=Yahoo+Product';
      }
      // Generic fallback
      return FALLBACK_IMAGE;
    }
    
    // Return the original URL if it seems valid
    return imageUrl;
  };

  // Safe formatter for prices
  const formatPrice = (price: number | null | undefined) => {
    return price ? price.toLocaleString() : '0';
  };

  // Check if we have any price comparison results
  const hasPriceComparison = result.price_comparison && result.price_comparison.length > 0;
  
  // Check if we have any detailed products
  const hasDetailedProducts = result.detailed_products && result.detailed_products.length > 0;
  
  // Calculate pagination
  const totalProducts = hasDetailedProducts ? result.detailed_products.length : 0;
  const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);
  
  // Get current page products
  const getCurrentPageProducts = () => {
    if (!hasDetailedProducts) return [];
    
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;
    return result.detailed_products.slice(startIndex, endIndex);
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

  // Check if we have any product data
  const hasProducts = (
    (result.detailed_products && result.detailed_products.length > 0) || 
    (result.price_comparison && result.price_comparison.length > 0)
  );
  console.log("Has products:", hasProducts);

  // If no results at all, show a message
  if (!hasPriceComparison && !hasDetailedProducts) {
    return (
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="text.secondary">
          {NO_RESULTS_JP}
        </Typography>
      </Box>
    );
  }

  const getStoreIcon = (name: string) => {
    const lowerStoreName = name?.toLowerCase() || '';
    if (lowerStoreName.includes('amazon')) return 'Amazon';
    if (lowerStoreName.includes('rakuten')) return 'Rakuten';
    if (lowerStoreName.includes('yahoo')) return 'Yahoo';
    return 'Shop';
  };

  const getStoreColor = (storeName: string, isHover: boolean = false): string => {
    const lowerStoreName = (storeName || '').toLowerCase();
    
    if (lowerStoreName.includes('amazon')) {
      return isHover ? '#e68a00' : '#FF9900';
    } else if (lowerStoreName.includes('rakuten') || lowerStoreName.includes('楽天')) {
      return isHover ? '#a00000' : '#BF0000';
    } else if (lowerStoreName.includes('yahoo') || lowerStoreName.includes('ヤフー')) {
      return isHover ? '#5001b2' : '#6001D2';
    }
    
    return isHover ? '#1565c0' : '#1976d2'; // Default MUI blue
  };
  
  // Group products by source
  const groupedProducts = useMemo(() => {
    if (!result.detailed_products || result.detailed_products.length === 0) {
      return { amazon: [], rakuten: [], yahoo: [], other: [] };
    }
    
    const grouped = {
      amazon: [] as ExtendedProductInfo[],
      rakuten: [] as ExtendedProductInfo[],
      yahoo: [] as ExtendedProductInfo[],
      other: [] as ExtendedProductInfo[]
    };
    
    console.log("Detailed products:", result.detailed_products);
    
    result.detailed_products.forEach(product => {
      // Cast to ExtendedProductInfo to access additional properties
      const extendedProduct = product as ExtendedProductInfo;
      
      // First check the source field which is more reliable
      if (extendedProduct.source) {
        const source = extendedProduct.source.toLowerCase();
        
        if (source === 'amazon') {
          grouped.amazon.push(extendedProduct);
          return;
        } else if (source === 'rakuten') {
          grouped.rakuten.push(extendedProduct);
          return;
        } else if (source === 'yahoo') {
          grouped.yahoo.push(extendedProduct);
          return;
        }
      }
      
      // If source is not available, try to determine from store or URL
      if (!extendedProduct.store) {
        // If store is undefined, try to determine from the URL
        if (extendedProduct.url && extendedProduct.url.includes('amazon')) {
          extendedProduct.store = 'Amazon';
        } else if (extendedProduct.url && extendedProduct.url.includes('rakuten')) {
          extendedProduct.store = 'Rakuten';
        } else if (extendedProduct.url && extendedProduct.url.includes('yahoo')) {
          extendedProduct.store = 'Yahoo';
        }
      }
      
      // Get the store name and convert to lowercase for comparison
      const storeIconName = getStoreIcon(extendedProduct.store || '');
      const storeName = storeIconName.toLowerCase();
      
      if (storeName === 'amazon') {
        grouped.amazon.push(extendedProduct);
      } else if (storeName === 'rakuten') {
        grouped.rakuten.push(extendedProduct);
      } else if (storeName === 'yahoo') {
        grouped.yahoo.push(extendedProduct);
      } else {
        grouped.other.push(extendedProduct);
      }
    });
    
    return grouped;
  }, [result.detailed_products]);

  // Get the best product from each store
  const bestAmazonProduct = useMemo(() => {
    const product = groupedProducts.amazon[0];
    console.log("Best Amazon product:", product);
    return product;
  }, [groupedProducts]);
  
  const bestRakutenProduct = useMemo(() => {
    const product = groupedProducts.rakuten[0];
    console.log("Best Rakuten product:", product);
    return product;
  }, [groupedProducts]);
  
  const bestYahooProduct = useMemo(() => {
    const product = groupedProducts.yahoo[0];
    console.log("Best Yahoo product:", product);
    return product;
  }, [groupedProducts]);

  return (
    <Box sx={{ mt: 4 }}>
      {/* Debug information - only visible in development */}
      
      {/* Display message if provided */}
      {result.message && (
        <Box sx={{ mb: 3, p: 2, bgcolor: '#FFF9C4', borderRadius: 1 }}>
          <Typography variant="body1" color="text.secondary">
            {result.message}
          </Typography>
        </Box>
      )}
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          検索画像
        </Typography>
        {result.query_image && (
          <Box 
            component="img" 
            src={result.query_image.startsWith('/api/uploads/') 
              ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${result.query_image}` 
              : result.query_image}
            alt="検索画像"
            sx={{ 
              width: 300,
              height: 300,
              objectFit: 'contain',
              border: '1px solid #eee',
              borderRadius: 1,
              mb: 2
            }}
            onError={(e) => {
              // Hide the image if it fails to load
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
      </Box>

      {/* Display generic term if available */}
      {result.generic_term && (
        <Paper sx={{ p: 3, mt: 4, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            検出された商品カテゴリ
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip 
              label={result.generic_term}
              color="primary"
              variant="filled"
            />
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            画像からモデル番号を検出できなかったため、画像の内容を分析して検索しています。
          </Typography>
        </Paper>
      )}

      {result.model_numbers && result.model_numbers.length > 0 && (
        <Paper sx={{ p: 3, mt: 4, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            検出されたモデル番号
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {result.model_numbers?.map((model: ModelNumber, index: number) => (
              <Chip 
                key={index}
                label={`${model.model_number} (信頼度: ${Math.round(model.confidence * 100)}%)`}
                color="primary"
                variant={index === 0 ? "filled" : "outlined"}
              />
            ))}
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            最も信頼度の高いモデル番号を使用して商品を検索しています。
          </Typography>
        </Paper>
      )}
      
      {hasPriceComparison && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            価格比較
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            ※ 商品ページリンクは各ECサイトの検索結果ページに移動します。実際の商品情報と異なる場合があります。
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ショップ</TableCell>
                  <TableCell>商品名</TableCell>
                  <TableCell>価格</TableCell>
                  <TableCell>画像</TableCell>
                  <TableCell>リンク</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.price_comparison.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStoreIcon(item.store)}
                        <Typography variant="body2" fontWeight="medium">
                          {item.store || UNKNOWN_STORE_JP}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={item.title || NO_TITLE_JP} placement="top">
                        <Typography noWrap sx={{ maxWidth: 200 }}>
                          {item.title || NO_TITLE_JP}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {item.image_url ? (
                        <Box
                          component="img"
                          src={imageErrors[`price-${index}`] ? 
                            getProductImageUrl(item.image_url, item.store) : 
                            (isLikelyPlaceholder(item.image_url) ? 
                              getProductImageUrl(item.image_url, item.store) : 
                              item.image_url)
                          }
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
                          src={getProductImageUrl(undefined, item.store)}
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
                    <TableCell>
                      <Button
                        component="a"
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="outlined"
                        size="small"
                        startIcon={<FaExternalLinkAlt />}
                      >
                        商品ページ
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* EC Site Comparison Section */}
      {hasProducts && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <MdCompareArrows size={24} />
            EC サイト比較
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
                  <Typography variant="h6">Amazon</Typography>
                </Box>
                <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  {bestAmazonProduct ? (
                    <>
                      <Box sx={{ textAlign: 'center', mb: 2 }}>
                        {bestAmazonProduct.image_url ? (
                          <SimpleAmazonImage 
                            imageUrl={bestAmazonProduct.image_url}
                            title={bestAmazonProduct.title}
                            height={200}
                          />
                        ) : (
                          <Box 
                            sx={{ 
                              width: '100%', 
                              height: 150, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              bgcolor: '#f5f5f5',
                              mb: 1
                            }}
                          >
                            <FaAmazon size={48} color="#FF9900" />
                          </Box>
                        )}
                        {bestAmazonProduct.title && (
                          <Typography variant="h6" gutterBottom>
                            {bestAmazonProduct.title}
                          </Typography>
                        )}
                      </Box>
                      
                      {bestAmazonProduct.price !== undefined && bestAmazonProduct.price > 0 ? (
                        <Typography variant="h5" color="error" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                          {formatPrice(bestAmazonProduct.price)}円
                          {bestAmazonProduct.shipping_fee ? ` + 送料${formatPrice(bestAmazonProduct.shipping_fee)}円` : ''}
                        </Typography>
                      ) : (
                        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
                          価格情報なし
                        </Typography>
                      )}
                      
                      {bestAmazonProduct.url && (
                        <Button 
                          variant="contained" 
                          color="primary" 
                          fullWidth 
                          href={bestAmazonProduct.url} 
                          target="_blank"
                          sx={{ 
                            mt: 'auto',
                            bgcolor: '#FF9900',
                            '&:hover': {
                              bgcolor: '#e68a00',
                            }
                          }}
                          startIcon={<FaExternalLinkAlt />}
                        >
                          商品ページ
                        </Button>
                      )}
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body1">
                        商品が見つかりませんでした
                      </Typography>
                      <Button 
                        variant="outlined" 
                        color="primary"
                        href="https://www.amazon.co.jp/"
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ 
                          mt: 2,
                          color: '#FF9900',
                          borderColor: '#FF9900',
                          '&:hover': {
                            borderColor: '#e68a00',
                            bgcolor: 'rgba(255, 153, 0, 0.04)',
                          }
                        }}
                        startIcon={<FaExternalLinkAlt />}
                      >
                        Amazonで検索
                      </Button>
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
                  {bestRakutenProduct ? (
                    <>
                      <Box sx={{ textAlign: 'center', mb: 2 }}>
                        {bestRakutenProduct.image_url ? (
                          <SimpleRakutenImage 
                            imageUrl={bestRakutenProduct.image_url}
                            title={bestRakutenProduct.title}
                            height={200}
                          />
                        ) : (
                          <Box 
                            sx={{ 
                              width: '100%', 
                              height: 150, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              bgcolor: '#f5f5f5',
                              mb: 1
                            }}
                          >
                            <SiRakuten size={48} color="#BF0000" />
                          </Box>
                        )}
                        {bestRakutenProduct.title && (
                          <Typography variant="h6" gutterBottom>
                            {bestRakutenProduct.title}
                          </Typography>
                        )}
                      </Box>
                      
                      {bestRakutenProduct.price !== undefined && bestRakutenProduct.price > 0 ? (
                        <Typography variant="h5" color="error" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                          {formatPrice(bestRakutenProduct.price)}円
                          {bestRakutenProduct.shipping_fee ? ` + 送料${formatPrice(bestRakutenProduct.shipping_fee)}円` : ''}
                        </Typography>
                      ) : (
                        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
                          価格情報なし
                        </Typography>
                      )}
                      
                      {bestRakutenProduct.url && (
                        <Button 
                          variant="contained" 
                          color="primary" 
                          fullWidth 
                          href={bestRakutenProduct.url} 
                          target="_blank"
                          sx={{ 
                            mt: 'auto',
                            bgcolor: '#BF0000',
                            '&:hover': {
                              bgcolor: '#a00000',
                            }
                          }}
                          startIcon={<FaExternalLinkAlt />}
                        >
                          商品ページ
                        </Button>
                      )}
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body1">
                        商品が見つかりませんでした
                      </Typography>
                      <Button 
                        variant="outlined" 
                        color="primary" 
                        href="https://www.rakuten.co.jp/" 
                        target="_blank"
                        sx={{ 
                          mt: 2,
                          color: '#BF0000',
                          borderColor: '#BF0000',
                          '&:hover': {
                            borderColor: '#a00000',
                            bgcolor: 'rgba(191, 0, 0, 0.04)',
                          }
                        }}
                        startIcon={<FaExternalLinkAlt />}
                      >
                        楽天市場で検索
                      </Button>
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
                  {bestYahooProduct ? (
                    <>
                      <Box sx={{ textAlign: 'center', mb: 2 }}>
                        {bestYahooProduct.image_url ? (
                          <Box 
                            component="img" 
                            src={bestYahooProduct.image_url} 
                            alt={bestYahooProduct.title || 'Yahoo商品'}
                            sx={{ 
                              maxWidth: '100%', 
                              maxHeight: 200, 
                              objectFit: 'contain',
                              mb: 1
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                            }}
                          />
                        ) : (
                          <Box 
                            sx={{ 
                              width: '100%', 
                              height: 150, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              bgcolor: '#f5f5f5',
                              mb: 1
                            }}
                          >
                            <SiYahoo size={48} color="#6001D2" />
                          </Box>
                        )}
                        {bestYahooProduct.title && (
                          <Typography variant="h6" gutterBottom>
                            {bestYahooProduct.title}
                          </Typography>
                        )}
                      </Box>
                      
                      {bestYahooProduct.price !== undefined && bestYahooProduct.price > 0 ? (
                        <Typography variant="h5" color="error" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                          {formatPrice(bestYahooProduct.price)}円
                          {bestYahooProduct.shipping_fee ? ` + 送料${formatPrice(bestYahooProduct.shipping_fee)}円` : ''}
                        </Typography>
                      ) : (
                        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
                          価格情報なし
                        </Typography>
                      )}
                      
                      {bestYahooProduct.url && (
                        <Button 
                          variant="contained" 
                          color="primary" 
                          fullWidth 
                          href={bestYahooProduct.url} 
                          target="_blank"
                          sx={{ 
                            mt: 'auto',
                            bgcolor: '#6001D2',
                            '&:hover': {
                              bgcolor: '#5001b2',
                            }
                          }}
                          startIcon={<FaExternalLinkAlt />}
                        >
                          商品ページ
                        </Button>
                      )}
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body1">
                        商品が見つかりませんでした
                      </Typography>
                      <Button 
                        variant="outlined" 
                        color="primary" 
                        href="https://shopping.yahoo.co.jp/" 
                        target="_blank"
                        sx={{ 
                          mt: 2,
                          color: '#6001D2',
                          borderColor: '#6001D2',
                          '&:hover': {
                            borderColor: '#5001b2',
                            bgcolor: 'rgba(96, 1, 210, 0.04)',
                          }
                        }}
                        startIcon={<FaExternalLinkAlt />}
                      >
                        Yahoo!ショッピングで検索
                      </Button>
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