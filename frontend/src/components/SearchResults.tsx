import { useState, useMemo } from 'react';
import { SearchResult, ProductInfo } from '@/types';
import { FaExternalLinkAlt, FaStar, FaAmazon } from 'react-icons/fa';
import { SiRakuten, SiYahoo } from 'react-icons/si';
import { 
  Grid, Typography, Card, CardContent, CardMedia, Box, Chip, Divider, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
  Button, Pagination, Stack, Tooltip, Rating 
} from '@mui/material';
import SimpleRakutenImage from './SimpleRakutenImage';

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
        if (source === 'amazon') {
          grouped.amazon.push(product);
          return;
        } else if (source === 'rakuten') {
          grouped.rakuten.push(product);
          return;
        } else if (source === 'yahoo') {
          grouped.yahoo.push(product);
          return;
        }
      }
      
      // If source is not available, try to determine from store or URL
      if (!product.store) {
        // If store is undefined, try to determine from the URL
        if (product.url && product.url.includes('amazon')) {
          product.store = 'Amazon';
        } else if (product.url && product.url.includes('rakuten')) {
          product.store = 'Rakuten';
        } else if (product.url && product.url.includes('yahoo')) {
          product.store = 'Yahoo';
        }
      }
      
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
                          <SimpleRakutenImage
                            imageUrl={product.image_url || ''}
                            title={product.title}
                            height={80}
                            width={80}
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