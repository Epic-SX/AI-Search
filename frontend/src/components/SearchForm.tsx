import React, { useState } from 'react';
import { enhanceKeywords } from '../api';
import { 
  Card, 
  CardContent, 
  Tabs, 
  Tab, 
  TextField, 
  Button, 
  Typography, 
  Box,
  CircularProgress,
  Alert,
  Snackbar,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton
} from '@mui/material';
import { Search as SearchIcon, Upload as UploadIcon, Download as DownloadIcon, Preview as PreviewIcon } from '@mui/icons-material';

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

interface SearchFormProps {
  onSearch: (query: string, directSearch: boolean) => Promise<void>;
  onBatchSearch: (queries: string[], useAI: boolean, directSearch: boolean) => Promise<void>;
  onBestModelSearch: (modelNumbers: string[], criteriaPrompt: string) => Promise<void>;
  onFileUpload: (file: File) => Promise<void>;
  isLoading?: boolean;
}

export default function SearchForm({ 
  onSearch, 
  onBatchSearch, 
  onBestModelSearch,
  onFileUpload, 
  isLoading = false 
}: SearchFormProps) {
  const [query, setQuery] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useAIEnhancement, setUseAIEnhancement] = useState(false);
  const useDirectSearch = true;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewKeywords, setPreviewKeywords] = useState<{original: string, enhanced: string}[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [bestModelInput, setBestModelInput] = useState('');
  const [criteriaPrompt, setCriteriaPrompt] = useState('');

  // Default prompt template
  const defaultPrompt = `下記の商品名、型番、仕様情報から重要なキーワードを組み合わせて表現を変えて
類似品を検索しやすいように検索キーワードを作成してください。
商品の情報や特徴を組み合わせて重要な検索キーワードを１個抽出してください。
出力は商品名＋商品の特徴＋サイズや重量は近いものでお願いします。
既存のメーカーを選定しないように、メーカー名、型番は記載しないようにお願いします。
英語の場合は日本語に翻訳してください。

型番 {model_number}

最適な検索キーワードを1つだけ出力してください。余計な説明は不要です。`;

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    // Reset search results when switching tabs
    if (newValue === 1) {
      // If switching to batch search tab, reset single search results
      if (onSearch) {
        // Pass empty string to reset the search results
        // This is a hack to clear the results without actually performing a search
        onSearch('', false);
      }
    } else if (newValue === 2) {
      // If switching to best model finder tab, reset other search results
      if (onSearch) {
        onSearch('', false);
      }
      if (onBatchSearch) {
        onBatchSearch([], false, false);
      }
    } else {
      // If switching to single search tab, reset batch search results
      if (onBatchSearch) {
        // Pass empty array to reset the search results
        onBatchSearch([], false, false);
      }
      // Also reset best model search results
      if (onBestModelSearch) {
        onBestModelSearch([], '');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query || !query.trim()) {
      setError('検索する型番を入力してください');
      return;
    }
    console.log(`DEBUG: Submitting search for "${query.trim()}" with directSearch=${useDirectSearch}`);
    onSearch(query.trim(), useDirectSearch);
  };

  const handleBatchSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if there's any input
    if (!batchInput || !batchInput.trim()) {
      setError('検索する型番を入力してください');
      return;
    }
    
    // Split and clean the input
    const productList = batchInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
      
    // Check if there are any valid lines after filtering
    if (productList.length === 0) {
      setError('検索する型番を入力してください');
      return;
    }
    
    if (productList.length > 1000) {
      setError('一度に検索できる型番は1000個までです');
      return;
    }
    
    // Proceed with the search
    onBatchSearch(productList, useAIEnhancement, useDirectSearch);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // ファイルサイズチェック (5MB以下)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('ファイルサイズは5MB以下にしてください');
        return;
      }
      
      // ファイル拡張子チェック
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
      if (fileExt !== 'txt' && fileExt !== 'csv') {
        setError('TXTまたはCSVファイルのみアップロード可能です');
        return;
      }
      
      setFile(selectedFile);
      
      // ファイルを読み込む
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          setBatchInput(event.target.result);
        }
      };
      reader.onerror = () => {
        setError('ファイルの読み込みに失敗しました');
      };
      reader.readAsText(selectedFile);
      
      // ファイルをAPIにアップロード
      onFileUpload(selectedFile);
    }
  };

  const handleCloseError = () => {
    setError(null);
  };

  const handlePreviewKeywords = async () => {
    try {
      // Check if there's any input
      if (!batchInput || !batchInput.trim()) {
        setError('検索する型番を入力してください');
        return;
      }

      // Split input by new lines and filter out empty lines
      const inputLines = batchInput
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      // Check if there are any valid lines after filtering
      if (inputLines.length === 0) {
        setError('検索する型番を入力してください');
        return;
      }
      
      if (inputLines.length > 1000) {
        setError('一度に処理できる型番は1000個までです');
        return;
      }

      setPreviewLoading(true);
      setPreviewOpen(true);
      
      // Process each line to extract model numbers
      const modelNumbers = inputLines.map(line => line.trim());
      
      try {
        // Call the API to enhance keywords with custom prompt if enabled
        const enhancedKeywords = await enhanceKeywords(
          modelNumbers, 
          showCustomPrompt && customPrompt ? customPrompt : undefined
        );
        
        // Map the original inputs with their enhanced keywords
        const keywordPairs = modelNumbers.map((original, index) => ({
          original,
          enhanced: enhancedKeywords[index] || original
        }));
        
        setPreviewKeywords(keywordPairs);
      } catch (error) {
        console.error('Error enhancing keywords:', error);
        setError('キーワードの生成中にエラーが発生しました');
        
        // Create fallback pairs using the original input
        const fallbackPairs = modelNumbers.map(original => ({
          original,
          enhanced: original
        }));
        
        setPreviewKeywords(fallbackPairs);
      } finally {
        setPreviewLoading(false);
      }
    } catch (error) {
      console.error('Error in preview:', error);
      setError('プレビュー処理中にエラーが発生しました');
      setPreviewLoading(false);
    }
  };

  const handleExportKeywords = () => {
    if (previewKeywords.length === 0) return;
    
    // Create CSV content with headers
    let csvContent = "型番,最適化キーワード\n";
    
    // Add each row of data
    previewKeywords.forEach(item => {
      // Clean up the model number - remove numbering if present
      const cleanedOriginal = item.original.replace(/^\d+\s+/, '').trim();
      csvContent += `${cleanedOriginal},${item.enhanced}\n`;
    });
    
    // Add UTF-8 BOM to ensure Excel recognizes the encoding correctly
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;
    
    // Create a blob and download link
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'enhanced_keywords.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSearchWithEnhanced = () => {
    if (previewKeywords.length === 0) return;
    
    // Extract just the enhanced keywords for search
    const enhancedKeywordsList = previewKeywords.map(item => item.enhanced);
    
    // Close the preview dialog
    setPreviewOpen(false);
    
    // Perform the search with enhanced keywords
    onBatchSearch(enhancedKeywordsList, true, false);
  };

  const handleBestModelSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if there's any input
    if (!bestModelInput || !bestModelInput.trim()) {
      setError('検索する型番を入力してください');
      return;
    }
    
    if (!criteriaPrompt || !criteriaPrompt.trim()) {
      setError('検索条件を入力してください');
      return;
    }
    
    // Split and clean the input
    const modelNumbers = bestModelInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
      
    // Check if there are any valid lines after filtering
    if (modelNumbers.length === 0) {
      setError('検索する型番を入力してください');
      return;
    }
    
    if (modelNumbers.length < 2) {
      setError('少なくとも2つの型番を入力してください');
      return;
    }
    
    if (modelNumbers.length > 100) {
      setError('一度に検索できる型番は100個までです');
      return;
    }
    
    // Proceed with the search
    onBestModelSearch(modelNumbers, criteriaPrompt);
  };

  return (
    <Card>
      <CardContent>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="search tabs"
          variant="fullWidth"
        >
          <Tab label="単一検索" id="search-tab-0" aria-controls="search-tabpanel-0" />
          <Tab label="一括検索" id="search-tab-1" aria-controls="search-tabpanel-1" />
          <Tab label="最適なモデル検索" id="search-tab-2" aria-controls="search-tabpanel-2" />
        </Tabs>
        
        {error && (
          <Snackbar open={!!error} autoHideDuration={6000} onClose={handleCloseError}>
            <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
              {error}
            </Alert>
          </Snackbar>
        )}
        
        <TabPanel value={tabValue} index={0}>
          <form onSubmit={handleSubmit}>
            <TextField
              label="商品名や型番を入力"
              variant="outlined"
              fullWidth
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
              sx={{ mb: 2 }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={isLoading ? <CircularProgress size={24} color="inherit" /> : <SearchIcon />}
                disabled={isLoading}
              >
                検索
              </Button>
            </Box>
          </form>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <form onSubmit={handleBatchSearch}>
            <TextField
              label="複数の商品名や型番を入力（1行に1つ）"
              multiline
              rows={6}
              variant="outlined"
              fullWidth
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              disabled={isLoading}
              sx={{ mb: 2 }}
            />
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Button
                component="label"
                variant="outlined"
                startIcon={<UploadIcon />}
                sx={{ mr: 2 }}
                disabled={isLoading}
              >
                ファイルをアップロード
                <input
                  type="file"
                  hidden
                  onChange={handleFileUpload}
                  accept=".txt,.csv"
                />
              </Button>
              
              <Typography variant="body2" color="text.secondary">
                TXTまたはCSVファイル（1行に1つの型番）
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={useAIEnhancement}
                    onChange={(e) => setUseAIEnhancement(e.target.checked)}
                    disabled={isLoading}
                  />
                }
                label="AIによる検索キーワード最適化"
              />
              
              {useAIEnhancement && (
                <Button
                  variant="outlined"
                  startIcon={<PreviewIcon />}
                  onClick={handlePreviewKeywords}
                  disabled={isLoading || !batchInput.trim()}
                >
                  キーワードをプレビュー
                </Button>
              )}
            </Box>
            
            {useAIEnhancement && (
              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showCustomPrompt}
                      onChange={(e) => setShowCustomPrompt(e.target.checked)}
                      disabled={isLoading}
                    />
                  }
                  label="カスタムプロンプトを使用"
                />
                
                {showCustomPrompt && (
                  <TextField
                    label="カスタムプロンプト"
                    multiline
                    rows={4}
                    variant="outlined"
                    fullWidth
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    disabled={isLoading}
                    placeholder={defaultPrompt}
                    sx={{ mt: 2 }}
                  />
                )}
              </Box>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={isLoading ? <CircularProgress size={24} color="inherit" /> : <SearchIcon />}
                disabled={isLoading || !batchInput.trim()}
              >
                一括検索
              </Button>
            </Box>
          </form>
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <form onSubmit={handleBestModelSearch}>
            <TextField
              label="複数の型番を入力（1行に1つ）"
              multiline
              rows={6}
              variant="outlined"
              fullWidth
              value={bestModelInput}
              onChange={(e) => setBestModelInput(e.target.value)}
              disabled={isLoading}
              placeholder="例：
EA628W-25B
EA715SE-10
EA628PP-35"
              sx={{ mb: 2 }}
            />
            
            <TextField
              label="検索条件"
              multiline
              rows={4}
              variant="outlined"
              fullWidth
              value={criteriaPrompt}
              onChange={(e) => setCriteriaPrompt(e.target.value)}
              disabled={isLoading}
              placeholder="例：最も軽量で、かつ防水機能があるモデルを選んでください。"
              sx={{ mb: 2 }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={isLoading ? <CircularProgress size={24} color="inherit" /> : <SearchIcon />}
                disabled={isLoading || !bestModelInput.trim() || !criteriaPrompt.trim()}
              >
                最適なモデルを検索
              </Button>
            </Box>
          </form>
        </TabPanel>
        
        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>AIによる検索キーワードのプレビュー</DialogTitle>
          <DialogContent>
            {previewLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <List>
                  {previewKeywords.map((item, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemText
                          primary={item.enhanced}
                          secondary={`元の入力: ${item.original}`}
                        />
                      </ListItem>
                      {index < previewKeywords.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewOpen(false)}>閉じる</Button>
            <Button 
              onClick={handleExportKeywords} 
              startIcon={<DownloadIcon />}
              disabled={previewKeywords.length === 0}
            >
              CSVでエクスポート
            </Button>
            <Button 
              onClick={handleSearchWithEnhanced} 
              variant="contained" 
              color="primary"
              startIcon={<SearchIcon />}
              disabled={previewKeywords.length === 0}
            >
              これらのキーワードで検索
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
} 