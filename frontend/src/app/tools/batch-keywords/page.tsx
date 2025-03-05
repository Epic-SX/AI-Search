'use client';

import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import BatchKeywordGenerator from '@/components/BatchKeywordGenerator';
import Breadcrumbs from '@/components/Breadcrumbs';

export default function BatchKeywordsPage() {
  const breadcrumbItems = [
    { label: 'ホーム', href: '/' },
    { label: 'ツール', href: '/tools' },
    { label: '一括キーワード生成' }
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Breadcrumbs items={breadcrumbItems} />
        
        <Typography variant="h4" component="h1" gutterBottom>
          一括キーワード生成ツール
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 4 }}>
          複数の型番から最適な検索キーワードを一括で生成するツールです。
          Perplexity AIを使用して、型番から商品の特徴を抽出し、検索に最適なキーワードを生成します。
        </Typography>
        
        <BatchKeywordGenerator />
      </Box>
    </Container>
  );
} 