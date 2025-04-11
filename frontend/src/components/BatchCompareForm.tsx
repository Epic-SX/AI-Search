import { useState, useRef } from 'react';
import { 
  Box, Button, TextField, Typography, 
  Paper, IconButton, Tooltip, Grid, Alert
} from '@mui/material';
import { FaPlus, FaTrash, FaFileImport, FaCompressArrowsAlt, FaInfoCircle, FaLink } from 'react-icons/fa';

interface BatchCompareFormProps {
  onBatchCompare: (productPairs: Array<{ productA: string, productB: string }>) => void;
}

export default function BatchCompareForm({ onBatchCompare }: BatchCompareFormProps) {
  const [productPairs, setProductPairs] = useState<Array<{ productA: string, productB: string }>>([
    { productA: '', productB: '' }
  ]);
  const [csvContent, setCsvContent] = useState('');
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showTips, setShowTips] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add a new product pair
  const addProductPair = () => {
    setProductPairs([...productPairs, { productA: '', productB: '' }]);
  };

  // Remove a product pair
  const removeProductPair = (index: number) => {
    const newPairs = [...productPairs];
    newPairs.splice(index, 1);
    setProductPairs(newPairs);
  };

  // Update a product pair
  const updateProductPair = (index: number, field: 'productA' | 'productB', value: string) => {
    const newPairs = [...productPairs];
    newPairs[index][field] = value;
    setProductPairs(newPairs);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty pairs
    const validPairs = productPairs.filter(
      pair => pair.productA.trim() !== '' && pair.productB.trim() !== ''
    );
    
    if (validPairs.length === 0) {
      alert('少なくとも1つの有効な商品ペアを入力してください');
      return;
    }
    
    onBatchCompare(validPairs);
  };

  // Import from CSV
  const handleCsvImport = () => {
    try {
      // Parse CSV content
      const lines = csvContent.trim().split('\n');
      const newPairs: Array<{ productA: string, productB: string }> = [];
      
      lines.forEach(line => {
        const [productA, productB] = line.split(',').map(item => item.trim());
        if (productA && productB) {
          newPairs.push({ productA, productB });
        }
      });
      
      if (newPairs.length === 0) {
        alert('有効なCSVデータが見つかりませんでした。形式は "商品A,商品B" の各行です。');
        return;
      }
      
      setProductPairs(newPairs);
      setShowCsvImport(false);
      setCsvContent('');
    } catch (error) {
      console.error('CSV解析エラー:', error);
      alert('CSVデータの解析中にエラーが発生しました');
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
      // Automatically import after file is loaded
      setTimeout(() => {
        handleCsvImport();
      }, 100);
    };
    reader.readAsText(file);
  };

  // Process URLs
  const handleUrlImport = () => {
    if (!urlInput.trim()) {
      alert('URLを入力してください');
      return;
    }

    // Split URLs by line break
    const urls = urlInput.trim().split('\n');
    
    // Create pairs from URLs (each line will be a separate product pair)
    if (urls.length === 1) {
      // If only one URL, add it to the first product
      const newPairs = [...productPairs];
      if (newPairs.length === 0) {
        newPairs.push({ productA: urls[0], productB: '' });
      } else {
        newPairs[0].productA = urls[0];
      }
      setProductPairs(newPairs);
    } else if (urls.length > 1) {
      // If multiple URLs, create pairs or add to existing pairs
      const newPairs: Array<{ productA: string, productB: string }> = [];
      
      for (let i = 0; i < urls.length; i += 2) {
        const productA = urls[i];
        const productB = i + 1 < urls.length ? urls[i + 1] : '';
        newPairs.push({ productA, productB });
      }
      
      setProductPairs(newPairs);
    }
    
    setShowUrlImport(false);
    setUrlInput('');
  };

  // Add empty product pair if there are none
  if (productPairs.length === 0) {
    addProductPair();
  }

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        一括商品比較
      </Typography>
      
      {showTips && (
        <Alert 
          severity="info" 
          sx={{ mb: 3 }}
          onClose={() => setShowTips(false)}
        >
          <Typography variant="subtitle2" gutterBottom>
            入力のヒント:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            <li>型番を正確に入力してください（例: EA628W-25B）</li>
            <li>スペースや特殊文字に注意してください</li>
            <li>複数の商品を比較する場合は、行を追加してください</li>
            <li>CSVからインポートする場合は、各行に「商品A,商品B」の形式で入力してください</li>
            <li>URLを貼り付ける場合は、各行に1つのURLを入力してください</li>
          </ul>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        {productPairs.map((pair, index) => (
          <Grid container key={index} spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={5}>
              <TextField
                fullWidth
                size="small"
                label={`商品A (${index + 1})`}
                value={pair.productA}
                onChange={(e) => updateProductPair(index, 'productA', e.target.value)}
                placeholder="型番または商品名"
              />
            </Grid>
            
            <Grid item xs={5}>
              <TextField
                fullWidth
                size="small"
                label={`商品B (${index + 1})`}
                value={pair.productB}
                onChange={(e) => updateProductPair(index, 'productB', e.target.value)}
                placeholder="型番または商品名"
              />
            </Grid>
            
            <Grid item xs={2} sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title="この行を削除">
                <IconButton 
                  color="error" 
                  onClick={() => removeProductPair(index)}
                  disabled={productPairs.length <= 1}
                >
                  <FaTrash />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        ))}
        
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            type="button"
            variant="outlined"
            startIcon={<FaPlus />}
            onClick={addProductPair}
            size="small"
          >
            商品ペアを追加
          </Button>
          
          <Button
            type="button"
            variant="outlined"
            startIcon={<FaFileImport />}
            onClick={() => {
              // Trigger file input click
              if (fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
            size="small"
          >
            ファイルから読み込む
          </Button>

          <Button
            type="button"
            variant="outlined"
            startIcon={<FaLink />}
            onClick={() => {
              setShowUrlImport(!showUrlImport);
              setShowCsvImport(false);
            }}
            size="small"
          >
            URLから読み込む
          </Button>
          
          <Button
            type="button"
            variant="outlined"
            startIcon={<FaFileImport />}
            onClick={() => {
              setShowCsvImport(!showCsvImport);
              setShowUrlImport(false);
            }}
            size="small"
          >
            CSVテキスト入力
          </Button>
          
          <Tooltip title="入力のヒントを表示">
            <Button
              type="button"
              variant="outlined"
              startIcon={<FaInfoCircle />}
              onClick={() => setShowTips(!showTips)}
              size="small"
              color={showTips ? "primary" : "inherit"}
            >
              ヒント
            </Button>
          </Tooltip>

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".csv,.txt"
            onChange={handleFileUpload}
          />
        </Box>
        
        {showCsvImport && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              CSVフォーマット: 各行に「商品A,商品B」の形式で入力してください
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="EA628W-25B,EA762FA-262&#10;EA983FR-200,EA762FA-262"
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              onClick={handleCsvImport}
              size="small"
            >
              インポート
            </Button>
          </Box>
        )}

        {showUrlImport && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              URLs: 各行に1つのURLを入力してください（奇数行が商品A、偶数行が商品Bとなります）
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="https://www.amazon.co.jp/dp/B08KHFZN1P&#10;https://www.rakuten.co.jp/item/123456"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              onClick={handleUrlImport}
              size="small"
            >
              インポート
            </Button>
          </Box>
        )}
        
        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={productPairs.every(pair => !pair.productA.trim() || !pair.productB.trim())}
          sx={{ mt: 2 }}
        >
          比較を実行
        </Button>
      </form>
    </Paper>
  );
} 