'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Typography, CircularProgress, Box } from '@mui/material';

export default function ComparePage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the batch-compare page
    router.replace('/batch-compare');
  }, [router]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h5" component="h1" fontWeight="bold">
          リダイレクト中...
        </Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          一括比較ページに移動しています
        </Typography>
      </Box>
    </Container>
  );
} 