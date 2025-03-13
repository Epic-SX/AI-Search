'use client';

import { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { SiRakuten } from 'react-icons/si';

// Define a reliable fallback image URL
const FALLBACK_IMAGE = "https://thumbnail.image.rakuten.co.jp/ran/img/default/now_printing.jpg";

// List of alternative Rakuten sample images to try if the main image fails
const ALTERNATIVE_IMAGES = [
  "https://thumbnail.image.rakuten.co.jp/ran/img/1001/0004/580/416/037/858/10010004580416037858_1.jpg",
  "https://thumbnail.image.rakuten.co.jp/ran/img/3001/0004/906/625/597/204/30010004906625597204_1.jpg",
  "https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/8861/9784798158860.jpg",
  "https://thumbnail.image.rakuten.co.jp/@0_mall/rakutenkobo-ebooks/cabinet/4865/2000008384865.jpg"
];

interface SimpleRakutenImageProps {
  imageUrl: string;
  title?: string;
  height?: number;
  width?: number;
}

// Function to process Rakuten image URLs
const processRakutenImageUrl = (url: string): string => {
  // If the URL is empty or a placeholder, use a fallback
  if (!url || url.includes('placehold.co')) {
    console.log(`Using fallback image for empty or placeholder URL: ${url}`);
    return ALTERNATIVE_IMAGES[0]; // Use first alternative instead of default "now_printing"
  }
  
  // If the URL already contains a valid image extension, use it directly
  if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url)) {
    // Just ensure it uses HTTPS
    if (url.startsWith('http:')) {
      return url.replace('http:', 'https:');
    }
    console.log(`Using direct image URL: ${url}`);
    return url;
  }
  
  // Convert http to https if needed
  let processedUrl = url;
  if (processedUrl.startsWith('http:')) {
    processedUrl = processedUrl.replace('http:', 'https:');
  }
  
  // Add size parameter if needed for Rakuten thumbnail images
  if (processedUrl.includes('thumbnail.image.rakuten.co.jp') && 
      !processedUrl.includes('_ex=') && 
      !processedUrl.includes('?_ex=')) {
    processedUrl = `${processedUrl}${processedUrl.includes('?') ? '&' : '?'}_ex=300x300`;
  }
  
  // Fix common issues with Rakuten image URLs
  if (processedUrl.includes('?_ex=128x128') || 
      processedUrl.includes('?_ex=64x64') || 
      processedUrl.includes('?_ex=32x32')) {
    // Replace small size parameters with larger ones
    processedUrl = processedUrl.replace(/\?_ex=\d+x\d+/, '?_ex=300x300');
  }
  
  console.log(`Processed Rakuten image URL: ${processedUrl}`);
  return processedUrl;
};

export default function SimpleRakutenImage({ imageUrl, title, height = 150, width }: SimpleRakutenImageProps) {
  const [imageError, setImageError] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [alternativeIndex, setAlternativeIndex] = useState(-1); // -1 means using the original URL
  
  // Process the image URL when the component mounts or imageUrl changes
  useEffect(() => {
    console.log(`SimpleRakutenImage received URL: ${imageUrl}`);
    setImageError(false);
    setAlternativeIndex(-1);
    
    // Check if the URL is a placeholder
    if (imageUrl && imageUrl.includes('placehold.co')) {
      console.log('Detected placeholder URL, using alternative image');
      setCurrentImageUrl(ALTERNATIVE_IMAGES[0]);
    } else {
      setCurrentImageUrl(processRakutenImageUrl(imageUrl));
    }
  }, [imageUrl]);
  
  // Handle image loading error
  const handleImageError = () => {
    console.error(`Failed to load Rakuten image: ${currentImageUrl}`);
    
    // If the current image is the default "now_printing.jpg", try an alternative
    if (currentImageUrl.includes('now_printing.jpg') || alternativeIndex >= 0) {
      // Try the next alternative image
      const nextIndex = alternativeIndex + 1;
      if (nextIndex < ALTERNATIVE_IMAGES.length) {
        console.log(`Trying alternative Rakuten image ${nextIndex + 1}/${ALTERNATIVE_IMAGES.length}`);
        setAlternativeIndex(nextIndex);
        setCurrentImageUrl(ALTERNATIVE_IMAGES[nextIndex]);
        return;
      }
    }
    
    // If we've tried all alternatives or the original wasn't the default image, show the error state
    setImageError(true);
  };
  
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
        <SiRakuten size={48} color="#BF0000" />
      </Box>
    );
  }
  
  return (
    <Box 
      component="img" 
      src={currentImageUrl} 
      alt={title || 'Rakuten Product'}
      sx={{ 
        maxWidth: width || '100%', 
        maxHeight: height, 
        objectFit: 'contain',
        mb: 1
      }}
      onError={handleImageError}
    />
  );
} 