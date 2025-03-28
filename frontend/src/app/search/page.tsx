'use client';

import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, CircularProgress, Alert } from '@mui/material';
import SearchForm from '@/components/SearchForm';
import SearchResults from '@/components/SearchResults';
import BatchSearchResults from '@/components/BatchSearchResults';
import { searchByProductInfo, batchSearchByProductInfo, enhanceKeywords, findBestModel, checkBatchSearchStatus } from '@/api';
import { toast } from 'react-hot-toast';
import { SearchResult } from '@/types';
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs';
import { BestModelResult } from '@/api';

export default function SearchPage() {
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [batchResults, setBatchResults] = useState<SearchResult[]>([]);
  const [bestModelResult, setBestModelResult] = useState<BestModelResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [isBestModelMode, setIsBestModelMode] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number, total: number } | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [hasErrors, setHasErrors] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [statusPolling, setStatusPolling] = useState<NodeJS.Timeout | null>(null);

  // Calculate estimated time remaining based on progress
  useEffect(() => {
    if (loading && batchProgress && startTime) {
      const elapsedTime = (Date.now() - startTime) / 1000; // in seconds
      const itemsProcessed = batchProgress.current;
      
      if (itemsProcessed > 0) {
        const timePerItem = elapsedTime / itemsProcessed;
        const itemsRemaining = batchProgress.total - itemsProcessed;
        const estimatedTimeRemaining = Math.ceil(timePerItem * itemsRemaining);
        
        setEstimatedTime(estimatedTimeRemaining);
      }
    } else {
      setEstimatedTime(null);
    }
  }, [batchProgress, loading, startTime]);

  // Set up polling for batch status updates
  useEffect(() => {
    if (batchId && loading) {
      // Start polling for status updates
      const intervalId = setInterval(async () => {
        try {
          const status = await checkBatchSearchStatus(batchId);
          
          // Update progress
          if (status.total && status.processed) {
            setBatchProgress({
              current: status.processed,
              total: status.total
            });
          }
          
          // Check if completed
          if (status.completed) {
            setLoading(false);
            setBatchProgress(null);
            setEstimatedTime(null);
            
            // Update results if available
            if (status.results && status.results.length > 0) {
              // Normalize results to ensure detailed_products is always an array
              const normalizedResults = status.results.map((result: SearchResult) => ({
                ...result,
                detailed_products: Array.isArray(result.detailed_products) ? result.detailed_products : []
              }));
              setBatchResults(normalizedResults);
            }
            
            // Check for errors
            if (status.has_errors) {
              setHasErrors(true);
              toast.error('一部のデータにエラーが発生しました');
            }
            
            // Clear polling
            clearInterval(intervalId);
            setStatusPolling(null);
          }
        } catch (error) {
          console.error('Error polling batch status:', error);
        }
      }, 2000); // Poll every 2 seconds
      
      setStatusPolling(intervalId);
      
      // Clean up on unmount
      return () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    } else if (!loading && statusPolling) {
      // Clean up polling when loading stops
      clearInterval(statusPolling);
      setStatusPolling(null);
    }
  }, [batchId, loading]);

  // Handle single product search
  const handleSingleSearch = async (productInfo: string, directSearch: boolean) => {
    // Reset other modes
    setIsBatchMode(false);
    setIsBestModelMode(false);
    setBatchResults([]);
    setBestModelResult(null);
    setHasErrors(false);
    
    // If empty, just reset the results
    if (!productInfo) {
      setSearchResults(null);
      return;
    }
    
    setLoading(true);
    try {
      const results = await searchByProductInfo(productInfo, directSearch);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('検索中にエラーが発生しました');
      setSearchResults(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle batch search
  const handleBatchSearch = async (productInfoList: string[], useAI: boolean, directSearch: boolean) => {
    // Reset other modes
    setIsBatchMode(true);
    setIsBestModelMode(false);
    setSearchResults(null);
    setBestModelResult(null);
    setHasErrors(false);
    setBatchResults([]);
    setBatchId(null);
    
    // If empty, just reset the results
    if (!productInfoList.length) {
      return;
    }
    
    setLoading(true);
    setBatchProgress({ current: 0, total: productInfoList.length });
    setStartTime(Date.now());
    
    try {
      if (useAI) {
        await enhancedBatchSearch(productInfoList, directSearch);
      } else {
        // For large batches, we'll process in chunks and update progress
        if (productInfoList.length > 20) {
          // Process in chunks of 20
          const chunkSize = 20;
          let allResults: SearchResult[] = [];
          let errorOccurred = false;
          
          for (let i = 0; i < productInfoList.length; i += chunkSize) {
            const chunk = productInfoList.slice(i, i + chunkSize);
            try {
              const results = await batchSearchByProductInfo(chunk, directSearch);
              
              // Check if we got a batch ID from localStorage (set by the API function)
              const storedBatchId = localStorage.getItem('last_batch_id');
              if (storedBatchId && i === 0) {
                setBatchId(storedBatchId);
                // First chunk has batch ID, let the polling handle updates
                break;
              }
              
              // Check for errors in the results
              for (const result of results) {
                if (result.error) {
                  errorOccurred = true;
                  break;
                }
              }
              
              allResults = [...allResults, ...results];
            } catch (error) {
              console.error(`Error processing chunk ${i/chunkSize + 1}:`, error);
              errorOccurred = true;
              
              // Display error message but continue processing
              toast.error(`チャンク ${i/chunkSize + 1} の処理中にエラーが発生しましたが、処理を続行します`);
            }
            
            // Update progress regardless of errors
            setBatchProgress({ 
              current: Math.min(i + chunkSize, productInfoList.length), 
              total: productInfoList.length 
            });
            
            // Update partial results to show progress
            setBatchResults(allResults);
            
            if (errorOccurred) {
              setHasErrors(true);
            }
          }
        } else {
          // For smaller batches, process all at once
          try {
            const results = await batchSearchByProductInfo(productInfoList, directSearch);
            
            // Add debug logging
            console.log("Batch search API response:", results);
            if (results && results.length > 0) {
              console.log("First result detailed_products:", 
                results[0].detailed_products ? 
                `${results[0].detailed_products.length} items` : 
                'undefined or empty');
            }
            
            // Normalize results to ensure detailed_products is always an array
            const normalizedResults = results.map((result: SearchResult) => ({
              ...result,
              detailed_products: Array.isArray(result.detailed_products) ? result.detailed_products : []
            }));
            
            // Check if we got a batch ID from localStorage
            const storedBatchId = localStorage.getItem('last_batch_id');
            if (storedBatchId) {
              setBatchId(storedBatchId);
              // Let the polling handle updates
              return;
            }
            
            // Check for errors in the results
            let errorOccurred = false;
            for (const result of normalizedResults) {
              if (result.error) {
                errorOccurred = true;
                break;
              }
            }
            
            if (errorOccurred) {
              setHasErrors(true);
            }
            
            setBatchResults(normalizedResults);
          } catch (error) {
            console.error('Batch search error:', error);
            toast.error('一括検索中にエラーが発生しました');
            setHasErrors(true);
          }
          
          setBatchProgress({ current: productInfoList.length, total: productInfoList.length });
        }
      }
    } catch (error) {
      console.error('Batch search error:', error);
      toast.error('一括検索中にエラーが発生しましたが、部分的な結果を表示します');
      setHasErrors(true);
    } finally {
      // Only set loading to false if we're not using polling
      if (!batchId) {
        setLoading(false);
        setBatchProgress(null);
        setEstimatedTime(null);
      }
    }
  };

  // Enhanced batch search with AI enhancement
  const enhancedBatchSearch = async (productInfoList: string[], directSearch: boolean) => {
    try {
      const results = await enhanceKeywords(productInfoList, "一括検索用");
      
      if (!results || !results.results || !Array.isArray(results.results)) {
        throw new Error('Invalid response from keyword enhancement');
      }
      
      // Process results in chunks
      const enhancedResults: SearchResult[] = [];
      const chunkSize = 10;
      let errorOccurred = false;
      
      for (let i = 0; i < results.results.length; i += chunkSize) {
        const chunk = results.results.slice(i, i + chunkSize);
        
        // Process each item in the chunk
        for (let j = 0; j < chunk.length; j++) {
          const item = chunk[j];
          const originalQuery = productInfoList[i + j] || item.model_number;
          
          try {
            // Use the enhanced keywords for search
            const searchResult = await searchByProductInfo(item.enhanced_keywords || item.model_number, directSearch);
            
            // Add original query to the result
            enhancedResults.push({
              ...searchResult,
              product_info: originalQuery,
              keywords: [item.enhanced_keywords || item.model_number]
            });
          } catch (error) {
            console.error(`Error searching for enhanced keywords for ${originalQuery}:`, error);
            errorOccurred = true;
            
            // Add a placeholder result with error
            enhancedResults.push({
              product_info: originalQuery,
              keywords: [item.enhanced_keywords || item.model_number],
              error: `検索エラー: ${error}`,
              price_comparison: [],
              detailed_products: []
            });
          }
          
          // Update progress
          setBatchProgress({
            current: i + j + 1,
            total: results.results.length
          });
          
          // Update results as we go
          setBatchResults([...enhancedResults]);
        }
      }
      
      if (errorOccurred) {
        setHasErrors(true);
      }
      
    } catch (error) {
      console.error('Enhanced batch search error:', error);
      toast.error('AIキーワード強化処理中にエラーが発生しました');
      setHasErrors(true);
    }
  };

  // Handle best model search
  const handleBestModelSearch = async (modelNumbers: string[], criteriaPrompt: string) => {
    // Reset other modes
    setIsBatchMode(false);
    setIsBestModelMode(true);
    setSearchResults(null);
    setBatchResults([]);
    
    // If empty, just reset the results
    if (!modelNumbers.length || !criteriaPrompt) {
      setBestModelResult(null);
      return;
    }
    
    setLoading(true);
    try {
      const result = await findBestModel(modelNumbers, criteriaPrompt);
      setBestModelResult(result);
      
      // If a best model was found, also search for it
      if (result.best_model_number && typeof result.best_model_number === 'string') {
        // Small delay to ensure the best model result is displayed first
        setTimeout(async () => {
          try {
            const searchResult = await searchByProductInfo(result.best_model_number as string, true);
            setSearchResults(searchResult);
          } catch (error) {
            console.error('Error searching best model:', error);
            toast.error('最適なモデルの検索中にエラーが発生しました');
          }
        }, 500);
      }
    } catch (error) {
      console.error('Best model search error:', error);
      toast.error('最適なモデル検索中にエラーが発生しました');
      setBestModelResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    // This is handled by the SearchForm component
    console.log('File uploaded:', file.name);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <CustomBreadcrumbs
          items={[
            { label: 'ホーム', href: '/' },
            { label: '検索', href: '/search' },
          ]}
        />
        
        <Typography variant="h4" component="h1" gutterBottom>
          商品検索
        </Typography>
        
        <SearchForm 
          onSearch={handleSingleSearch} 
          onBatchSearch={handleBatchSearch}
          onBestModelSearch={handleBestModelSearch}
          onFileUpload={handleFileUpload}
          isLoading={loading}
        />
        
        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4 }}>
            <CircularProgress />
            {batchProgress && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  処理中... {batchProgress.current}/{batchProgress.total}
                </Typography>
                {estimatedTime !== null && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    推定残り時間: {estimatedTime < 60 
                      ? `${estimatedTime}秒` 
                      : `${Math.floor(estimatedTime / 60)}分${estimatedTime % 60}秒`}
                  </Typography>
                )}
                <Box sx={{ width: '100%', mt: 1 }}>
                  <Box
                    sx={{
                      width: '250px',
                      height: '4px',
                      bgcolor: 'grey.200',
                      borderRadius: 1,
                      position: 'relative',
                      mx: 'auto'
                    }}
                  >
                    <Box
                      sx={{
                        width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                        height: '100%',
                        bgcolor: 'primary.main',
                        borderRadius: 1,
                        transition: 'width 0.3s ease-in-out'
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        )}
        
        {!loading && searchResults && !isBatchMode && !isBestModelMode && (
          <SearchResults results={searchResults} />
        )}
        
        {!loading && isBatchMode && batchResults.length > 0 && (
          <BatchSearchResults results={batchResults} hasErrors={hasErrors} />
        )}
        
        {loading && isBatchMode && batchResults.length > 0 && (
          <Box sx={{ mt: 4, opacity: 0.7 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              一部の結果を表示しています。すべての検索が完了するまでお待ちください。
              {hasErrors && ' 一部のデータにエラーが発生していますが、処理を続行しています。'}
            </Alert>
            <BatchSearchResults results={batchResults} hasErrors={hasErrors} />
          </Box>
        )}
        
        {!loading && isBestModelMode && bestModelResult && (
          <Box sx={{ mt: 4 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              条件に最適なモデル: {bestModelResult.best_model_number || '見つかりませんでした'}
            </Alert>
            
            <Typography variant="h6" gutterBottom>
              選定理由:
            </Typography>
            <Typography paragraph>
              {bestModelResult.reason}
            </Typography>
            
            {bestModelResult.search_results && (
              <SearchResults results={bestModelResult.search_results} />
            )}
          </Box>
        )}
      </Box>
    </Container>
  );
} 