'use client';

import { useState, useEffect } from 'react';
import { Container, Typography, Box, CircularProgress, Chip, Paper, Divider, Alert, Button, TextField, Grid, Tab, Tabs } from '@mui/material';
import ImageSearchForm from '@/components/ImageSearchForm';
import SearchResults from '@/components/SearchResults';
import { ImageSearchResult, ModelNumber } from '@/types';
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
    
    let imageFile: File | null = null;
    let imageUrl: string | null = null;
    
    // Check if formData is an object with image_url
    if ('image_url' in formData) {
      imageUrl = formData.image_url;
    } else {
      // It's a FormData object
      imageFile = formData.get('image') as File;
    }
    
    try {
      let result;
      let genericTerm = null;
      
      // First, get the image search result to extract the generic term
      if (imageUrl) {
        // Search by URL
        result = await searchByImageUrl(imageUrl);
        genericTerm = result.generic_term;
      } else if (imageFile) {
        // Search by file upload
        result = await searchByImage(imageFile);
        console.log('Image search result:', JSON.stringify(result, null, 2));
        genericTerm = result.generic_term;
        
        // Fix the image URL path if it starts with /api/uploads/
        if (result.query_image && result.query_image.startsWith('/api/uploads/')) {
          // Replace with the correct URL that includes the API base URL
          const filename = result.query_image.replace('/api/uploads/', '');
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
          result.query_image = `${API_BASE_URL}/uploads/${filename}`;
        }
      } else if (manualSearchTerm) {
        // Search by manual text input
        genericTerm = manualSearchTerm;
      } else {
        throw new Error('No image or search term provided');
      }
      
      // If we have a generic term, use it to search with 単一検索
      if (genericTerm) {
        console.log(`Using generic term for search: ${genericTerm}`);
        
        // Use the generic term to search with 単一検索
        const searchResult = await searchByProductInfo(genericTerm, true);
        
        // Create an image search result with the search results
        const imageSearchResult: ImageSearchResult = {
          similar_products: result ? result.similar_products || [] : [],
          price_comparison: searchResult.price_comparison || [],
          detailed_products: searchResult.detailed_products || [],
          query_image: result ? result.query_image || '' : '',
          model_numbers: result ? result.model_numbers || [] : [],
          generic_term: genericTerm,
          message: `「${genericTerm}」の検索結果を表示しています。`
        };
        
        // Process Amazon and Yahoo product image URLs
        if (imageSearchResult.detailed_products && imageSearchResult.detailed_products.length > 0) {
          // Process all product images to ensure they're using the correct URLs
          imageSearchResult.detailed_products = imageSearchResult.detailed_products.map(product => {
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
            
            // Check if this is a Yahoo product
            const isYahooProduct = (product.source || product.store || '').toLowerCase().includes('yahoo');
            
            // If it's a Yahoo product and has a placeholder image, try to fix it
            if (isYahooProduct && product.image_url) {
              // Log the original image URL for debugging
              console.log(`Processing Yahoo product image: ${product.image_url}`);
              
              // If the image URL is a placeholder, try to use a better one
              if (product.image_url.includes('placehold.co') || product.image_url.includes('no_image')) {
                // Create a search URL for the product title
                const encodedTitle = encodeURIComponent(product.title || 'product');
                product.image_url = `https://shopping.c.yimg.jp/lib/y-kojima/${encodedTitle.substring(0, 30)}.jpg`;
              }
            }
            
            return product;
          });
        }
        
        setSearchResults([imageSearchResult]);
      } else {
        // If no generic term was found, just use the original result
        setSearchResults([result as ImageSearchResult]);
      }
      
      setActiveResult(0);
    } catch (err) {
      console.error('Search error:', err);
      if (axios.isAxiosError(err) && err.response?.status === 500) {
        setError('サーバーエラーが発生しました。しばらく経ってからもう一度お試しください。');
      } else {
        setError('検索中にエラーが発生しました。もう一度お試しください。');
      }
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
      // Call the backend API to analyze the image
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const endpoint = `${API_BASE_URL}/api/analyze-image`;
      
      let response;
      if ('image_url' in formData) {
        // If it's an image URL
        response = await axios.post(endpoint, {
          image_url: formData.image_url
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
      } else {
        // If it's a file upload
        response = await axios.post(endpoint, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      
      console.log('Image analysis response:', response.data);
      return response.data;
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
              {/* <ImageSearchResults result={result} /> */}
              <SearchResults results={{
                ...result,
                keywords: result.generic_term ? [result.generic_term] : []
              }} />
            </Box>
          ))}
        </>
      )}
    </Container>
  );
} 