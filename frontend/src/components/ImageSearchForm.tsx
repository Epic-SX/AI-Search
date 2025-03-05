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
  Snackbar
} from '@mui/material';
import { Search as SearchIcon, Image as ImageIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';

interface ImageSearchFormProps {
  onSearch: (formData: FormData | { image_url: string }) => Promise<void>;
  isLoading?: boolean;
}

export default function ImageSearchForm({ onSearch, isLoading = false }: ImageSearchFormProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
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
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
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
      handleFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleCloseError = () => {
    setError(null);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          画像検索
        </Typography>
        
        <Box component="form" onSubmit={handleSearch}>
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
                  maxWidth: '100%', 
                  maxHeight: 300, 
                  objectFit: 'contain',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1
                }}
              />
            </Box>
          )}
          
          <Button 
            type="submit" 
            variant="contained" 
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
            size="large"
            fullWidth
            disabled={isLoading || (!imageUrl && !file)}
            sx={{ mt: 2 }}
          >
            {isLoading ? '検索中...' : '画像で検索'}
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