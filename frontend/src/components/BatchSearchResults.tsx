import React, { useState } from 'react';
import { Box, Typography, Divider, Tabs, Tab, Paper, Tooltip, Button } from '@mui/material';
import SearchResults from './SearchResults';
import { SearchResult } from '@/types';
import { FaDownload } from 'react-icons/fa';
import { downloadMultipleProductsAsCSV } from '@/utils/csvExport';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`search-tabpanel-${index}`}
      aria-labelledby={`search-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface BatchSearchResultsProps {
  results: SearchResult[];
  hasErrors?: boolean;
}

const BatchSearchResults: React.FC<BatchSearchResultsProps> = ({ results, hasErrors = false }) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
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

  // Function to render numbered circles without model numbers below
  const renderModelNumbers = () => {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        {results.map((result, index) => {
          const modelNumber = result.product_info || 
            (result.keywords && result.keywords.length > 0 ? result.keywords[0] : `検索 ${index + 1}`);
          
          return (
            <Tooltip 
              key={index}
              title={modelNumber}
              arrow
            >
              <Box 
                sx={{ 
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: 36,
                  height: 36,
                  bgcolor: activeTab === index ? 'primary.main' : 'grey.300',
                  color: activeTab === index ? 'white' : 'text.primary',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  transition: 'all 0.2s',
                  boxShadow: activeTab === index ? '0 2px 4px rgba(0,0,0,0.2)' : 'none',
                  '&:hover': {
                    bgcolor: activeTab === index ? 'primary.dark' : 'grey.400',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
                  }
                }}
                onClick={() => setActiveTab(index)}
              >
                {index + 1}
              </Box>
            </Tooltip>
          );
        })}
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
      
      {/* Display just numbered circles with tooltips for model numbers */}
      {renderModelNumbers()}
      
      {/* Tabs for selecting which result to view */}
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant={results.length > 6 ? "scrollable" : "fullWidth"}
          scrollButtons="auto"
          aria-label="search results tabs"
        >
          {results.map((result, index) => (
            <Tooltip 
              key={index} 
              title={getModelNumber(result, index)}
              arrow
            >
              <Tab 
                label={`${index + 1}`} 
                id={`search-tab-${index}`}
                aria-controls={`search-tabpanel-${index}`}
              />
            </Tooltip>
          ))}
        </Tabs>
      </Paper>
      
      {results.map((result, index) => (
        <TabPanel key={index} value={activeTab} index={index}>
          <Typography variant="h6" gutterBottom>
            検索キーワード: {getModelNumber(result, index)}
          </Typography>
          <SearchResults results={result} />
        </TabPanel>
      ))}
    </Box>
  );
};

export default BatchSearchResults; 