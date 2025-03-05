import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import SearchResults from './SearchResults';
import { SearchResult } from '@/types';

interface BatchSearchResultsProps {
  results: SearchResult[];
}

const BatchSearchResults: React.FC<BatchSearchResultsProps> = ({ results }) => {
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
      
      {results.map((result, index) => (
        <Box key={index} sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            検索キーワード: {result.product_info || (result.keywords && result.keywords.length > 0 ? result.keywords.join(', ') : "不明")}
          </Typography>
          <SearchResults results={result} />
          {index < results.length - 1 && <Divider sx={{ my: 3 }} />}
        </Box>
      ))}
    </Box>
  );
};

export default BatchSearchResults; 