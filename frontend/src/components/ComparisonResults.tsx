import { useState } from 'react';
import { ComparisonResult } from '@/types';
import { FaExternalLinkAlt, FaCheckCircle, FaTimesCircle, FaInfoCircle } from 'react-icons/fa';
import { Box, Typography, Grid, Card, CardContent, CardMedia, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Button } from '@mui/material';
import SimpleRakutenImage from './SimpleRakutenImage';

// Define a reliable fallback image URL
const FALLBACK_IMAGE = "https://placehold.co/300x300/eee/999?text=No+Image";

interface ComparisonResultsProps {
  result: ComparisonResult;
}

export default function ComparisonResults({ result }: ComparisonResultsProps) {
  const [imageErrorA, setImageErrorA] = useState(false);
  const [imageErrorB, setImageErrorB] = useState(false);
  
  const getSignificanceColor = (significance: 'high' | 'medium' | 'low') => {
    switch (significance) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  // Check if a product is from Rakuten
  const isRakutenProduct = (store?: string) => {
    if (!store) return false;
    return store.toLowerCase().includes('rakuten') || store.toLowerCase().includes('楽天');
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                商品A
              </Typography>
              {isRakutenProduct(result.product_a.store) ? (
                <Box sx={{ height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
                  <SimpleRakutenImage
                    imageUrl={result.product_a.image_url || ''}
                    title={result.product_a.title}
                    height={200}
                  />
                </Box>
              ) : (
                <CardMedia
                  component="img"
                  height="200"
                  image={imageErrorA ? FALLBACK_IMAGE : (result.product_a.image_url || FALLBACK_IMAGE)}
                  alt={result.product_a.title}
                  onError={() => setImageErrorA(true)}
                  sx={{ objectFit: 'contain', mb: 2 }}
                />
              )}
              <Typography variant="h6" gutterBottom>
                {result.product_a.title}
              </Typography>
              <Typography variant="h5" color="primary" gutterBottom>
                ¥{(result.product_a.price || 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {result.product_a.store}
              </Typography>
              
              {result.product_a.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {result.product_a.description}
                </Typography>
              )}
              
              <Box sx={{ mt: 2 }}>
                <Button
                  component="a"
                  href={result.product_a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                  fullWidth
                  startIcon={<FaExternalLinkAlt />}
                >
                  商品ページへ
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                商品B
              </Typography>
              {isRakutenProduct(result.product_b.store) ? (
                <Box sx={{ height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
                  <SimpleRakutenImage
                    imageUrl={result.product_b.image_url || ''}
                    title={result.product_b.title}
                    height={200}
                  />
                </Box>
              ) : (
                <CardMedia
                  component="img"
                  height="200"
                  image={imageErrorB ? FALLBACK_IMAGE : (result.product_b.image_url || FALLBACK_IMAGE)}
                  alt={result.product_b.title}
                  onError={() => setImageErrorB(true)}
                  sx={{ objectFit: 'contain', mb: 2 }}
                />
              )}
              <Typography variant="h6" gutterBottom>
                {result.product_b.title}
              </Typography>
              <Typography variant="h5" color="primary" gutterBottom>
                ¥{(result.product_b.price || 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {result.product_b.store}
              </Typography>
              
              {result.product_b.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {result.product_b.description}
                </Typography>
              )}
              
              <Box sx={{ mt: 2 }}>
                <Button
                  component="a"
                  href={result.product_b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                  fullWidth
                  startIcon={<FaExternalLinkAlt />}
                >
                  商品ページへ
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            主な違い
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>カテゴリ</TableCell>
                  <TableCell>商品A</TableCell>
                  <TableCell>商品B</TableCell>
                  <TableCell>重要度</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.differences.map((diff, index) => (
                  <TableRow key={index}>
                    <TableCell>{diff.category}</TableCell>
                    <TableCell>{diff.product_a_value}</TableCell>
                    <TableCell>{diff.product_b_value}</TableCell>
                    <TableCell>
                      <Chip 
                        label={diff.significance.charAt(0).toUpperCase() + diff.significance.slice(1)} 
                        color={getSignificanceColor(diff.significance) as any}
                        size="small"
                        icon={<FaInfoCircle />}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
      
      {result.recommendation && (
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              おすすめ
            </Typography>
            <Typography variant="body1">
              {result.recommendation}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
} 