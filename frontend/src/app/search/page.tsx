'use client';

import React, { useState } from 'react';
import { Container, Typography, Box, CircularProgress, Alert } from '@mui/material';
import SearchForm from '@/components/SearchForm';
import SearchResults from '@/components/SearchResults';
import BatchSearchResults from '@/components/BatchSearchResults';
import { searchByProductInfo, batchSearchByProductInfo, enhanceKeywords, findBestModel } from '@/api';
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

  // Handle single product search
  const handleSingleSearch = async (productInfo: string, directSearch: boolean) => {
    // Reset other modes
    setIsBatchMode(false);
    setIsBestModelMode(false);
    setBatchResults([]);
    setBestModelResult(null);
    
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
    
    // If empty, just reset the results
    if (!productInfoList.length) {
      setBatchResults([]);
      return;
    }
    
    setLoading(true);
    
    try {
      if (useAI) {
        await enhancedBatchSearch(productInfoList, directSearch);
      } else {
        const results = await batchSearchByProductInfo(productInfoList, directSearch);
        setBatchResults(results);
      }
    } catch (error) {
      console.error('Batch search error:', error);
      toast.error('一括検索中にエラーが発生しました');
      setBatchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced batch search with AI
  const enhancedBatchSearch = async (productInfoList: string[], directSearch: boolean) => {
    try {
      // First, enhance the keywords
      const enhancedKeywords = await enhanceKeywords(productInfoList);
      
      // Then, search with the enhanced keywords
      const results = await batchSearchByProductInfo(enhancedKeywords, directSearch);
      setBatchResults(results);
    } catch (error) {
      console.error('Enhanced batch search error:', error);
      // Fallback to regular batch search
      toast.error('AIによるキーワード最適化に失敗しました。通常の検索を実行します。');
      const results = await batchSearchByProductInfo(productInfoList, directSearch);
      setBatchResults(results);
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
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}
        
        {!loading && searchResults && !isBatchMode && !isBestModelMode && (
          <SearchResults results={searchResults} />
        )}
        
        {!loading && isBatchMode && batchResults.length > 0 && (
          <BatchSearchResults results={batchResults} />
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
            
            {bestModelResult.all_evaluations && bestModelResult.all_evaluations.length > 0 && (
              <>
                <Typography variant="h6" gutterBottom>
                  全モデルの評価:
                </Typography>
                {bestModelResult.all_evaluations.map((evaluation, index) => (
                  <Box key={index} sx={{ mb: 2, p: 2, bgcolor: evaluation.model_number === bestModelResult.best_model_number ? '#f0f7ff' : '#f5f5f5' }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {evaluation.model_number} - スコア: {evaluation.score}/10
                    </Typography>
                    <Typography variant="body2">
                      {evaluation.comment}
                    </Typography>
                  </Box>
                ))}
              </>
            )}
            
            {/* Display search results for the best model if available */}
            {searchResults && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ bgcolor: '#f0f7ff', p: 2, borderRadius: 1 }}>
                  最適なモデルの検索結果
                </Typography>
                <SearchResults results={searchResults} />
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Container>
  );
} 