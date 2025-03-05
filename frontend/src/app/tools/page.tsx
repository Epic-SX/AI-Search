'use client';

import React from 'react';
import { Container, Typography, Box, Grid, Card, CardContent, CardActions, Button } from '@mui/material';
import Link from 'next/link';
import { Tune as TuneIcon, FindInPage as FindIcon } from '@mui/icons-material';

export default function ToolsPage() {
  const tools = [
    {
      title: '一括キーワード生成',
      description: '複数の型番から最適な検索キーワードを一括で生成します。',
      icon: <TuneIcon fontSize="large" />,
      link: '/tools/batch-keywords'
    },
    {
      title: '条件に最適なモデル検索',
      description: '複数の型番から指定した条件に最も合致するモデルを検索します。',
      icon: <FindIcon fontSize="large" />,
      link: '/tools/best-model-finder'
    }
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          ツール一覧
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 4 }}>
          商品検索や比較をサポートする様々なツールを提供しています。
        </Typography>
        
        <Grid container spacing={3}>
          {tools.map((tool, index) => (
            <Grid item xs={12} sm={6} md={6} key={index}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    {tool.icon}
                  </Box>
                  <Typography variant="h5" component="h2" gutterBottom align="center">
                    {tool.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tool.description}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Link href={tool.link} passHref style={{ width: '100%' }}>
                    <Button fullWidth variant="contained">
                      使ってみる
                    </Button>
                  </Link>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
} 