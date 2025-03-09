import { useState } from 'react';
import { SearchResult, ProductInfo } from '@/types';
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
// Number of products per page
const PRODUCTS_PER_PAGE = 6;

interface SearchResultsProps {
  results: SearchResult;
}

export default function SearchResults({ results }: SearchResultsProps) {
  const [imageErrors, setImageErrors] = useState<{[key: string]: boolean}>({});
  const [currentPage, setCurrentPage] = useState(1);
  
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

  const getStoreIcon = (storeName: string | undefined) => {
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

  // Helper function to normalize store names
  const normalizeStoreName = (storeName: string | undefined): string => {
    const name = (storeName || '').toLowerCase();
    if (name.includes('amazon')) return 'Amazon';
    if (name.includes('rakuten') || name.includes('楽天')) return 'Rakuten';
    if (name.includes('yahoo') || name.includes('ヤフー')) return 'Yahoo';
    if (name.includes('kakaku') || name.includes('価格')) return 'Kakaku';
    return storeName || UNKNOWN_STORE_JP;
  };

  const getBestPricesByStore = () => {
    if (!results.detailed_products) return [];

    // Create a map to store the cheapest product for each store
    const cheapestByStore = new Map<string, ProductInfo>();
    
    // Process each product from detailed_products
    results.detailed_products.forEach(product => {
      // Normalize the store name to ensure consistent grouping
      const normalizedStoreName = normalizeStoreName(product.store);
      const currentCheapest = cheapestByStore.get(normalizedStoreName);
      
      // Skip products with no price
      if (product.price === null || product.price === undefined) {
        return;
      }
      
      // If we don't have a product for this store yet, or if this product is cheaper
      if (!currentCheapest || product.price < currentCheapest.price!) {
        cheapestByStore.set(normalizedStoreName, product);
      }
    });
    
    // Convert map values to array and sort by price
    const bestPrices = Array.from(cheapestByStore.values())
      .filter(product => product.price !== null && product.price !== undefined)
      .sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    
    return bestPrices;
  };

  const bestPrices = getBestPricesByStore();

  return (
    <Box sx={{ mt: 4 }}>
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
      </Box>

      {results.detailed_products && results.detailed_products.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            価格比較
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            ※ 詳細情報から各ECサイトの最安値商品を表示しています。
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
                {bestPrices.map((item, index) => (
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
                    image={imageErrors[`product-${index}`] ? FALLBACK_IMAGE : (product.image_url || FALLBACK_IMAGE)}
                    alt={product.title || '商品画像'}
                    onError={() => handleImageError(`product-${index}`)}
                    sx={{ objectFit: 'contain', p: 2 }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" component="h3" gutterBottom noWrap sx={{ maxWidth: '70%' }}>
                        {product.title || NO_TITLE_JP}
                      </Typography>
                      {product.rating && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <FaStar color="#FFB900" />
                          <Typography variant="body2" sx={{ ml: 0.5 }}>
                            {product.rating}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {getStoreIcon(product.store)}
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        {product.store || UNKNOWN_STORE_JP}
                      </Typography>
                    </Box>
                    
                    <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                      {formatPrice(product.price)}円
                    </Typography>
                    
                    {product.features && product.features.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          商品特徴:
                        </Typography>
                        <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0' }}>
                          {product.features.slice(0, 3).map((feature, idx) => (
                            <li key={idx}>
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                {feature}
                              </Typography>
                            </li>
                          ))}
                        </ul>
                      </Box>
                    )}
                    
                    <Button
                      component="a"
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="contained"
                      fullWidth
                      startIcon={<FaExternalLinkAlt />}
                      sx={{ mt: 'auto' }}
                    >
                      商品ページ
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 4 }}>
              <Pagination 
                count={totalPages} 
                page={currentPage} 
                onChange={handlePageChange} 
                color="primary" 
                showFirstButton 
                showLastButton
              />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
} 