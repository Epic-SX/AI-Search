'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';

export default function ConnectionTest() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const testConnection = async () => {
    setStatus('loading');
    try {
      // Use the environment variable instead of hardcoding the URL
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/health`);
      const data = await response.json();
      
      if (data.status === 'ok') {
        setStatus('success');
        setMessage('Backend connection successful!');
      } else {
        setStatus('error');
        setMessage('Backend returned unexpected response');
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <Box sx={{ my: 4 }}>
      <Typography variant="h6" gutterBottom>
        Backend Connection Test
      </Typography>
      
      <Button 
        variant="contained" 
        onClick={testConnection}
        disabled={status === 'loading'}
        sx={{ mb: 2 }}
      >
        {status === 'loading' ? 'Testing...' : 'Test Connection'}
      </Button>
      
      {status === 'success' && (
        <Alert severity="success">{message}</Alert>
      )}
      
      {status === 'error' && (
        <Alert severity="error">{message}</Alert>
      )}
    </Box>
  );
} 