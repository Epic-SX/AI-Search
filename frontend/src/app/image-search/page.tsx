'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Typography, Box, CircularProgress, Chip, Paper, Divider, Alert, Button, TextField, Grid, Tab, Tabs } from '@mui/material';
import ImageSearchForm from '@/components/ImageSearchForm';
import SearchResults from '@/components/SearchResults';
import { ImageSearchResult, ModelNumber } from '@/types';
import { searchByImage, searchByImageUrl, searchByProductInfo, batchSearchByImages, batchSearchByImageUrls, analyzeImageWithPerplexity } from '@/api';
import axios from 'axios';

export default function ImageSearchPage() {
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ImageSearchResult[]>([]);
  const [activeResult, setActiveResult] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [manualSearchTerm, setManualSearchTerm] = useState('');
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [message, setMessage] = useState('');
  const [usedPerplexity, setUsedPerplexity] = useState(false);
  const [perplexityLoading, setPerplexityLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

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
      let usedPerplexity = false;
      
      // First, try to analyze the image with Perplexity AI
      let perplexityResult = null;
      if (imageUrl) {
        try {
          setPerplexityLoading(true);
          perplexityResult = await analyzeImageWithPerplexity({ image_url: imageUrl });
        } catch (err) {
          console.error('Error analyzing image with Perplexity:', err);
        } finally {
          setPerplexityLoading(false);
        }
      } else if (imageFile) {
        try {
          const perplexityFormData = new FormData();
          perplexityFormData.append('image', imageFile);
          perplexityResult = await analyzeImageWithPerplexity(perplexityFormData);
        } catch (err) {
          console.error('Error analyzing image with Perplexity:', err);
        }
      }
      
      // If Perplexity found a specific product, use that information
      if (perplexityResult && (perplexityResult.product_name || perplexityResult.model_number)) {
        console.log('Using Perplexity AI analysis result:', perplexityResult);
        
        // Use product name as primary search term, fall back to model number
        // Use a combination of product name and additional keywords for better search
        let searchTerms = [];
        if (perplexityResult.product_name) {
          searchTerms.push(perplexityResult.product_name);
        }
        
        // Add model number if available and different from product name
        if (perplexityResult.model_number && 
            perplexityResult.model_number !== perplexityResult.product_name) {
          searchTerms.push(perplexityResult.model_number);
        }
        
        // Add additional keywords if available
        if (perplexityResult.additional_keywords && perplexityResult.additional_keywords.length > 0) {
          // Only add relevant keywords for specific product types
          const relevantKeywords = perplexityResult.additional_keywords.filter(keyword => 
            keyword !== 'laptop' && 
            keyword !== 'notebook' && 
            keyword !== 'computer' && 
            keyword !== 'brand name' && 
            keyword !== 'operating system'
          );
          
          searchTerms = [...searchTerms, ...relevantKeywords];
        }
        
        // Combine all terms for search
        genericTerm = searchTerms.join(' ');
        console.log(`Using enriched search term: ${genericTerm}`);
        
        try {
          setSearchLoading(true);
          // Skip the standard image search and directly use product search with the specific term
          const searchResult = await searchByProductInfo(genericTerm, true);
          
          // If we got valid search results, use them
          if (searchResult && (searchResult.price_comparison?.length > 0 || 
                               searchResult.detailed_products?.length > 0)) {
            
            // Create a synthetic image search result
            result = {
              similar_products: [],
              price_comparison: searchResult.price_comparison || [],
              detailed_products: searchResult.detailed_products || [],
              query_image: imageUrl || '',
              model_numbers: perplexityResult.model_number ? 
                [{ model_number: perplexityResult.model_number, confidence: 0.95, source: 'perplexity' }] : [],
              generic_term: genericTerm,
              jan_code: perplexityResult.jan_code !== 'unknown' ? perplexityResult.jan_code : null,
              message: `Perplexity AI による分析結果: ${perplexityResult.product_name}`
            };
            
            // Log search results for debugging
            console.log("Final search results:", JSON.stringify(result, null, 2));
            
            // We've successfully used Perplexity
            usedPerplexity = true;
          } else {
            // If product search failed, fallback to standard image search
            if (imageUrl) {
              result = await searchByImageUrl(imageUrl) as unknown as ImageSearchResult;
            } else if (imageFile) {
              result = await searchByImage(imageFile);
            }
            
            // Fix the image URL path if it starts with /api/uploads/
            if (result && result.query_image && result.query_image.startsWith('/api/uploads/')) {
              const filename = result.query_image.replace('/api/uploads/', '');
              const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
              result.query_image = `${API_BASE_URL}/uploads/${filename}`;
            }
          }
        } catch (err) {
          console.error('Error in product search:', err);
          // Fallback to standard image search
          if (imageUrl) {
            result = await searchByImageUrl(imageUrl) as unknown as ImageSearchResult;
          } else if (imageFile) {
            result = await searchByImage(imageFile);
          }
        } finally {
          setSearchLoading(false);
        }
      } else {
        // Fall back to standard image search if Perplexity failed
      if (imageUrl) {
        // Search by URL
          result = await searchByImageUrl(imageUrl) as unknown as ImageSearchResult;
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
      }
      
      // If we have a generic term, use it to search with 単一検索
      if (genericTerm) {
        console.log(`Using generic term for search: ${genericTerm}`);
        
        try {
          // Set search loading state
          setSearchLoading(true);
          
          // Determine if this is a laptop search
          const isLaptopSearch = genericTerm.toLowerCase().includes('パソコン') || 
                                genericTerm.toLowerCase().includes('laptop') ||
                                genericTerm.toLowerCase().includes('notebook');
          
          console.log(`Detected laptop search: ${isLaptopSearch}`);
          
          // Fix search terms for better results
          let searchTermsToTry = [];
          
          if (isLaptopSearch) {
            // Extract brand name from the search term
            const laptopBrands = ['hp', 'dell', 'lenovo', 'asus', 'acer', 'msi', 'fujitsu', 'toshiba', 'nec', 'vaio'];
            const brandMatch = laptopBrands.find(brand => genericTerm.toLowerCase().includes(brand.toLowerCase()));
            
            if (brandMatch) {
              // First try the more specific term that was recognized
              searchTermsToTry.push(genericTerm);
              
              // Then try a more generic brand + type search if needed
              if (genericTerm.toLowerCase().includes('pavilion')) {
                searchTermsToTry.push(`HP Pavilion ノートパソコン`);
              } else if (genericTerm.toLowerCase().includes('aspire')) {
                searchTermsToTry.push(`Acer Aspire ノートパソコン`);
              } else {
                searchTermsToTry.push(`${brandMatch} ノートパソコン`);
              }
            } else {
              searchTermsToTry.push(genericTerm);
              searchTermsToTry.push('ノートパソコン'); // Fallback
            }
          } else {
            // For non-laptop searches, just use the original term
            searchTermsToTry.push(genericTerm);
          }
          
          console.log(`Search terms to try: ${searchTermsToTry.join(', ')}`);
          
          // Try each search term until we get good results
          let searchResult = null;
          let usedSearchTerm = genericTerm;
          
          for (const term of searchTermsToTry) {
            console.log(`Trying search term: ${term}`);
            const result = await searchByProductInfo(term, false); // Disable JAN code search for laptops
            
            if (result && result.detailed_products && result.detailed_products.length > 0) {
              console.log(`Found ${result.detailed_products.length} products with term: ${term}`);
              
              // Filter products to only include relevant ones
              if (isLaptopSearch) {
                console.log("Filtering laptop results to remove adapters and unrelated products");
                
                // Filter out adapters and other unrelated items
                const filteredProducts = result.detailed_products.filter(product => {
                  const title = product.title?.toLowerCase() || '';
                  const isAdapter = title.includes('アダプター') || 
                                   title.includes('adapter') || 
                                   title.includes('コネクター') ||
                                   title.includes('プラグ') ||
                                   title.includes('充電器');
                                   
                  const isAccessory = title.includes('カバー') ||
                                    title.includes('ケース') ||
                                    title.includes('マウス') ||
                                    title.includes('バッテリー');
                                    
                  // Keep it only if it's not an adapter or accessory
                  return !isAdapter && !isAccessory;
                });
                
                if (filteredProducts.length > 0) {
                  console.log(`After filtering, found ${filteredProducts.length} relevant laptop products`);
                  result.detailed_products = filteredProducts;
                  searchResult = result;
                  usedSearchTerm = term;
                  break;
                }
              } else {
                // For non-laptop searches, use results as-is
                searchResult = result;
                usedSearchTerm = term;
                break;
              }
            }
          }
          
          // If we still don't have results, use the last search result (even if empty)
          if (!searchResult) {
            console.log("No good results found with any term, using original search");
            searchResult = await searchByProductInfo(genericTerm, false);
            usedSearchTerm = genericTerm;
          }
          
          // Log the response for debugging
          console.log("Final search result:", JSON.stringify(searchResult, null, 2));
        
        // Create an image search result with the search results
        const imageSearchResult: ImageSearchResult = {
          similar_products: result ? result.similar_products || [] : [],
          price_comparison: searchResult.price_comparison || [],
          detailed_products: searchResult.detailed_products || [],
          query_image: result ? result.query_image || '' : '',
            model_numbers: perplexityResult?.model_number ? 
              [{ model_number: perplexityResult.model_number, confidence: 0.95, source: 'perplexity' }] : 
              (result ? result.model_numbers || [] : []),
            generic_term: usedSearchTerm,
            jan_code: perplexityResult?.jan_code !== 'unknown' ? perplexityResult?.jan_code : null,
            message: perplexityResult ? 
              `Perplexity AI による分析結果: ${usedSearchTerm}` : 
              `「${usedSearchTerm}」の検索結果を表示しています。`
          };
          
          // Ensure we have detailed products data
          if (!imageSearchResult.detailed_products || imageSearchResult.detailed_products.length === 0) {
            console.warn("No detailed products found in search results");
            
            // Try a more generic search if needed
            if (isLaptopSearch && perplexityResult?.product_name) {
              // Extract brand from product name
              const laptopBrands = ['hp', 'dell', 'lenovo', 'asus', 'acer', 'msi', 'fujitsu', 'toshiba', 'nec', 'vaio'];
              const brand = laptopBrands.find(b => perplexityResult.product_name.toLowerCase().includes(b));
              
              if (brand) {
                console.log(`Trying more generic search with brand: ${brand}`);
                const fallbackTerm = `${brand} ノートパソコン`;
                const fallbackResult = await searchByProductInfo(fallbackTerm, false);
                
                if (fallbackResult.detailed_products && fallbackResult.detailed_products.length > 0) {
                  console.log(`Found ${fallbackResult.detailed_products.length} products with fallback term`);
                  imageSearchResult.detailed_products = fallbackResult.detailed_products;
                  imageSearchResult.price_comparison = fallbackResult.price_comparison || [];
                  imageSearchResult.generic_term = fallbackTerm;
                  imageSearchResult.message = `「${fallbackTerm}」の検索結果を表示しています。`; 
                }
              }
            }
          }
          
          setSearchResults([imageSearchResult]);
        } catch (error) {
          console.error("Error during search:", error);
          setMessage("検索中にエラーが発生しました。もう一度お試しください。");
        } finally {
          setSearchLoading(false);
        }
      } else {
        // If no generic term was found, just use the original result
        setSearchResults([result as ImageSearchResult]);
      }
      
      setActiveResult(0);
      setMessage(`${searchResults.length} 件見つかりました${usedPerplexity ? ' (Perplexity AI 解析使用)' : ''}`);
      setUsedPerplexity(usedPerplexity);
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
  const handleBatchSearch = async (formData: FormData[] | { image_urls: string[], enhanced_data?: any[] }) => {
    setLoading(true);
    setError(null);
    
    try {
      let results: ImageSearchResult[];
      
      if (Array.isArray(formData)) {
        // Multiple image files (FormData array)
        const imageFiles: File[] = [];
        const enhancedData: any[] = [];
        
        // Extract files and enhanced data from FormData objects
        for (const singleFormData of formData) {
          const imageFile = singleFormData.get('image') as File;
          if (imageFile) {
            imageFiles.push(imageFile);
            
            // Extract enhanced data if available
            const enhancedInfo = {
              model_number: singleFormData.get('enhanced_model_number') as string,
              product_name: singleFormData.get('enhanced_product_name') as string,
              jan_code: singleFormData.get('enhanced_jan_code') as string,
              keywords: singleFormData.get('enhanced_keywords') ? 
                JSON.parse(singleFormData.get('enhanced_keywords') as string) : []
            };
            
            enhancedData.push(enhancedInfo);
          }
        }
        
        // Use batch search function
        if (imageFiles.length > 0) {
          results = await batchSearchByImages(imageFiles);
          
          // Enhance search results with the Perplexity data if available
          if (enhancedData.length === results.length) {
            results = results.map((result, index) => {
              const enhanced = enhancedData[index];
              if (enhanced && (enhanced.model_number || enhanced.product_name)) {
                // If we have enhanced data, use it to improve the result
                return {
                  ...result,
                  // Use Perplexity data for better model numbers
                  model_numbers: enhanced.model_number ? 
                    [{ model_number: enhanced.model_number, confidence: 0.95, source: 'perplexity' },
                    ...(result.model_numbers || [])] : 
                    result.model_numbers,
                  // Use Perplexity data for generic term if available
                  generic_term: enhanced.product_name || enhanced.model_number || result.generic_term,
                  // Add JAN code if found
                  jan_code: enhanced.jan_code !== 'unknown' ? enhanced.jan_code : result.jan_code,
                  // Add message about Perplexity enhancement
                  message: enhanced.product_name ? 
                    `Perplexity AI による分析結果: ${enhanced.product_name}` : 
                    result.message
                };
              }
              return result;
            });
          }
        } else {
          throw new Error('No valid image files found');
        }
      } else {
        // Multiple image URLs
        const { image_urls, enhanced_data } = formData;
        
        if (image_urls.length > 0) {
          results = await batchSearchByImageUrls(image_urls);
          
          // Enhance search results with the Perplexity data if available
          if (enhanced_data && enhanced_data.length === results.length) {
            results = results.map((result, index) => {
              const enhanced = enhanced_data[index];
              if (enhanced && (enhanced.enhanced_model_number || enhanced.enhanced_product_name)) {
                // If we have enhanced data, use it to improve the result
                return {
                  ...result,
                  // Use Perplexity data for better model numbers
                  model_numbers: enhanced.enhanced_model_number ? 
                    [{ model_number: enhanced.enhanced_model_number, confidence: 0.95, source: 'perplexity' },
                    ...(result.model_numbers || [])] : 
                    result.model_numbers,
                  // Use Perplexity data for generic term if available
                  generic_term: enhanced.enhanced_product_name || enhanced.enhanced_model_number || result.generic_term,
                  // Add JAN code if found
                  jan_code: enhanced.enhanced_jan_code !== 'unknown' ? enhanced.enhanced_jan_code : result.jan_code,
                  // Add message about Perplexity enhancement
                  message: enhanced.enhanced_product_name ? 
                    `Perplexity AI による分析結果: ${enhanced.enhanced_product_name}` : 
                    result.message
                };
              }
              return result;
            });
          }
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
      
      {perplexityLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2, alignItems: 'center', gap: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">Perplexity AIで画像を分析中...</Typography>
        </Box>
      )}
      
      {searchLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2, alignItems: 'center', gap: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">検索結果を取得中...</Typography>
        </Box>
      )}
      
      {loading && !perplexityLoading && !searchLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {message && (
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Alert severity="info" sx={{ flexGrow: 1 }}>
            {message}
          </Alert>
          {usedPerplexity && (
            <Chip 
              label="Perplexity AI" 
              color="primary" 
              variant="outlined" 
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
          )}
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