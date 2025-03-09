import { useState } from 'react';
import { ImageSearchResult, ModelNumber } from '@/types';
import { FaExternalLinkAlt, FaStar, FaAmazon } from 'react-icons/fa';
import { SiRakuten, SiYahoo } from 'react-icons/si';
import { 
  Grid, Typography, Card, CardContent, CardMedia, Box, Chip, Divider, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
  Button, Pagination, Stack, Tooltip 
} from '@mui/material';

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

  const getStoreIcon = (storeName: string) => {
    const lowerStoreName = (storeName || '').toLowerCase();
    
    if (lowerStoreName.includes('amazon')) {
      return <FaAmazon size={24} color="#FF9900" />;
    } else if (lowerStoreName.includes('rakuten') || lowerStoreName.includes('楽天')) {
      return <SiRakuten size={24} color="#BF0000" />;
    } else if (lowerStoreName.includes('yahoo') || lowerStoreName.includes('ヤフー')) {
      return <SiYahoo size={24} color="#6001D2" />;
    } else if (lowerStoreName.includes('kakaku') || lowerStoreName.includes('価格')) {
      // Custom text for Kakaku.com
      return <Box sx={{ fontWeight: 'bold', color: '#0095E5' }}>価格.com</Box>;
    }
    
    return null;
  };

  return (
    <Box sx={{ mt: 4 }}>
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
              maxWidth: '100%', 
              maxHeight: 300, 
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
                      <Typography variant="body1" fontWeight="bold" color="primary">
                        {formatPrice(item.price)}円
                      </Typography>
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

      {hasDetailedProducts && (
        <Box id="detailed-products">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">
              詳細情報
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {totalProducts}件中 {(currentPage - 1) * PRODUCTS_PER_PAGE + 1}-{Math.min(currentPage * PRODUCTS_PER_PAGE, totalProducts)}件を表示
            </Typography>
          </Box>
          
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {getCurrentPageProducts().map((product, index) => {
              // Check if this is an Amazon product
              const isAmazonProduct = (product.source || product.store || '').toLowerCase().includes('amazon');
              const productId = `detail-${index + (currentPage - 1) * PRODUCTS_PER_PAGE}`;
              const hasImageError = imageErrors[productId];
              
              // Determine the image URL to use
              let displayImageUrl = product.image_url || FALLBACK_IMAGE;
              
              // For Amazon products, use the image URL directly
              if (isAmazonProduct && product.image_url) {
                displayImageUrl = product.image_url;
              } 
              // For non-Amazon products or if there's an error
              else if (hasImageError || isLikelyPlaceholder(displayImageUrl)) {
                displayImageUrl = getProductImageUrl(product.image_url, product.store);
              }
              
              return (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardMedia
                      component="img"
                      height="200"
                      image={displayImageUrl}
                      alt={product.title || '商品'}
                      onError={() => handleImageError(productId)}
                      sx={{ objectFit: 'contain', p: 2 }}
                    />
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="div" gutterBottom noWrap>
                        {product.title || NO_TITLE_JP}
                      </Typography>
                      <Typography variant="h5" color="primary" gutterBottom>
                        ¥{formatPrice(product.price)}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                          {product.store || product.shop || UNKNOWN_STORE_JP}
                        </Typography>
                      </Box>
                      
                      {(product as any).shipping_fee !== undefined && (
                        <Typography variant="body2" color="text.secondary">
                          送料: {(product as any).shipping_fee === 0 ? '無料' : `${formatPrice((product as any).shipping_fee)}円`}
                        </Typography>
                      )}
                      
                      <Box sx={{ mt: 2 }}>
                        <Button
                          component="a"
                          href={product.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="contained"
                          fullWidth
                          startIcon={<FaExternalLinkAlt />}
                        >
                          商品ページへ
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
          
          {totalPages > 1 && (
            <Stack spacing={2} sx={{ mb: 4 }}>
              <Pagination 
                count={totalPages} 
                page={currentPage} 
                onChange={handlePageChange} 
                color="primary" 
                size="large"
                sx={{ 
                  display: 'flex',
                  justifyContent: 'center'
                }}
              />
            </Stack>
          )}
        </Box>
      )}
    </Box>
  );
} 