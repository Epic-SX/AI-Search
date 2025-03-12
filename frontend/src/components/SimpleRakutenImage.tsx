'use client';

import { useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';

interface SimpleRakutenImageProps {
  imageUrl: string;
  title?: string;
  height?: number | string;
  width?: number | string;
}

// Define a reliable fallback image URL
const FALLBACK_IMAGE = "https://placehold.co/300x300/BF0000/FFFFFF?text=Rakuten+Product";

// Rakuten image domain patterns
const RAKUTEN_IMAGE_DOMAINS = [
  'thumbnail.image.rakuten.co.jp',
  'shop.r10s.jp',
  'tshop.r10s.jp',
  'r.r10s.jp',
  'www.rakuten.co.jp',
  'rakuten.co.jp',
  'image.rakuten.co.jp'
];

export default function SimpleRakutenImage({ imageUrl, title, height = 200, width = '100%' }: SimpleRakutenImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [finalImageUrl, setFinalImageUrl] = useState<string>(imageUrl || FALLBACK_IMAGE);
  
  // Function to check if a URL is a Rakuten image
  const isRakutenImage = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return RAKUTEN_IMAGE_DOMAINS.some(domain => urlObj.hostname.includes(domain));
    } catch {
      return false;
    }
  };
  
  // Function to process Rakuten image URLs
  const processRakutenImageUrl = (url: string): string => {
    if (!url || url.includes('placehold.co')) {
      return FALLBACK_IMAGE;
    }
    
    // Convert http to https if needed
    let processedUrl = url;
    if (processedUrl.startsWith('http:')) {
      processedUrl = processedUrl.replace('http:', 'https:');
    }
    
    // Add size parameter if needed
    if (!processedUrl.includes('_ex=') && !processedUrl.includes('?_ex=')) {
      processedUrl = `${processedUrl}${processedUrl.includes('?') ? '&' : '?'}_ex=300x300`;
    }
    
    console.log(`Processed Rakuten image URL: ${processedUrl}`);
    return processedUrl;
  };
  
  // Effect to update the image URL when props change
  useEffect(() => {
    if (imageUrl) {
      console.log(`SimpleRakutenImage - Setting image URL: ${imageUrl}`);
      
      // Check if the image URL is valid
      const isValidUrl = imageUrl.startsWith('http') && 
        (isRakutenImage(imageUrl) || imageUrl.includes('rakuten'));
      
      if (isValidUrl) {
        setFinalImageUrl(processRakutenImageUrl(imageUrl));
        setError(false);
        setLoading(true);
      } else {
        console.log(`SimpleRakutenImage - Invalid Rakuten image URL: ${imageUrl}`);
        setFinalImageUrl(FALLBACK_IMAGE);
        setLoading(false);
      }
    } else {
      setFinalImageUrl(FALLBACK_IMAGE);
      setLoading(false);
    }
  }, [imageUrl]);
  
  // Handle image loading success
  const handleImageLoad = () => {
    console.log(`SimpleRakutenImage - Image loaded successfully: ${finalImageUrl}`);
    setLoading(false);
  };
  
  // Handle image loading error
  const handleImageError = () => {
    console.log(`SimpleRakutenImage - Image loading failed: ${finalImageUrl}`);
    setError(true);
    setLoading(false);
  };
  
  // If no image URL, show fallback
  if (!finalImageUrl) {
    return (
      <Box 
        sx={{ 
          width, 
          height, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          bgcolor: '#f5f5f5'
        }}
      >
        <div style={{ textAlign: 'center', padding: '10px' }}>
          {title ? title.substring(0, 30) : 'No Image Available'}
        </div>
      </Box>
    );
  }
  
  return (
    <Box 
      sx={{ 
        width, 
        height, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        position: 'relative'
      }}
    >
      {loading && (
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            zIndex: 1
          }}
        >
          <CircularProgress size={24} color="error" />
        </Box>
      )}
      
      {error ? (
        <Box 
          sx={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            bgcolor: '#f5f5f5'
          }}
        >
          <div style={{ textAlign: 'center', padding: '10px' }}>
            {title ? title.substring(0, 30) : 'Image Failed to Load'}
          </div>
        </Box>
      ) : (
        <img
          src={finalImageUrl}
          alt={title || 'Rakuten Product Image'}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{ 
            maxWidth: '100%', 
            maxHeight: '100%', 
            objectFit: 'contain'
          }}
        />
      )}
    </Box>
  );
} 