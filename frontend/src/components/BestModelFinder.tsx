'use client';

import React, { useState } from 'react';
import { findBestModel, BestModelResult, ModelEvaluation } from '@/api';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Rating,
  Divider
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

const BestModelFinder: React.FC = () => {
  const [modelNumbers, setModelNumbers] = useState<string>('');
  const [criteriaPrompt, setCriteriaPrompt] = useState<string>('');
  const [result, setResult] = useState<BestModelResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to clean model numbers
  const cleanModelNumber = (input: string): string => {
    // Remove numbering like "1 EA628W-25B" -> "EA628W-25B"
    return input.replace(/^\d+[\s\.:]?\s*/, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!modelNumbers.trim()) {
      setError('型番を入力してください');
      return;
    }
    
    if (!criteriaPrompt.trim()) {
      setError('条件を入力してください');
      return;
    }
    
    // Split the input by new lines and filter out empty lines
    const modelNumberList = modelNumbers
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      // Remove any lines that look like part of a prompt
      .filter(line => !line.includes('下記の商品') && 
                      !line.includes('検索キーワード') && 
                      !line.includes('プロンプト') &&
                      !line.includes('出力は商品名') &&
                      !line.includes('メーカー名'))
      // Clean model numbers
      .map(cleanModelNumber);
    
    if (modelNumberList.length === 0) {
      setError('有効な型番を入力してください');
      return;
    }
    
    if (modelNumberList.length < 2) {
      setError('少なくとも2つの型番を入力してください');
      return;
    }
    
    if (modelNumberList.length > 100) {
      setError('一度に処理できる型番は100個までです');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await findBestModel(modelNumberList, criteriaPrompt);
      setResult(result);
    } catch (err) {
      console.error('Error finding best model:', err);
      setError('最適なモデルの検索中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          条件に最適なモデル検索
        </Typography>
        
        <Typography variant="body2" color="textSecondary" paragraph>
          複数の型番から指定した条件に最も合致するモデルを検索します。
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mb: 4 }}>
          <TextField
            label="型番を改行区切りで入力（最大100件）"
            multiline
            rows={6}
            fullWidth
            value={modelNumbers}
            onChange={(e) => {
              setModelNumbers(e.target.value);
              if (error) setError(null);
            }}
            variant="outlined"
            margin="normal"
            placeholder="例：
EA628W-25B
EA715SE-10
EA628PP-35

※型番のみを入力してください。プロンプトや説明文は入力しないでください。"
            disabled={loading}
          />
          
          <TextField
            label="検索条件"
            multiline
            rows={4}
            fullWidth
            value={criteriaPrompt}
            onChange={(e) => {
              setCriteriaPrompt(e.target.value);
              if (error) setError(null);
            }}
            variant="outlined"
            margin="normal"
            placeholder="例：最も軽量で、かつ防水機能があるモデルを選んでください。"
            disabled={loading}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={loading ? <CircularProgress size={24} /> : <SearchIcon />}
              disabled={loading || !modelNumbers.trim() || !criteriaPrompt.trim()}
            >
              最適なモデルを検索
            </Button>
          </Box>
        </Box>
        
        {result && (
          <Box>
            <Typography variant="h6" gutterBottom>
              検索結果
            </Typography>
            
            <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                最適なモデル: {result.best_model_number || '見つかりませんでした'}
              </Typography>
              
              <Typography variant="body1" sx={{ mt: 1 }}>
                選定理由: {result.reason}
              </Typography>
            </Paper>
            
            {result.all_evaluations && result.all_evaluations.length > 0 && (
              <>
                <Typography variant="subtitle1" gutterBottom>
                  全モデルの評価
                </Typography>
                
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>型番</TableCell>
                        <TableCell>評価スコア</TableCell>
                        <TableCell>評価コメント</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {result.all_evaluations.map((evaluation, index) => (
                        <TableRow 
                          key={index}
                          sx={{ 
                            bgcolor: evaluation.model_number === result.best_model_number 
                              ? 'rgba(76, 175, 80, 0.1)' 
                              : 'inherit'
                          }}
                        >
                          <TableCell>{evaluation.model_number}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Rating 
                                value={evaluation.score / 2} 
                                precision={0.5} 
                                readOnly 
                              />
                              <Typography sx={{ ml: 1 }}>
                                {evaluation.score}/10
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{evaluation.comment}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default BestModelFinder; 