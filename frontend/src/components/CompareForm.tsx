import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  Grid 
} from '@mui/material';
import { CompareArrows as CompareIcon } from '@mui/icons-material';

interface CompareFormProps {
  onCompare: (productA: string, productB: string) => void;
}

export default function CompareForm({ onCompare }: CompareFormProps) {
  const [productA, setProductA] = useState('');
  const [productB, setProductB] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCompare(productA, productB);
  };

  return (
    <Card>
      <CardContent>
        <Grid container component="form" onSubmit={handleSubmit} spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              id="productA"
              label="商品A (型番または商品名)"
              placeholder="例: EA628W-25B"
              value={productA}
              onChange={(e) => setProductA(e.target.value)}
              required
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              id="productB"
              label="商品B (型番または商品名)"
              placeholder="例: EA715SE-10"
              value={productB}
              onChange={(e) => setProductB(e.target.value)}
              required
              margin="normal"
            />
          </Grid>
          <Grid item xs={12}>
            <Button 
              type="submit" 
              variant="contained" 
              startIcon={<CompareIcon />}
              sx={{ mt: 1 }}
            >
              比較する
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
} 