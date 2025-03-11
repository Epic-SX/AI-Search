import { useState, useMemo } from 'react';
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
// Number of products per source to display in the comparison view
const PRODUCTS_PER_SOURCE = 5;

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

  const getStoreName = (name: string) => {
    const lowerStoreName = name?.toLowerCase() || '';
    if (lowerStoreName.includes('amazon')) {
      return 'Amazon';
    } else if (lowerStoreName.includes('rakuten')) {
      return 'Rakuten';
    } else if (lowerStoreName.includes('yahoo')) {
      return 'Yahoo!';
    } else {
      return name || UNKNOWN_STORE_JP;
    }
  };

  const getStoreIcon = (name: string) => {
    const lowerStoreName = name?.toLowerCase() || '';
    if (lowerStoreName.includes('amazon')) return 'Amazon';
    if (lowerStoreName.includes('rakuten')) return 'Rakuten';
    if (lowerStoreName.includes('yahoo')) return 'Yahoo';
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
    
    // Process each product from detailed_products
    results.detailed_products.forEach(product => {
      // Normalize the store name to ensure consistent grouping
      const normalizedStoreName = getStoreName(product.store || '');
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

  // Group products by source
  const groupedProducts = useMemo(() => {
    if (!results.detailed_products) return { amazon: [], rakuten: [], yahoo: [], other: [] };
    
    const grouped = {
      amazon: [] as ProductInfo[],
      rakuten: [] as ProductInfo[],
      yahoo: [] as ProductInfo[],
      other: [] as ProductInfo[]
    };
    
    results.detailed_products.forEach(product => {
      const storeName = getStoreIcon(product.store || '').toLowerCase();
      if (storeName === 'amazon') {
        grouped.amazon.push(product);
      } else if (storeName === 'rakuten') {
        grouped.rakuten.push(product);
      } else if (storeName === 'yahoo') {
        grouped.yahoo.push(product);
      } else {
        grouped.other.push(product);
      }
    });
    
    // Sort each group by price
    Object.keys(grouped).forEach(key => {
      grouped[key as keyof typeof grouped].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    });
    
    return grouped;
  }, [results.detailed_products]);

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
                        {getStoreIcon(item.store || '') === 'Amazon' && <FaAmazon size={24} color="#FF9900" />}
                        {getStoreIcon(item.store || '') === 'Rakuten' && <SiRakuten size={24} color="#BF0000" />}
                        {getStoreIcon(item.store || '') === 'Yahoo' && <SiYahoo size={24} color="#6001D2" />}
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

      {/* New Side-by-Side Comparison View */}
      {hasDetailedProducts && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            ECサイト別商品比較
          </Typography>
          <Grid container spacing={2}>
            {/* Amazon Column */}
            <Grid item xs={12} md={4}>
              <Box sx={{ 
                bgcolor: '#f8f8f8', 
                borderRadius: 2, 
                overflow: 'hidden',
                height: '100%'
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
                <Box sx={{ p: 2 }}>
                  {groupedProducts.amazon.length > 0 ? (
                    groupedProducts.amazon.slice(0, PRODUCTS_PER_SOURCE).map((product, index) => (
                      <Box key={index} sx={{ 
                        mb: 2, 
                        p: 2, 
                        bgcolor: 'white', 
                        borderRadius: 1,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        '&:last-child': { mb: 0 }
                      }}>
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
                              variant="body2" 
                              sx={{ 
                                mb: 1, 
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                lineHeight: 1.3,
                                height: '3.9em'
                              }}
                            >
                              {product.title || NO_TITLE_JP}
                            </Typography>
                            <Typography variant="h6" color="#FF9900" fontWeight="bold">
                              {formatPrice(product.price)}円
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            component="a"
                            href={product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="outlined"
                            size="small"
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
                        </Box>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                      商品が見つかりませんでした
                    </Typography>
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
                height: '100%'
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
                <Box sx={{ p: 2 }}>
                  {groupedProducts.rakuten.length > 0 ? (
                    groupedProducts.rakuten.slice(0, PRODUCTS_PER_SOURCE).map((product, index) => (
                      <Box key={index} sx={{ 
                        mb: 2, 
                        p: 2, 
                        bgcolor: 'white', 
                        borderRadius: 1,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        '&:last-child': { mb: 0 }
                      }}>
                        <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                          <Box
                            component="img"
                            src={imageErrors[`rakuten-${index}`] ? FALLBACK_IMAGE : (product.image_url || FALLBACK_IMAGE)}
                            alt={product.title || '商品画像'}
                            onError={() => handleImageError(`rakuten-${index}`)}
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
                              variant="body2" 
                              sx={{ 
                                mb: 1, 
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                lineHeight: 1.3,
                                height: '3.9em'
                              }}
                            >
                              {product.title || NO_TITLE_JP}
                            </Typography>
                            <Typography variant="h6" color="#BF0000" fontWeight="bold">
                              {formatPrice(product.price)}円
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            component="a"
                            href={product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="outlined"
                            size="small"
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
                        </Box>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                      商品が見つかりませんでした
                    </Typography>
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
                height: '100%'
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
                <Box sx={{ p: 2 }}>
                  {groupedProducts.yahoo.length > 0 ? (
                    groupedProducts.yahoo.slice(0, PRODUCTS_PER_SOURCE).map((product, index) => (
                      <Box key={index} sx={{ 
                        mb: 2, 
                        p: 2, 
                        bgcolor: 'white', 
                        borderRadius: 1,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        '&:last-child': { mb: 0 }
                      }}>
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
                              variant="body2" 
                              sx={{ 
                                mb: 1, 
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                lineHeight: 1.3,
                                height: '3.9em'
                              }}
                            >
                              {product.title || NO_TITLE_JP}
                            </Typography>
                            <Typography variant="h6" color="#6001D2" fontWeight="bold">
                              {formatPrice(product.price)}円
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            component="a"
                            href={product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="outlined"
                            size="small"
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
                        </Box>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                      商品が見つかりませんでした
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
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
                      <Typography 
                        variant="h6" 
                        component="h3" 
                        gutterBottom 
                        sx={{ 
                          maxWidth: '70%',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.3,
                          height: 'auto',
                          minHeight: '4em'
                        }}
                      >
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
                      {getStoreIcon(product.store || '') === 'Amazon' && <FaAmazon size={20} color="#FF9900" />}
                      {getStoreIcon(product.store || '') === 'Rakuten' && <SiRakuten size={20} color="#BF0000" />}
                      {getStoreIcon(product.store || '') === 'Yahoo' && <SiYahoo size={20} color="#6001D2" />}
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