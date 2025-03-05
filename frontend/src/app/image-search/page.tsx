'use client';

import { useState } from 'react';
import { Container, Typography, Box, CircularProgress } from '@mui/material';
import ImageSearchForm from '@/components/ImageSearchForm';
import ImageSearchResults from '@/components/ImageSearchResults';
import { ImageSearchResult } from '@/types';
import { toast } from 'react-toastify';

export default function ImageSearchPage() {
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<ImageSearchResult | null>(null);

  const handleSearch = async (formData: FormData) => {
    setLoading(true);
    
    try {
      const response = await fetch('/search/image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('画像検索に失敗しました');
      }
      
      const data = await response.json();
      setSearchResult(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('画像検索中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          画像検索
        </Typography>
        <Typography variant="body1" sx={{ mb: 4 }}>
          商品の画像をアップロードして、類似商品を見つけましょう。
        </Typography>
        
        <ImageSearchForm onSearch={handleSearch} />
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        )}
        
        {!loading && searchResult && <ImageSearchResults result={searchResult} />}
      </Box>
    </Container>
  );
} 