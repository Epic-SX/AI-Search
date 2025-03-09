'use client';

import { useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';

interface SimpleAmazonImageProps {
  imageUrl: string;
  title?: string;
  height?: number | string;
  width?: number | string;
}

// Define a reliable fallback image URL
const FALLBACK_IMAGE = "https://placehold.co/300x300/eee/999?text=No+Image";

export default function SimpleAmazonImage({ imageUrl, title, height = 200, width = '100%' }: SimpleAmazonImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [finalImageUrl, setFinalImageUrl] = useState<string>(imageUrl || FALLBACK_IMAGE);
  
  // Effect to update the image URL when props change
  useEffect(() => {
    if (imageUrl) {
      console.log(`SimpleAmazonImage - Setting image URL: ${imageUrl}`);
      
      // Check if the image URL is valid
      const isValidUrl = imageUrl.startsWith('http') && 
        (imageUrl.includes('amazon') || 
         imageUrl.includes('media-amazon') || 
         imageUrl.includes('ssl-images-amazon'));
      
      if (isValidUrl) {
        setFinalImageUrl(imageUrl);
        setError(false);
        setLoading(true);
      } else {
        console.log(`SimpleAmazonImage - Invalid Amazon image URL: ${imageUrl}`);
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
    console.log(`SimpleAmazonImage - Image loaded successfully: ${finalImageUrl}`);
    setLoading(false);
  };
  
  // Handle image loading error
  const handleImageError = () => {
    console.log(`SimpleAmazonImage - Image loading failed: ${finalImageUrl}`);
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
          <CircularProgress size={24} />
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
          alt={title || 'Product Image'}
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