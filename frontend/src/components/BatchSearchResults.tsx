import React, { useState } from 'react';
import { Box, Typography, Paper, Tooltip, Button, Pagination, PaginationItem, Grid } from '@mui/material';
import SearchResults from './SearchResults';
import { SearchResult } from '@/types';
import { FaDownload } from 'react-icons/fa';
import { downloadMultipleProductsAsCSV } from '@/utils/csvExport';

interface BatchSearchResultsProps {
  results: SearchResult[];
  hasErrors?: boolean;
}

const BatchSearchResults: React.FC<BatchSearchResultsProps> = ({ results, hasErrors = false }) => {
  const [currentPage, setCurrentPage] = useState(1);

  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
    // Scroll to the top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!results || results.length === 0) {
    return (
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          一括検索結果
        </Typography>
        <Typography variant="body1">
          検索結果がありません
        </Typography>
      </Box>
    );
  }

  // Function to render numbered pagination
  const renderPagination = () => {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <Pagination
          count={results.length}
          page={currentPage}
          onChange={handlePageChange}
          color="primary"
          size="large"
          showFirstButton
          showLastButton
          renderItem={(item) => (
            <PaginationItem
              {...item}
              sx={{
                bgcolor: item.selected ? 'primary.main' : 'grey.200',
                color: item.selected ? 'white' : 'text.primary',
                fontWeight: 'bold',
                width: 40,
                height: 40,
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                '&:hover': {
                  bgcolor: item.selected ? 'primary.dark' : 'grey.300',
                }
              }}
            />
          )}
        />
      </Box>
    );
  };

  const getModelNumber = (result: SearchResult, index: number) => {
    return result.product_info || 
      (result.keywords && result.keywords.length > 0 ? result.keywords[0] : `検索 ${index + 1}`);
  };

  const handleDownloadAll = () => {
    const allProducts = extractAllProducts(results);
    
    if (allProducts.length === 0) {
      alert('ダウンロードするデータがありません。');
      return;
    }
    
    // Create a function that returns store name (for compatibility with downloadMultipleProductsAsCSV)
    const getDisplayStoreName = (product: any) => {
      if (product.source === 'amazon') return 'Amazon';
      if (product.source === 'rakuten') return '楽天市場';
      if (product.source === 'yahoo') return 'Yahoo!ショッピング';
      return product.store || '不明なストア';
    };
    
    // Download all products as CSV
    downloadMultipleProductsAsCSV(allProducts, getDisplayStoreName);
  };

  // Extract all product info from all search results
  const extractAllProducts = (results: SearchResult[]) => {
    const allProducts = [];
    
    for (const result of results) {
      if (result.detailed_products && result.detailed_products.length > 0) {
        for (const product of result.detailed_products) {
          // Add the search term as a property so we know which search it came from
          allProducts.push({
            ...product,
            search_term: result.product_info || (result.keywords && result.keywords.length > 0 ? result.keywords[0] : '')
          });
        }
      }
    }
    
    return allProducts;
  };

  // Get the current result based on the current page
  const currentResult = results[currentPage - 1];
  const currentModelNumber = getModelNumber(currentResult, currentPage - 1);

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">
          一括検索結果
        </Typography>
        
        {/* Download All Results button */}
        <Button
          variant="contained"
          color="primary"
          startIcon={<FaDownload />}
          onClick={handleDownloadAll}
          sx={{ ml: 2 }}
        >
          全結果をダウンロード ({results.length}件)
        </Button>
      </Box>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {results.length}件の検索結果があります{hasErrors ? ' (一部のデータに取得エラーが発生しました)' : ''}
      </Typography>
      
      {/* Display pagination at the top */}
      {renderPagination()}
      
      {/* Display current search result in a grid layout */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          {/* Search keyword list on the left */}
          <Paper sx={{ p: 2, bgcolor: '#f5f5f5', height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ borderBottom: '2px solid #1976d2', pb: 1 }}>
              検索商品一覧
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', mt: 2 }}>
              {results.map((result, index) => {
                const modelNumber = getModelNumber(result, index);
                const isActive = currentPage === index + 1;
                
                return (
                  <Box 
                    key={index}
                    onClick={() => setCurrentPage(index + 1)}
                    sx={{ 
                      p: 1.5, 
                      mb: 1, 
                      borderRadius: 1,
                      cursor: 'pointer',
                      bgcolor: isActive ? '#1976d2' : 'transparent',
                      color: isActive ? 'white' : 'inherit',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      '&:hover': {
                        bgcolor: isActive ? '#1976d2' : 'rgba(25, 118, 210, 0.1)',
                      }
                    }}
                  >
                    <Box 
                      sx={{ 
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: isActive ? 'white' : '#1976d2',
                        color: isActive ? '#1976d2' : 'white',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontWeight: 'bold',
                        fontSize: '0.8rem',
                        mr: 1.5
                      }}
                    >
                      {index + 1}
                    </Box>
                    <Typography 
                      variant="body2" 
                      noWrap 
                      sx={{ 
                        fontWeight: isActive ? 'bold' : 'medium',
                        maxWidth: '80%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {modelNumber}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={9}>
          {/* Main content - search results */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              検索キーワード: {currentModelNumber} ({currentPage} / {results.length})
            </Typography>
            <SearchResults results={currentResult} />
          </Paper>
        </Grid>
      </Grid>
      
      {/* Display pagination at the bottom too for convenience */}
      {renderPagination()}
    </Box>
  );
};

export default BatchSearchResults; 