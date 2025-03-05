'use client';

import { useState } from 'react';
import { Card, CardContent, CardMedia, Typography, Box, Button } from '@mui/material';
import { FaExternalLinkAlt } from 'react-icons/fa';
import { ProductInfo } from '@/types';

// Define a reliable fallback image URL
const FALLBACK_IMAGE = "https://placehold.co/300x300/eee/999?text=No+Image";

interface ProductCardProps {
  product: ProductInfo;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  
  const handleImageError = () => {
    setImageError(true);
  };
  
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardMedia
        component="img"
        height="200"
        image={imageError ? FALLBACK_IMAGE : (product.image_url || FALLBACK_IMAGE)}
        alt={product.title}
        onError={handleImageError}
        sx={{ objectFit: 'contain', p: 2 }}
      />
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" component="div" gutterBottom noWrap>
          {product.title}
        </Typography>
        <Typography variant="h5" color="primary" gutterBottom>
          ¥{product.price ? product.price.toLocaleString() : '0'}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {product.store || product.shop || '不明なショップ'}
          </Typography>
          {(product as any).rating && (
            <Typography variant="body2" color="text.secondary">
              評価: {(product as any).rating}
            </Typography>
          )}
        </Box>
        
        {(product as any).shipping_fee !== undefined && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            送料: {(product as any).shipping_fee === 0 ? '無料' : `¥${(product as any).shipping_fee.toLocaleString()}`}
          </Typography>
        )}
        
        <Box sx={{ mt: 'auto' }}>
          <Button
            component="a"
            href={product.url}
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
  );
} 