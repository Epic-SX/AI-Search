'use client';

import React, { useState } from 'react';
import { batchGenerateKeywords, KeywordResult } from '@/api';
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
  Switch,
  FormControlLabel,
  Alert,
  IconButton
} from '@mui/material';
import { Search as SearchIcon, Download as DownloadIcon } from '@mui/icons-material';

const BatchKeywordGenerator: React.FC = () => {
  const [modelNumbers, setModelNumbers] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [useCustomPrompt, setUseCustomPrompt] = useState<boolean>(false);
  const [results, setResults] = useState<KeywordResult[]>([]);
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
    
    if (modelNumberList.length > 100) {
      setError('一度に処理できる型番は100個までです');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const results = await batchGenerateKeywords(
        modelNumberList,
        useCustomPrompt ? customPrompt : undefined
      );
      
      setResults(results);
    } catch (err) {
      console.error('Error generating keywords:', err);
      setError('キーワード生成中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (results.length === 0) return;
    
    // Create CSV content with headers
    let csvContent = "型番,最適化キーワード\n";
    
    // Add each row of data
    results.forEach(item => {
      csvContent += `${item.model_number},${item.keyword}\n`;
    });
    
    // Add UTF-8 BOM to ensure Excel recognizes the encoding correctly
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;
    
    // Create a blob and download link
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'generated_keywords.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Default prompt template
  const defaultPrompt = `下記の商品情報から重要なキーワードを組み合わせて表現を変えて
類似品を検索しやすいように検索キーワードを作成してください。
商品の情報や特徴を組み合わせて重要な検索キーワードを１個抽出してください。
出力は商品名＋商品の特徴＋サイズや重量は近いものでお願いします。
既存のメーカーを選定しないように、メーカー名、型番は記載しないようにお願いします。
英語の場合は日本語に翻訳してください。

型番: {model_number}

最適な検索キーワードを1つだけ出力してください。余計な説明は不要です。
出力例: 「精密ピンセット 先端幅広タイプ ステンレス製」`;

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          一括キーワード生成
        </Typography>
        
        <Typography variant="body2" color="textSecondary" paragraph>
          複数の型番から最適な検索キーワードを一括で生成します。
          型番を改行区切りで入力してください。
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
          
          <FormControlLabel
            control={
              <Switch
                checked={useCustomPrompt}
                onChange={(e) => setUseCustomPrompt(e.target.checked)}
                color="primary"
              />
            }
            label="カスタムプロンプトを使用"
          />
          
          {useCustomPrompt && (
            <TextField
              label="カスタムプロンプト"
              multiline
              rows={6}
              fullWidth
              value={customPrompt || defaultPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              variant="outlined"
              margin="normal"
              placeholder={defaultPrompt}
              helperText="プロンプトの中で {model_number} は実際の型番に置き換えられます"
              disabled={loading}
            />
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={loading ? <CircularProgress size={24} /> : <SearchIcon />}
              disabled={loading || !modelNumbers.trim()}
            >
              キーワード生成
            </Button>
          </Box>
        </Box>
        
        {results.length > 0 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                生成結果 ({results.length}件)
              </Typography>
              
              <IconButton 
                color="primary" 
                onClick={handleExportCSV}
                title="CSVとしてエクスポート"
              >
                <DownloadIcon />
              </IconButton>
            </Box>
            
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>型番</TableCell>
                    <TableCell>生成されたキーワード</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>{result.model_number}</TableCell>
                      <TableCell>{result.keyword}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default BatchKeywordGenerator; 