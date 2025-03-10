'use client';

import { useState, useRef } from 'react';
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
import { Search as SearchIcon, Image as ImageIcon, CloudUpload as CloudUploadIcon, Delete as DeleteIcon } from '@mui/icons-material';

interface ImageSearchFormProps {
  onSearch: (formData: FormData | { image_url: string }) => Promise<void>;
  onBatchSearch?: (formData: FormData[] | { image_urls: string[] }) => Promise<void>;
  isLoading?: boolean;
}

export default function ImageSearchForm({ onSearch, onBatchSearch, isLoading = false }: ImageSearchFormProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'single' | 'batch'>('single');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchMode === 'single') {
      if (file) {
        // ファイルがある場合はFormDataを使用
        const formData = new FormData();
        formData.append('image', file);
        onSearch(formData);
      } else if (imageUrl) {
        // URLがある場合はJSONを使用
        onSearch({ image_url: imageUrl });
      } else {
        setError('画像ファイルまたは画像URLを入力してください');
      }
    } else if (searchMode === 'batch' && onBatchSearch) {
      if (files.length > 0) {
        // 複数ファイルの場合
        const formDataArray = files.map(file => {
          const formData = new FormData();
          formData.append('image', file);
          return formData;
        });
        onBatchSearch(formDataArray);
      } else if (imageUrls.length > 0) {
        // 複数URLの場合
        onBatchSearch({ image_urls: imageUrls });
      } else {
        setError('画像ファイルまたは画像URLを入力してください');
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;
    
    if (searchMode === 'single') {
      handleFile(uploadedFiles[0]);
    } else {
      // Handle multiple files for batch mode
      Array.from(uploadedFiles).forEach(file => {
        handleBatchFile(file);
      });
    }
  };

  const handleFile = (file: File) => {
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
    
    setFile(file);
    
    // Create preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    
    // URLフィールドをクリア
    setImageUrl('');
  };
  
  const handleBatchFile = (file: File) => {
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
      if (searchMode === 'single') {
        handleFile(e.dataTransfer.files[0]);
      } else {
        // Handle multiple files for batch mode
        Array.from(e.dataTransfer.files).forEach(file => {
          handleBatchFile(file);
        });
      }
    }
  };
  
  const handleCloseError = () => {
    setError(null);
  };
  
  const handleModeChange = (_: React.SyntheticEvent, newMode: 'single' | 'batch') => {
    setSearchMode(newMode);
    
    // Reset state when changing modes
    if (newMode === 'single') {
      setFiles([]);
      setImageUrls([]);
    } else {
      setFile(null);
      setPreviewUrl('');
      setImageUrl('');
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          画像検索
        </Typography>
        
        <Tabs
          value={searchMode}
          onChange={handleModeChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          sx={{ mb: 3 }}
        >
          <Tab value="single" label="単一検索" />
          <Tab value="batch" label="一括検索" />
        </Tabs>
        
        <Box component="form" onSubmit={handleSearch}>
          {searchMode === 'single' ? (
            // Single search mode
            <>
              <TextField
                fullWidth
                id="imageUrl"
                label="画像URL"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  if (file) {
                    setFile(null);
                    setPreviewUrl('');
                  }
                }}
                margin="normal"
                disabled={isLoading}
                helperText="画像のURLを入力するか、下のエリアに画像をアップロードしてください"
              />
              
              <Divider sx={{ my: 3 }}>または</Divider>
              
              <Paper
                sx={{
                  border: '2px dashed',
                  borderColor: isDragging ? 'primary.main' : 'divider',
                  borderRadius: 2,
                  p: 3,
                  mb: 3,
                  textAlign: 'center',
                  backgroundColor: isDragging ? 'rgba(3, 169, 244, 0.04)' : 'background.paper',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1
                }}
                onDragEnter={!isLoading ? handleDragEnter : undefined}
                onDragLeave={!isLoading ? handleDragLeave : undefined}
                onDragOver={!isLoading ? handleDragOver : undefined}
                onDrop={!isLoading ? handleDrop : undefined}
                onClick={!isLoading ? () => fileInputRef.current?.click() : undefined}
              >
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  disabled={isLoading}
                />
                <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  ここに画像をドラッグするか
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<ImageIcon />}
                  component="span"
                  disabled={isLoading}
                >
                  ファイルをアップロード
                </Button>
                {file && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {file.name}
                  </Typography>
                )}
              </Paper>
              
              {previewUrl && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    プレビュー
                  </Typography>
                  <Box 
                    component="img" 
                    src={previewUrl} 
                    alt="Preview" 
                    sx={{ 
                      width: 300,
                      height: 300,
                      objectFit: 'cover',
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1
                    }}
                  />
                </Box>
              )}
            </>
          ) : (
            // Batch search mode
            <>
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  id="batchImageUrl"
                  label="画像URL"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  margin="normal"
                  disabled={isLoading}
                />
                <Button
                  variant="outlined"
                  onClick={handleAddImageUrl}
                  disabled={isLoading || !imageUrl.trim()}
                  sx={{ mt: 1 }}
                >
                  URLを追加
                </Button>
                
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
              </Box>
              
              <Divider sx={{ my: 3 }}>または</Divider>
              
              <Paper
                sx={{
                  border: '2px dashed',
                  borderColor: isDragging ? 'primary.main' : 'divider',
                  borderRadius: 2,
                  p: 3,
                  mb: 3,
                  textAlign: 'center',
                  backgroundColor: isDragging ? 'rgba(3, 169, 244, 0.04)' : 'background.paper',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1
                }}
                onDragEnter={!isLoading ? handleDragEnter : undefined}
                onDragLeave={!isLoading ? handleDragLeave : undefined}
                onDragOver={!isLoading ? handleDragOver : undefined}
                onDrop={!isLoading ? handleDrop : undefined}
                onClick={!isLoading ? () => batchFileInputRef.current?.click() : undefined}
              >
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  multiple
                  ref={batchFileInputRef}
                  onChange={handleImageUpload}
                  disabled={isLoading}
                />
                <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  ここに複数の画像をドラッグするか
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<ImageIcon />}
                  component="span"
                  disabled={isLoading}
                >
                  複数ファイルをアップロード
                </Button>
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
            </>
          )}
          
          <Button 
            type="submit" 
            variant="contained" 
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
            size="large"
            fullWidth
            disabled={isLoading || (
              searchMode === 'single' 
                ? (!imageUrl && !file)
                : (imageUrls.length === 0 && files.length === 0)
            )}
            sx={{ mt: 2 }}
          >
            {isLoading 
              ? '検索中...' 
              : searchMode === 'single' 
                ? '画像で検索' 
                : '一括検索 (複数画像)'}
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
      </CardContent>
    </Card>
  );
} 