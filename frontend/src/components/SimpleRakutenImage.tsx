'use client';

import React, { useState, useEffect } from 'react';
import { SiRakuten } from 'react-icons/si';

// Define a reliable fallback image URL
const FALLBACK_IMAGE = "https://thumbnail.image.rakuten.co.jp/@0_mall/rakuten/cabinet/ichiba/app/pc/img/common/logo_rakuten_320x320.png";

// List of alternative Rakuten sample images to use as fallbacks
const ALTERNATIVE_IMAGES = [
  "https://thumbnail.image.rakuten.co.jp/@0_mall/rakuten/cabinet/ichiba/app/pc/img/common/logo_rakuten_320x320.png",
  "https://thumbnail.image.rakuten.co.jp/@0_mall/rakuten24/cabinet/goods/4903301181392_01.jpg",
  "https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/0867/9784088820867.jpg",
  "https://thumbnail.image.rakuten.co.jp/@0_mall/rakuten24/cabinet/e01/4903301176718.jpg"
];

interface SimpleRakutenImageProps {
  imageUrl: string;
  title?: string;
  height?: number;
  width?: number;
}

// Function to process Rakuten image URLs
const processRakutenImageUrl = (url: string): string => {
  console.log(`Processing Rakuten image URL: ${url}`);
  
  // If the URL is empty or a placeholder, use a fallback
  if (!url || url.includes('placehold.co')) {
    console.log(`Using fallback image for empty or placeholder URL: ${url}`);
    return ALTERNATIVE_IMAGES[0];
  }
  
  // If the URL is the default "now_printing.jpg", use an alternative image
  if (url.includes('now_printing.jpg')) {
    console.log(`Detected default "now_printing.jpg" image, using alternative`);
    return ALTERNATIVE_IMAGES[0];
  }
  
  // Clean up the URL - remove any escaped characters
  let processedUrl = url.replace('\\/', '/').replace('\\\\', '\\');
  
  // Remove any double quotes that might be in the URL
  processedUrl = processedUrl.replace(/"/g, '');
  
  // Convert http to https if needed
  if (processedUrl.startsWith('http:')) {
    processedUrl = processedUrl.replace('http:', 'https:');
    console.log(`Converted HTTP to HTTPS: ${processedUrl}`);
  }
  
  // Handle shop.r10s.jp domain (direct shop images)
  if (processedUrl.includes('shop.r10s.jp')) {
    console.log(`Detected shop.r10s.jp domain URL: ${processedUrl}`);
    // For shop.r10s.jp, don't add any parameters - use as is
    return processedUrl;
  }
  
  // Handle Rakuten thumbnail image URLs according to documentation
  // Format: https://thumbnail.image.rakuten.co.jp/@0_mall/[shopname]/cabinet/[folder]/[imagename]
  if (processedUrl.includes('thumbnail.image.rakuten.co.jp')) {
    // For thumbnail URLs, ensure we have a size parameter
    if (!processedUrl.includes('_ex=')) {
      // Add size parameter for better quality
      processedUrl = `${processedUrl}${processedUrl.includes('?') ? '&' : '?'}_ex=300x300`;
      console.log(`Added size parameter: ${processedUrl}`);
    } else if (processedUrl.includes('_ex=128x128') || processedUrl.includes('_ex=64x64')) {
      // Fix common issues with Rakuten image URLs - increase size for better quality
      processedUrl = processedUrl.replace('_ex=128x128', '_ex=300x300').replace('_ex=64x64', '_ex=300x300');
      console.log(`Fixed size parameter: ${processedUrl}`);
    }
  }
  
  // Handle image URLs from Rakuten Item Search API
  // These often come in format with mediumImageUrls or smallImageUrls arrays
  if (processedUrl.includes('image.rakuten.co.jp')) {
    // Ensure we're getting the best quality image
    if (!processedUrl.includes('_ex=')) {
      processedUrl = `${processedUrl}${processedUrl.includes('?') ? '&' : '?'}_ex=300x300`;
      console.log(`Added size parameter to image.rakuten.co.jp URL: ${processedUrl}`);
    }
  }
  
  // Handle r.r10s.jp domain (Rakuten's CDN)
  if (processedUrl.includes('r.r10s.jp')) {
    // These are usually already properly formatted, but ensure they're not using small sizes
    if (processedUrl.includes('_ex=128x128') || processedUrl.includes('_ex=64x64')) {
      processedUrl = processedUrl.replace('_ex=128x128', '_ex=300x300').replace('_ex=64x64', '_ex=300x300');
      console.log(`Fixed size parameter for r.r10s.jp URL: ${processedUrl}`);
    }
  }
  
  // Handle URLs with "now_printing.jpg" (placeholder images)
  if (processedUrl.includes('now_printing.jpg')) {
    // Replace with a default Rakuten product image
    return ALTERNATIVE_IMAGES[0];
  }
  
  // Handle relative URLs (should be rare, but just in case)
  if (processedUrl.startsWith('/')) {
    processedUrl = `https://www.rakuten.co.jp${processedUrl}`;
    console.log(`Converted relative URL to absolute: ${processedUrl}`);
  }
  
  // Log the final URL for debugging
  console.log(`Final processed Rakuten image URL: ${processedUrl}`);
  
  return processedUrl;
};

export default function SimpleRakutenImage({ imageUrl, title, height = 150, width }: SimpleRakutenImageProps) {
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Process the image URL when the component mounts or imageUrl changes
  useEffect(() => {
    console.log(`SimpleRakutenImage received URL: ${imageUrl}`);
    setImageError(false);
    setLoading(true);
  }, [imageUrl]);
  
  // Handle image loading error
  const handleImageError = () => {
    console.error(`Failed to load Rakuten image: ${imageUrl}`);
    setImageError(true);
    setLoading(false);
  };
  
  const handleImageLoad = () => {
    console.log(`Successfully loaded Rakuten image: ${imageUrl}`);
    setLoading(false);
  };
  
  // If there's an error loading the image, show a fallback
  if (imageError) {
    return (
      <div style={{ 
        width: width || '100%', 
        height: height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        marginBottom: '8px'
      }}>
        <SiRakuten size={48} color="#BF0000" />
      </div>
    );
  }
  
  // Use a direct img tag approach for all cases - this is more reliable
  return (
    <div style={{ 
      width: width || '100%', 
      height: height, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      marginBottom: '8px'
    }}>
      {loading && (
        <div style={{ position: 'absolute' }}>
          <SiRakuten size={24} color="#BF0000" />
        </div>
      )}
      <img 
        src={processRakutenImageUrl(imageUrl)}
        alt={title || 'Rakuten Product'}
        style={{ 
          maxWidth: '100%', 
          maxHeight: '100%', 
          objectFit: 'contain'
        }}
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
    </div>
  );
} 