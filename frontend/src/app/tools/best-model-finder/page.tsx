'use client';

import React from 'react';
import { Container, Box, Typography } from '@mui/material';
import BestModelFinder from '@/components/BestModelFinder';
import Breadcrumbs from '@/components/Breadcrumbs';

export default function BestModelFinderPage() {
  const breadcrumbItems = [
    { label: 'ホーム', href: '/' },
    { label: 'ツール', href: '/tools' },
    { label: '条件に最適なモデル検索' }
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Breadcrumbs items={breadcrumbItems} />
        
        <Typography variant="h4" component="h1" gutterBottom>
          条件に最適なモデル検索
        </Typography>
        
        <Typography variant="body1" paragraph>
          複数の型番から指定した条件に最も合致するモデルを検索します。
          Perplexity AIを使用して、各モデルの情報を分析し、条件に最適なモデルを選定します。
        </Typography>
        
        <BestModelFinder />
      </Box>
    </Container>
  );
} 