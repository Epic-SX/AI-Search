'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  Typography, 
  Box, 
  Divider,
  Paper,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Grid,
  Chip,
  Stack
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Image as ImageIcon, 
  CloudUpload as CloudUploadIcon, 
  Delete as DeleteIcon,
  ContentPaste as ContentPasteIcon 
} from '@mui/icons-material';
import { analyzeImageWithPerplexity } from '@/api';

interface ImageSearchFormProps {
  onSearch: (formData: FormData | { image_url: string }) => Promise<void>;
  onBatchSearch?: (formData: FormData[] | { image_urls: string[], enhanced_data?: any[] }) => Promise<void>;
  isLoading?: boolean;
}

export default function ImageSearchForm({ onSearch, onBatchSearch, isLoading = false }: ImageSearchFormProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasClipboardImage, setHasClipboardImage] = useState(false);
  const [searchMode, setSearchMode] = useState<'single' | 'batch'>('batch');
  const [loading, setLoading] = useState(false);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const batchDropAreaRef = useRef<HTMLDivElement>(null);

  // Check clipboard for images
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.read) {
          const items = await navigator.clipboard.read();
          const hasImage = items.some(item => 
            item.types.some(type => type.startsWith('image/'))
          );
          setHasClipboardImage(hasImage);
        }
      } catch (error) {
        // Clipboard API might throw if permission is denied or for security reasons
        // Just ignore and don't show the indicator
        setHasClipboardImage(false);
      }
    };

    // Check initially
    checkClipboard();

    // Set up an interval to check periodically
    const intervalId = setInterval(checkClipboard, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const handleBatchFile = useCallback((file: File) => {
    // ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルのみアップロード可能です');
      return;
    }
    
    // ファイルサイズチェック (5MB以下)
    if (file.size > 5 * 1024 * 1024) {
      setError('ファイルサイズは5MB以下にしてください');
      return;
    }
    
    // Add to files array if not already included
    setFiles(prevFiles => {
      if (prevFiles.some(f => f.name === file.name && f.size === file.size)) {
        return prevFiles;
      }
      return [...prevFiles, file];
    });
  }, [setError, setFiles]);

  // Add event listener for paste events
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (loading) return;
      
      // Skip if the target is an input or textarea element
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement
      ) {
        // Only handle paste if the input is not for image URL
        const targetId = (e.target as HTMLElement).id;
        if (targetId === 'imageUrl' || targetId === 'batchImageUrl') {
          return;
        }
      }
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
      
      if (imageItems.length === 0) return;
      
      // Prevent default paste behavior
      e.preventDefault();
      
      // Always handle as batch mode
      const pastedCount = imageItems.length;
      imageItems.forEach((item, index) => {
        const blob = item.getAsFile();
        if (blob) {
          const pastedFile = new File([blob], `pasted-image-${Date.now()}-${index}.${blob.type.split('/')[1] || 'png'}`, {
            type: blob.type
          });
          handleBatchFile(pastedFile);
        }
      });
      setSuccess(`${pastedCount}枚の画像が貼り付けられました`);
    };
    
    // Add the event listener to the document
    document.addEventListener('paste', handlePaste);
    
    // Clean up
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [loading, handleBatchFile]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Always use batch mode
    if (onBatchSearch) {
      if (files.length > 0) {
        // 複数ファイルの場合
        const formDataArray = files.map(file => {
          const formData = new FormData();
          formData.append('image', file);
          return formData;
        });
        
        setLoading(true);
        try {
          // First analyze each image with Perplexity to get better keywords
          const enhancedFormDataArray = [];
          for (const formData of formDataArray) {
            try {
              const result = await analyzeImageWithPerplexity(formData);
              if (result && (result.model_number || result.product_name)) {
                // Create a new form data with the enhanced info
                const enhancedFormData = new FormData();
                // Get the original file from the original formData
                const file = formData.get('image') as File;
                if (file) {
                  enhancedFormData.append('image', file);
                }
                // Add enhanced data as custom fields
                enhancedFormData.append('enhanced_model_number', result.model_number);
                enhancedFormData.append('enhanced_product_name', result.product_name);
                enhancedFormData.append('enhanced_jan_code', result.jan_code);
                enhancedFormData.append('enhanced_keywords', JSON.stringify(result.additional_keywords));
                
                enhancedFormDataArray.push(enhancedFormData);
              } else {
                // If enhancement failed, use the original form data
                enhancedFormDataArray.push(formData);
              }
            } catch (error) {
              console.error('Error enhancing image with Perplexity:', error);
              // If enhancement failed, use the original form data
              enhancedFormDataArray.push(formData);
            }
          }
          
          // Now search with the enhanced form data
          await onBatchSearch(enhancedFormDataArray);
        } catch (error) {
          console.error('Error during enhanced search:', error);
          setError('画像分析中にエラーが発生しました');
        } finally {
          setLoading(false);
        }
      } else if (imageUrls.length > 0) {
        // 複数URLの場合
        setLoading(true);
        try {
          // First analyze each image URL with Perplexity to get better keywords
          const enhancedImageUrls = [];
          for (const url of imageUrls) {
            try {
              const result = await analyzeImageWithPerplexity({ image_url: url });
              if (result && (result.model_number || result.product_name)) {
                // Add enhanced data to the URL
                enhancedImageUrls.push({
                  url,
                  enhanced_model_number: result.model_number,
                  enhanced_product_name: result.product_name,
                  enhanced_jan_code: result.jan_code,
                  enhanced_keywords: result.additional_keywords
                });
              } else {
                // If enhancement failed, use the original URL
                enhancedImageUrls.push({ url });
              }
            } catch (error) {
              console.error('Error enhancing image URL with Perplexity:', error);
              // If enhancement failed, use the original URL
              enhancedImageUrls.push({ url });
            }
          }
          
          // Now search with the enhanced image URLs
          await onBatchSearch({ image_urls: enhancedImageUrls.map(item => item.url), enhanced_data: enhancedImageUrls });
        } catch (error) {
          console.error('Error during enhanced URL search:', error);
          setError('画像URL分析中にエラーが発生しました');
        } finally {
          setLoading(false);
        }
      } else {
        setError('画像ファイルまたは画像URLを入力してください');
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;
    
    // Always handle as batch mode
    Array.from(uploadedFiles).forEach(file => {
      handleBatchFile(file);
    });
  };

  const handleAddImageUrl = () => {
    if (!imageUrl.trim()) {
      setError('画像URLを入力してください');
      return;
    }
    
    // Add URL to the list if not already included
    setImageUrls(prevUrls => {
      if (prevUrls.includes(imageUrl)) {
        return prevUrls;
      }
      return [...prevUrls, imageUrl];
    });
    
    // Clear the input field
    setImageUrl('');
  };
  
  const handleRemoveFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };
  
  const handleRemoveUrl = (index: number) => {
    setImageUrls(prevUrls => prevUrls.filter((_, i) => i !== index));
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Always handle as batch mode
      Array.from(e.dataTransfer.files).forEach(file => {
        handleBatchFile(file);
      });
    }
  };
  
  const handleCloseError = () => {
    setError(null);
  };
  
  const handleCloseSuccess = () => {
    setSuccess(null);
  };
  
  // Focus handler for the drop area
  const handleBatchDropAreaFocus = () => {
    if (batchDropAreaRef.current) {
      batchDropAreaRef.current.focus();
    }
  };

  // Add a new handler for bulk URL pasting
  const handleBulkUrlPaste = () => {
    try {
      navigator.clipboard.readText().then(text => {
        // Check if text contains multiple lines or URLs
        const urls = text.split(/[\n,]+/).map(url => url.trim()).filter(url => {
          // Basic URL validation - check if it's likely an image URL
          return url.startsWith('http') && 
            (url.match(/\.(jpeg|jpg|gif|png|webp)/i) || 
             url.includes('images') || 
             url.includes('img') || 
             url.includes('photo'));
        });
        
        if (urls.length > 0) {
          // Add all valid URLs to the imageUrls array
          setImageUrls(prevUrls => {
            const newUrls = [...prevUrls];
            urls.forEach(url => {
              if (!newUrls.includes(url)) {
                newUrls.push(url);
              }
            });
            return newUrls;
          });
          
          setSuccess(`${urls.length}枚の画像URLを追加しました`);
        } else {
          setError('有効な画像URLが見つかりませんでした');
        }
      });
    } catch (error) {
      console.error('Error accessing clipboard:', error);
      setError('クリップボードの読み取りに失敗しました');
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          画像検索
        </Typography>
        
        <Box component="form" onSubmit={handleSearch}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              一括検索
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              複数の画像URLを入力するか、複数の画像をアップロードして一括検索できます
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', mb: 2 }}>
            <Paper 
              variant="outlined"
              sx={{ 
                display: 'flex', 
                width: '100%',
                overflow: 'hidden',
                borderRight: 'none' // Remove right border to blend with button
              }}
            >
              <TextField
                id="batchImageUrl"
                label="画像URL"
                fullWidth
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                InputProps={{
                  endAdornment: (
                    <Button
                      onClick={handleAddImageUrl}
                      variant="contained"
                      color="primary"
                      disabled={!imageUrl.trim() || loading}
                      sx={{ mr: -1 }}
                    >
                      追加
                    </Button>
                  ),
                }}
                sx={{ 
                  '& .MuiOutlinedInput-notchedOutline': { 
                    border: 'none' // Remove TextField border
                  }
                }}
              />
            </Paper>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleBulkUrlPaste}
              startIcon={<ContentPasteIcon />}
              disabled={loading}
              title="クリップボードから複数URLを貼り付け"
              sx={{ 
                whiteSpace: 'nowrap',
                minWidth: '90px',
                height: '56px', // Match the height of the TextField
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0
              }}
            >
              一括貼付
            </Button>
          </Box>
          
          {imageUrls.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                追加されたURL ({imageUrls.length})
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
                {imageUrls.map((url, index) => (
                  <Chip
                    key={index}
                    label={url.length > 30 ? url.substring(0, 30) + '...' : url}
                    onDelete={() => handleRemoveUrl(index)}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          )}
          
          <Paper
            ref={batchDropAreaRef}
            tabIndex={0}
            sx={{
              border: '2px dashed',
              borderColor: isDragging ? 'primary.main' : 'divider',
              borderRadius: 2,
              p: 3,
              mb: 3,
              mt: 3,
              textAlign: 'center',
              backgroundColor: isDragging ? 'rgba(3, 169, 244, 0.04)' : 'background.paper',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              '&:focus': {
                outline: 'none',
                boxShadow: '0 0 0 2px rgba(3, 169, 244, 0.5)',
              }
            }}
            onDragEnter={!loading ? handleDragEnter : undefined}
            onDragLeave={!loading ? handleDragLeave : undefined}
            onDragOver={!loading ? handleDragOver : undefined}
            onDrop={!loading ? handleDrop : undefined}
            onClick={!loading ? () => batchFileInputRef.current?.click() : undefined}
            onKeyDown={(e) => {
              if (!loading && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                batchFileInputRef.current?.click();
              }
            }}
          >
            <input
              type="file"
              accept="image/*"
              hidden
              multiple
              ref={batchFileInputRef}
              onChange={handleImageUpload}
              disabled={loading}
            />
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              ここに複数の画像をドラッグするか
            </Typography>
            <Button
              variant="outlined"
              startIcon={<ImageIcon />}
              component="span"
              disabled={loading}
            >
              複数ファイルをアップロード
            </Button>
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ContentPasteIcon 
                fontSize="small" 
                color={hasClipboardImage ? "primary" : "action"} 
                sx={{ 
                  mr: 1,
                  animation: hasClipboardImage ? 'pulse 1.5s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.6 },
                    '100%': { opacity: 1 },
                  }
                }} 
              />
              <Typography variant="body2" color={hasClipboardImage ? "primary" : "text.secondary"}>
                または、クリップボードから画像を貼り付け <Box component="span" sx={{ 
                  bgcolor: hasClipboardImage ? 'primary.50' : 'grey.100', 
                  px: 0.7, 
                  py: 0.3, 
                  borderRadius: 1, 
                  border: '1px solid', 
                  borderColor: hasClipboardImage ? 'primary.200' : 'grey.300', 
                  fontSize: '0.75rem',
                  fontFamily: 'monospace'
                }}>Ctrl+V</Box>
              </Typography>
            </Box>
          </Paper>
          
          {files.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                アップロードされたファイル ({files.length})
              </Typography>
              <Grid container spacing={2}>
                {files.map((file, index) => (
                  <Grid item xs={6} sm={4} md={3} key={index}>
                    <Box sx={{ position: 'relative' }}>
                      <Box 
                        component="img" 
                        src={URL.createObjectURL(file)} 
                        alt={file.name}
                        sx={{ 
                          width: '100%',
                          height: 150,
                          objectFit: 'cover',
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1
                        }}
                      />
                      <IconButton
                        size="small"
                        sx={{ 
                          position: 'absolute', 
                          top: 5, 
                          right: 5,
                          bgcolor: 'rgba(255,255,255,0.8)',
                          '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.9)',
                          }
                        }}
                        onClick={() => handleRemoveFile(index)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                      <Typography variant="caption" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                        {file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
          
          <Button 
            type="submit" 
            variant="contained" 
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
            size="large"
            fullWidth
            disabled={loading || (imageUrls.length === 0 && files.length === 0)}
            sx={{ mt: 2 }}
          >
            {loading ? '検索中...' : '一括検索 (複数画像)'}
          </Button>
        </Box>
        
        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={handleCloseError}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
        
        <Snackbar 
          open={!!success} 
          autoHideDuration={3000} 
          onClose={handleCloseSuccess}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseSuccess} severity="success" sx={{ width: '100%' }}>
            {success}
          </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
} 