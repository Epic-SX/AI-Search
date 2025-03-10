'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardMedia, Typography, Box, Button, Skeleton } from '@mui/material';
import { FaExternalLinkAlt } from 'react-icons/fa';
import { ProductInfo } from '@/types';
import SimpleAmazonImage from './SimpleAmazonImage';

// Define a reliable fallback image URL
const FALLBACK_IMAGE = "https://placehold.co/300x300/eee/999?text=No+Image";
// Store-specific fallback images with better visibility
const AMAZON_FALLBACK = "https://placehold.co/400x400/232F3E/FFFFFF?text=Amazon+Product";
const RAKUTEN_FALLBACK = "https://placehold.co/400x400/BF0000/FFFFFF?text=Rakuten+Product";
const YAHOO_FALLBACK = "https://placehold.co/400x400/6001D2/FFFFFF?text=Yahoo+Product";

// Amazon image domain patterns
const AMAZON_IMAGE_DOMAINS = [
  'images-fe.ssl-images-amazon.com',
  'images-na.ssl-images-amazon.com',
  'm.media-amazon.com',
  'images-amazon.com',
  'amazon.co.jp',
  'amazon.com'
];

// Common Amazon product ASINs for testing
const COMMON_ASINS = [
  'B07PXZNF4C', // Common Amazon product
  'B08L5TNJHG', // Another common product
  'B07ZPKBL9V', // Another common product
  'B07ZPKN2LB'  // Another common product
];

interface ProductCardProps {
  product: ProductInfo;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [extractedAsin, setExtractedAsin] = useState<string | null>(null);
  
  // Function to determine the best fallback image based on store
  const getStoreFallback = () => {
    const storeName = (product.source || product.store || '').toLowerCase();
    if (storeName.includes('amazon')) {
      // Create a custom Amazon fallback with the product title
      const title = product.title || 'Amazon Product';
      const encodedTitle = encodeURIComponent(title.substring(0, 20));
      return `https://placehold.co/400x400/232F3E/FFFFFF?text=${encodedTitle}`;
    }
    if (storeName.includes('rakuten') || storeName.includes('楽天')) return RAKUTEN_FALLBACK;
    if (storeName.includes('yahoo') || storeName.includes('ヤフー')) return YAHOO_FALLBACK;
    return FALLBACK_IMAGE;
  };
  
  // Function to check if a URL is an Amazon image
  const isAmazonImage = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return AMAZON_IMAGE_DOMAINS.some(domain => urlObj.hostname.includes(domain));
    } catch {
      return false;
    }
  };
  
  // Function to extract ASIN from Amazon URL
  const extractAsinFromUrl = (url: string): string | null => {
    if (!url) return null;
    
    // Common ASIN patterns in Amazon URLs
    const patterns = [
      /\/dp\/([A-Z0-9]{10})(?:[/?]|$)/,
      /\/gp\/product\/([A-Z0-9]{10})(?:[/?]|$)/,
      /\/exec\/obidos\/asin\/([A-Z0-9]{10})(?:[/?]|$)/,
      /\/exec\/obidos\/tg\/detail\/-\/([A-Z0-9]{10})(?:[/?]|$)/,
      /\/([A-Z0-9]{10})(?:[/?]|$)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };
  
  // Function to get Amazon image URLs
  const getAmazonImageUrls = (product: ProductInfo): string[] => {
    const urls: string[] = [];
    
    // If we have an image_url, try to extract the image ID
    if (product.image_url) {
      // If it's already a high-quality URL with AC_SL parameters, use it first
      if (product.image_url.includes('._AC_SL')) {
        urls.push(product.image_url);
      }
      
      // Try to extract image ID from the URL
      const idMatch = product.image_url.match(/\/images\/[IP]\/([A-Za-z0-9]+)\./);
      if (idMatch && idMatch[1]) {
        const imageId = idMatch[1];
        // Add high-quality versions
        urls.push(
          `https://m.media-amazon.com/images/I/${imageId}._AC_SL1200_.jpg`,
          `https://m.media-amazon.com/images/I/${imageId}._AC_SL1500_.jpg`,
          `https://m.media-amazon.com/images/I/${imageId}.jpg`
        );
      }
      
      // Add the original URL as a fallback
      if (!urls.includes(product.image_url)) {
        urls.push(product.image_url);
      }
    }
    
    // If we have an ASIN, use it to generate URLs
    const asin = product.asin || extractedAsin;
    if (asin) {
      // Try Amazon Advertising System URLs first (most reliable)
      urls.push(
        `https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&ASIN=${asin}&Format=_SL500_&ID=AsinImage&MarketPlace=US&ServiceVersion=20070822`,
        `https://ws-eu.amazon-adsystem.com/widgets/q?_encoding=UTF8&ASIN=${asin}&Format=_SL500_&ID=AsinImage&MarketPlace=JP&ServiceVersion=20070822`
      );
      
      // Then try direct CDN URLs
      urls.push(
        `https://m.media-amazon.com/images/I/${asin}._AC_SL1200_.jpg`,
        `https://m.media-amazon.com/images/P/${asin}._AC_SL1200_.jpg`,
        `https://images-na.ssl-images-amazon.com/images/I/${asin}._AC_SL1200_.jpg`,
        `https://images-na.ssl-images-amazon.com/images/P/${asin}._AC_SL1200_.jpg`,
        `https://images-fe.ssl-images-amazon.com/images/I/${asin}._AC_SL1200_.jpg`,
        `https://images-fe.ssl-images-amazon.com/images/P/${asin}._AC_SL1200_.jpg`
      );
    }
    
    // Return unique URLs
    return Array.from(new Set(urls));
  };
  
  // Effect to extract ASIN if needed and set up image URL for non-Amazon products
  useEffect(() => {
    // Reset state for non-Amazon products
    if (!(product.source || product.store || '').toLowerCase().includes('amazon')) {
      setImageError(false);
      setImageLoading(true);
    }
    
    // Try to extract ASIN from URL if not provided
    if (!product.asin && product.url) {
      const asin = extractAsinFromUrl(product.url);
      if (asin) {
        console.log(`Extracted ASIN from URL: ${asin}`);
        setExtractedAsin(asin);
      }
    } else {
      setExtractedAsin(null);
    }
    
    // For non-Amazon products
    if (!(product.source || product.store || '').toLowerCase().includes('amazon')) {
      if (product.image_url && !product.image_url.includes('placehold.co')) {
        setImageUrl(product.image_url);
      } else {
        setImageUrl(getStoreFallback());
        setImageLoading(false);
      }
    }
  }, [product]);
  
  // Handle image loading error for non-Amazon products
  const handleImageError = () => {
    console.log(`Image error for product: ${product.title}`);
    setImageError(true);
    setImageLoading(false);
  };
  
  // Handle image loading success for non-Amazon products
  const handleImageLoad = () => {
    console.log(`Image loaded successfully: ${imageUrl}`);
    setImageLoading(false);
  };
  
  // Determine if this is an Amazon product
  const isAmazonProduct = (product.source || product.store || '').toLowerCase().includes('amazon');
  
  // Determine the final image URL to display for non-Amazon products
  const displayImageUrl = imageError ? getStoreFallback() : (imageUrl || FALLBACK_IMAGE);
  
  // Log the product data for debugging
  console.log('ProductCard - Product data:', {
    title: product.title,
    asin: product.asin || extractedAsin,
    image_url: product.image_url,
    isAmazonProduct
  });
  
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {isAmazonProduct ? (
        <Box sx={{ height: 200, p: 2 }}>
          <SimpleAmazonImage 
            imageUrl={product.image_url || ''}
            title={product.title}
            height="100%"
          />
        </Box>
      ) : (
        imageLoading ? (
          <Skeleton 
            variant="rectangular" 
            height={200} 
            animation="wave" 
            sx={{ m: 2 }} 
          />
        ) : (
          <CardMedia
            component="img"
            height={200}
            image={displayImageUrl}
            alt={product.title || 'Product Image'}
            onError={handleImageError}
            onLoad={handleImageLoad}
            sx={{ objectFit: 'contain', p: 2 }}
          />
        )
      )}
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" component="div" gutterBottom noWrap>
          {product.title}
        </Typography>
        <Typography variant="h5" color="primary" gutterBottom>
          ¥{product.price ? product.price.toLocaleString() : '0'}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {product.source || product.store || product.shop || '不明なショップ'}
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
        
        <Box>
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