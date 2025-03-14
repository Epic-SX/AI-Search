'use client';

import React, { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);
  
  // Process the image URL when the component mounts or imageUrl changes
  useEffect(() => {
    console.log(`SimpleAmazonImage received URL: ${imageUrl}`);
    setImageError(false);
    setLoading(true);
  }, [imageUrl]);
  
  // Handle image loading error
  const handleImageError = () => {
    console.error(`Failed to load Amazon image: ${imageUrl}`);
    setImageError(true);
    setLoading(false);
  };
  
  const handleImageLoad = () => {
    console.log(`Successfully loaded Amazon image: ${imageUrl}`);
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
        <FaAmazon size={48} color="#FF9900" />
      </div>
    );
  }
  
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
          <FaAmazon size={24} color="#FF9900" />
        </div>
      )}
      <img 
        src={processAmazonImageUrl(imageUrl)}
        alt={title || 'Amazon Product'}
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