'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { compareProducts } from '@/api';
import { ComparisonResult } from '@/types';
import CompareForm from '@/components/CompareForm';
import ComparisonResults from '@/components/ComparisonResults';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Container, Typography } from '@mui/material';

export default function ComparePage() {
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCompare = async (productA: string, productB: string) => {
    if (!productA.trim() || !productB.trim()) {
      toast.error('比較する2つの商品を入力してください');
      return;
    }

    setLoading(true);
    try {
      const result = await compareProducts(productA, productB);
      setComparisonResult(result);
    } catch (error) {
      toast.error('商品比較中にエラーが発生しました');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 3 }}>
        商品比較
      </Typography>
      
      <CompareForm onCompare={handleCompare} />
      
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {comparisonResult && (
            <ComparisonResults result={comparisonResult} />
          )}
        </>
      )}
    </Container>
  );
} 