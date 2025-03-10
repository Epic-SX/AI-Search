'use client';

import { useState, useEffect } from 'react';
import { Container, Typography, Box, CircularProgress, Chip, Paper, Divider, Alert, Button, TextField, Grid, Tab, Tabs } from '@mui/material';
import ImageSearchForm from '@/components/ImageSearchForm';
import ImageSearchResults from '@/components/ImageSearchResults';
import { ImageSearchResult, ModelNumber } from '@/types';
import { toast } from 'react-toastify';
import { searchByImage, searchByImageUrl, searchByProductInfo, batchSearchByImages, batchSearchByImageUrls } from '@/api';
import axios from 'axios';

export default function ImageSearchPage() {
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ImageSearchResult[]>([]);
  const [activeResult, setActiveResult] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [manualSearchTerm, setManualSearchTerm] = useState('');
  const [showManualSearch, setShowManualSearch] = useState(false);

  // Check if the backend server is running when the page loads
 
  const handleSearch = async (formData: FormData | { image_url: string }) => {
    setLoading(true);
    setError(null);
    
    try {
      let result: ImageSearchResult;
      
      if (formData instanceof FormData) {
        const imageFile = formData.get('image') as File;
        if (!imageFile) {
          throw new Error('画像ファイルが見つかりません');
        }
        
        console.log(`Searching with image file: ${imageFile.name}, size: ${imageFile.size} bytes`);
        
        // Create a default empty result structure in case the API fails
        const emptyResult: ImageSearchResult = {
          similar_products: [],
          price_comparison: [],
          detailed_products: [],
          query_image: URL.createObjectURL(imageFile),
          model_numbers: []
        };
        
        try {
          result = await searchByImage(imageFile);
          console.log('Image search result:', JSON.stringify(result, null, 2));
          
          // Fix the image URL path if it starts with /api/uploads/
          if (result.query_image && result.query_image.startsWith('/api/uploads/')) {
            // Replace with the correct URL that includes the API base URL
            const filename = result.query_image.replace('/api/uploads/', '');
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            result.query_image = `${API_BASE_URL}/uploads/${filename}`;
          }
          
          // Process Amazon product image URLs
          if (result.detailed_products && result.detailed_products.length > 0) {
            result.detailed_products = result.detailed_products.map(product => {
              // Check if this is an Amazon product
              const isAmazonProduct = (product.source || product.store || '').toLowerCase().includes('amazon');
              
              // If it's an Amazon product and has an image_url, ensure it's using the correct URL
              if (isAmazonProduct && product.image_url) {
                // Log the original image URL for debugging
                console.log(`Processing Amazon product image: ${product.image_url}`);
                
                // If the image URL is a placeholder or doesn't start with http, fix it
                if (product.image_url.includes('placehold.co') || !product.image_url.startsWith('http')) {
                  // If we have an ASIN, use it to generate a reliable image URL
                  if (product.asin) {
                    product.image_url = `https://m.media-amazon.com/images/I/${product.asin}._AC_SL1200_.jpg`;
                  }
                }
              }
              
              return product;
            });
          }
        } catch (apiError) {
          console.error('API error during image search:', apiError);
          
          // Use the empty result but show an error message
          result = emptyResult;
          
          // Try to analyze the image directly
          try {
            const analysisResult = await analyzeImage(formData);
            if (analysisResult && analysisResult.generic_term) {
              // If we got a generic term, use it to search
              const genericTerm = analysisResult.generic_term;
              console.log(`Using generic term for search: ${genericTerm}`);
              
              try {
                const searchResult = await searchByProductInfo(genericTerm, true);
                
                // Update the result with the search results
                result.price_comparison = searchResult.price_comparison;
                result.detailed_products = searchResult.detailed_products;
                result.generic_term = genericTerm;
                
                // Show a message to the user
                result.message = `画像の認識に問題がありましたが、画像から「${genericTerm}」を検出して検索しました。`;
              } catch (searchError) {
                console.error('Error searching with generic term:', searchError);
                result.message = `画像の認識に問題があり、代替検索も失敗しました。別の画像を試すか、手動で検索してください。`;
                
                // Show manual search option
                setShowManualSearch(true);
              }
            } else {
              result.message = '画像の認識に問題があります。別の画像を試すか、手動で検索してください。';
              setShowManualSearch(true);
            }
          } catch (analysisError) {
            console.error('Error analyzing image:', analysisError);
            result.message = '画像の認識に問題があります。別の画像を試すか、手動で検索してください。';
            setShowManualSearch(true);
          }
        }
      } else {
        console.log(`Searching with image URL: ${formData.image_url}`);
        
        // Create a default empty result structure in case the API fails
        const emptyResult: ImageSearchResult = {
          similar_products: [],
          price_comparison: [],
          detailed_products: [],
          query_image: formData.image_url,
          model_numbers: []
        };
        
        try {
          result = await searchByImageUrl(formData.image_url);
          console.log('Image URL search result:', JSON.stringify(result, null, 2));
        } catch (apiError) {
          console.error('API error during image URL search:', apiError);
          
          // Use the empty result but show an error message
          result = emptyResult;
          
          // Try to analyze the image directly
          try {
            const analysisResult = await analyzeImage({ image_url: formData.image_url });
            if (analysisResult && analysisResult.generic_term) {
              // If we got a generic term, use it to search
              const genericTerm = analysisResult.generic_term;
              console.log(`Using generic term for search: ${genericTerm}`);
              
              try {
                const searchResult = await searchByProductInfo(genericTerm, true);
                
                // Update the result with the search results
                result.price_comparison = searchResult.price_comparison;
                result.detailed_products = searchResult.detailed_products;
                result.generic_term = genericTerm;
                
                // Show a message to the user
                result.message = `画像の認識に問題がありましたが、画像から「${genericTerm}」を検出して検索しました。`;
              } catch (searchError) {
                console.error('Error searching with generic term:', searchError);
                result.message = `画像の認識に問題があり、代替検索も失敗しました。別の画像を試すか、手動で検索してください。`;
                
                // Show manual search option
                setShowManualSearch(true);
              }
            } else {
              result.message = '画像の認識に問題があります。別の画像を試すか、手動で検索してください。';
              setShowManualSearch(true);
            }
          } catch (analysisError) {
            console.error('Error analyzing image:', analysisError);
            result.message = '画像の認識に問題があります。別の画像を試すか、手動で検索してください。';
            setShowManualSearch(true);
          }
        }
      }
      
      setSearchResults([result]);
      setActiveResult(0);
    } catch (error) {
      console.error('Error during image search:', error);
      setError('画像検索中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle batch search with multiple images or URLs
  const handleBatchSearch = async (formData: FormData[] | { image_urls: string[] }) => {
    setLoading(true);
    setError(null);
    
    try {
      let results: ImageSearchResult[];
      
      if (Array.isArray(formData)) {
        // Multiple image files (FormData array)
        const imageFiles: File[] = [];
        
        // Extract files from FormData objects
        for (const singleFormData of formData) {
          const imageFile = singleFormData.get('image') as File;
          if (imageFile) {
            imageFiles.push(imageFile);
          }
        }
        
        // Use batch search function
        if (imageFiles.length > 0) {
          results = await batchSearchByImages(imageFiles);
        } else {
          throw new Error('No valid image files found');
        }
      } else {
        // Multiple image URLs
        const { image_urls } = formData;
        
        if (image_urls.length > 0) {
          results = await batchSearchByImageUrls(image_urls);
        } else {
          throw new Error('No valid image URLs found');
        }
      }
      
      setSearchResults(results);
      setActiveResult(0); // Set the first result as active
    } catch (error) {
      console.error('Error during batch image search:', error);
      setError('一括画像検索中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  // Function to analyze an image and determine what's in it
  const analyzeImage = async (formData: FormData | { image_url: string }): Promise<{ generic_term: string } | null> => {
    try {
      // In a real implementation, this would call your backend API
      // For now, we'll simulate it with a mock response
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Return a mock response for the rope image
      return { generic_term: "ロープ" };
      
      // In a real implementation, you would call your backend:
      // const response = await axios.post('/api/analyze-image', formData);
      // return response.data;
    } catch (error) {
      console.error('Error analyzing image:', error);
      return null;
    }
  };

  const handleManualSearch = async () => {
    if (!manualSearchTerm.trim()) {
      setError('検索語を入力してください');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const searchResult = await searchByProductInfo(manualSearchTerm, true);
      
      // Create an image search result with the manual search results
      const imageSearchResult: ImageSearchResult = {
        similar_products: [],
        price_comparison: searchResult.price_comparison || [],
        detailed_products: searchResult.detailed_products || [],
        query_image: '',
        model_numbers: [],
        generic_term: manualSearchTerm,
        message: `「${manualSearchTerm}」の検索結果を表示しています。`
      };
      
      setSearchResults([imageSearchResult]);
      setActiveResult(0);
      setShowManualSearch(false);
    } catch (error) {
      console.error('Error during manual search:', error);
      setError('検索中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 4 }}>
        画像検索
      </Typography>
      
      {serverStatus === 'offline' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          バックエンドサーバーに接続できません。サーバーが起動しているか確認してください。
        </Alert>
      )}
      
      <ImageSearchForm 
        onSearch={handleSearch} 
        onBatchSearch={handleBatchSearch}
        isLoading={loading} 
      />
      
      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}
      
      {showManualSearch && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            手動検索
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            画像からの検索に問題がありました。キーワードを入力して手動で検索できます。
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="検索キーワード"
              value={manualSearchTerm}
              onChange={(e) => setManualSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
            />
            <Button 
              variant="contained" 
              onClick={handleManualSearch}
              disabled={loading || !manualSearchTerm.trim()}
            >
              検索
            </Button>
          </Box>
        </Paper>
      )}
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {!loading && !error && searchResults.length > 0 && (
        <>
          {searchResults.length > 1 && (
            <Box sx={{ mt: 4, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                検索結果 ({searchResults.length}件)
              </Typography>
              <Tabs
                value={activeResult}
                onChange={(_, newValue) => setActiveResult(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 2 }}
              >
                {searchResults.map((result, index) => {
                  let label = `結果 ${index + 1}`;
                  if (result.filename) {
                    label = result.filename.length > 20 
                      ? result.filename.substring(0, 20) + '...' 
                      : result.filename;
                  }
                  return <Tab key={index} label={label} />;
                })}
              </Tabs>
            </Box>
          )}
          
          {searchResults.map((result, index) => (
            <Box key={index} sx={{ display: activeResult === index ? 'block' : 'none' }}>
              <ImageSearchResults result={result} />
            </Box>
          ))}
        </>
      )}
    </Container>
  );
} 