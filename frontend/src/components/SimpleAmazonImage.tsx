'use client';

import { useState } from 'react';
import { Box } from '@mui/material';
import { FaAmazon } from 'react-icons/fa';

// Define a reliable fallback image URL
const FALLBACK_IMAGE = "https://placehold.co/300x300/232F3E/FF9900?text=Amazon+Product";

interface SimpleAmazonImageProps {
  imageUrl: string;
  title?: string;
  height?: number;
  width?: number;
}

// Function to process Amazon image URLs
const processAmazonImageUrl = (url: string): string => {
  if (!url || url.includes('placehold.co')) {
    return FALLBACK_IMAGE;
  }
  
  // Convert http to https if needed
  let processedUrl = url;
  if (processedUrl.startsWith('http:')) {
    processedUrl = processedUrl.replace('http:', 'https:');
  }
  
  console.log(`Processed Amazon image URL: ${processedUrl}`);
  return processedUrl;
};

export default function SimpleAmazonImage({ imageUrl, title, height = 150, width }: SimpleAmazonImageProps) {
  const [imageError, setImageError] = useState(false);
  
  // Process the image URL
  const processedUrl = processAmazonImageUrl(imageUrl);
  
  // If there's an error loading the image, show a fallback
  if (imageError) {
    return (
      <Box 
        sx={{ 
          width: width || '100%', 
          height: height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: '#f5f5f5',
          mb: 1
        }}
      >
        <FaAmazon size={48} color="#FF9900" />
      </Box>
    );
  }
  
  return (
    <Box 
      component="img" 
      src={processedUrl} 
      alt={title || 'Amazon Product'}
      sx={{ 
        maxWidth: width || '100%', 
        maxHeight: height, 
        objectFit: 'contain',
        mb: 1
      }}
      onError={() => setImageError(true)}
    />
  );
} 