import { useState } from 'react';
import { 
  Box, Button, TextField, Typography, 
  Paper, IconButton, Tooltip, Grid, Alert
} from '@mui/material';
import { FaPlus, FaTrash, FaFileImport, FaCompressArrowsAlt, FaInfoCircle } from 'react-icons/fa';

interface BatchCompareFormProps {
  onBatchCompare: (productPairs: Array<{ productA: string, productB: string }>) => void;
}

export default function BatchCompareForm({ onBatchCompare }: BatchCompareFormProps) {
  const [productPairs, setProductPairs] = useState<Array<{ productA: string, productB: string }>>([
    { productA: '', productB: '' }
  ]);
  const [csvContent, setCsvContent] = useState('');
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showTips, setShowTips] = useState(true);

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
          </ul>
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit}>
        {productPairs.map((pair, index) => (
          <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth
                label={`商品A ${index + 1}`}
                placeholder="例: EA628W-25B"
                value={pair.productA}
                onChange={(e) => updateProductPair(index, 'productA', e.target.value)}
                size="small"
                helperText={index === 0 ? "正確な型番を入力してください" : ""}
              />
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth
                label={`商品B ${index + 1}`}
                placeholder="例: EA762FA-262"
                value={pair.productB}
                onChange={(e) => updateProductPair(index, 'productB', e.target.value)}
                size="small"
                helperText={index === 0 ? "正確な型番を入力してください" : ""}
              />
            </Grid>
            <Grid item xs={12} sm={2} sx={{ display: 'flex', alignItems: 'center' }}>
              {productPairs.length > 1 && (
                <Tooltip title="この行を削除">
                  <IconButton 
                    color="error" 
                    onClick={() => removeProductPair(index)}
                    size="small"
                  >
                    <FaTrash />
                  </IconButton>
                </Tooltip>
              )}
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
            onClick={() => setShowCsvImport(!showCsvImport)}
            size="small"
          >
            CSVからインポート
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
        
        <Button
          type="submit"
          variant="contained"
          startIcon={<FaCompressArrowsAlt />}
        >
          一括比較する
        </Button>
      </Box>
    </Paper>
  );
} 