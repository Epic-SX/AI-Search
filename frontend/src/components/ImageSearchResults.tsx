import { useState } from 'react';
import { ImageSearchResult } from '@/types';
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

interface ImageSearchResultsProps {
  result: ImageSearchResult;
}

export default function ImageSearchResults({ result }: ImageSearchResultsProps) {
  const [imageErrors, setImageErrors] = useState<{[key: string]: boolean}>({});
  const [currentPage, setCurrentPage] = useState(1);
  
  const handleImageError = (id: string) => {
    setImageErrors(prev => ({...prev, [id]: true}));
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
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          検索画像
        </Typography>
        {result.query_image && (
          <Box 
            component="img" 
            src={result.query_image}
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
            {getCurrentPageProducts().map((product, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardMedia
                    component="img"
                    height="200"
                    image={imageErrors[`detail-${index + (currentPage - 1) * PRODUCTS_PER_PAGE}`] ? FALLBACK_IMAGE : (product.image_url || FALLBACK_IMAGE)}
                    alt={product.title || '商品'}
                    onError={() => handleImageError(`detail-${index + (currentPage - 1) * PRODUCTS_PER_PAGE}`)}
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
            ))}
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