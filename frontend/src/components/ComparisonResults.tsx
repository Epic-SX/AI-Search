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
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 3 }}>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h5" gutterBottom sx={{ borderBottom: '2px solid #f0f0f0', pb: 1, fontWeight: 'bold' }}>
                商品A
              </Typography>
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: 200, 
                  mb: 2,
                  backgroundColor: '#f9f9f9',
                  borderRadius: 1,
                  p: 1
                }}
              >
                {isRakutenProduct(result.product_a.store) ? (
                  <SimpleRakutenImage
                    imageUrl={result.product_a.image_url || ''}
                    title={result.product_a.title}
                    height={180}
                  />
                ) : (
                  <CardMedia
                    component="img"
                    height={180}
                    image={imageErrorA ? FALLBACK_IMAGE : (result.product_a.image_url || FALLBACK_IMAGE)}
                    alt={result.product_a.title}
                    onError={() => setImageErrorA(true)}
                    sx={{ objectFit: 'contain' }}
                  />
                )}
              </Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium', lineHeight: 1.3, minHeight: '3.9em' }}>
                {result.product_a.title}
              </Typography>
              <Typography variant="h5" color="primary" gutterBottom sx={{ fontWeight: 'bold', mt: 1 }}>
                ¥{(result.product_a.price || 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
                {result.product_a.store}
              </Typography>
              
              {result.product_a.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxHeight: '100px', overflow: 'auto' }}>
                  {result.product_a.description}
                </Typography>
              )}
              
              <Box sx={{ mt: 'auto', pt: 2 }}>
                <Button
                  component="a"
                  href={result.product_a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                  fullWidth
                  startIcon={<FaExternalLinkAlt />}
                  sx={{ borderRadius: '4px', py: 1 }}
                >
                  商品ページへ
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 3 }}>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h5" gutterBottom sx={{ borderBottom: '2px solid #f0f0f0', pb: 1, fontWeight: 'bold' }}>
                商品B
              </Typography>
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: 200, 
                  mb: 2,
                  backgroundColor: '#f9f9f9',
                  borderRadius: 1,
                  p: 1
                }}
              >
                {isRakutenProduct(result.product_b.store) ? (
                  <SimpleRakutenImage
                    imageUrl={result.product_b.image_url || ''}
                    title={result.product_b.title}
                    height={180}
                  />
                ) : (
                  <CardMedia
                    component="img"
                    height={180}
                    image={imageErrorB ? FALLBACK_IMAGE : (result.product_b.image_url || FALLBACK_IMAGE)}
                    alt={result.product_b.title}
                    onError={() => setImageErrorB(true)}
                    sx={{ objectFit: 'contain' }}
                  />
                )}
              </Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium', lineHeight: 1.3, minHeight: '3.9em' }}>
                {result.product_b.title}
              </Typography>
              <Typography variant="h5" color="primary" gutterBottom sx={{ fontWeight: 'bold', mt: 1 }}>
                ¥{(result.product_b.price || 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
                {result.product_b.store}
              </Typography>
              
              {result.product_b.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxHeight: '100px', overflow: 'auto' }}>
                  {result.product_b.description}
                </Typography>
              )}
              
              <Box sx={{ mt: 'auto', pt: 2 }}>
                <Button
                  component="a"
                  href={result.product_b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                  fullWidth
                  startIcon={<FaExternalLinkAlt />}
                  sx={{ borderRadius: '4px', py: 1 }}
                >
                  商品ページへ
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Card sx={{ mb: 4, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ borderBottom: '2px solid #f0f0f0', pb: 1, fontWeight: 'bold' }}>
            主な違い
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'primary.main' }}>
                  <TableCell sx={{ width: '20%', whiteSpace: 'normal', fontWeight: 'bold', color: 'white', fontSize: '1rem' }}>カテゴリ</TableCell>
                  <TableCell sx={{ width: '35%', whiteSpace: 'normal', fontWeight: 'bold', color: 'white', fontSize: '1rem' }}>商品A</TableCell>
                  <TableCell sx={{ width: '35%', whiteSpace: 'normal', fontWeight: 'bold', color: 'white', fontSize: '1rem' }}>商品B</TableCell>
                  <TableCell sx={{ width: '10%', whiteSpace: 'normal', fontWeight: 'bold', color: 'white', fontSize: '1rem' }}>重要度</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.differences.map((diff, index) => (
                  <TableRow key={index} sx={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f8f8' }}>
                    <TableCell sx={{ whiteSpace: 'normal', fontWeight: 'bold', borderLeft: '4px solid #e0e0e0' }}>{diff.category}</TableCell>
                    <TableCell sx={{ whiteSpace: 'normal', p: 2 }}>{diff.product_a_value}</TableCell>
                    <TableCell sx={{ whiteSpace: 'normal', p: 2 }}>{diff.product_b_value}</TableCell>
                    <TableCell sx={{ whiteSpace: 'normal', p: 2 }}>
                      <Chip 
                        label={diff.significance.charAt(0).toUpperCase() + diff.significance.slice(1)} 
                        color={getSignificanceColor(diff.significance) as any}
                        size="small"
                        icon={<FaInfoCircle />}
                        sx={{ fontWeight: diff.significance === 'high' ? 'bold' : 'normal' }}
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
        <Card sx={{ boxShadow: 3, border: '1px solid #4caf50' }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ borderBottom: '2px solid #f0f0f0', pb: 1, fontWeight: 'bold', color: 'success.main' }}>
              おすすめ
            </Typography>
            <Typography variant="body1" sx={{ p: 1 }}>
              {result.recommendation}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
} 