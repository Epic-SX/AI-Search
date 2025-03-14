import React, { useState } from 'react';
import { Box, Typography, Divider, Tabs, Tab, Paper } from '@mui/material';
import SearchResults from './SearchResults';
import { SearchResult } from '@/types';

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
}

const BatchSearchResults: React.FC<BatchSearchResultsProps> = ({ results }) => {
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

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        一括検索結果
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {results.length}件の検索結果があります
      </Typography>
      
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
            <Tab 
              key={index} 
              label={result.product_info || (result.keywords && result.keywords.length > 0 ? result.keywords[0] : `検索 ${index + 1}`)} 
              id={`search-tab-${index}`}
              aria-controls={`search-tabpanel-${index}`}
            />
          ))}
        </Tabs>
      </Paper>
      
      {results.map((result, index) => (
        <TabPanel key={index} value={activeTab} index={index}>
          <Typography variant="h6" gutterBottom>
            検索キーワード: {result.product_info || (result.keywords && result.keywords.length > 0 ? result.keywords.join(', ') : "不明")}
          </Typography>
          <SearchResults results={result} />
        </TabPanel>
      ))}
    </Box>
  );
};

export default BatchSearchResults; 