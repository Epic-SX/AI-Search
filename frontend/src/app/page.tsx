'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Container, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Grid, 
  Tabs, 
  Tab, 
  Button
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Image as ImageIcon, 
  CompareArrows as CompareIcon 
} from '@mui/icons-material';

export default function Home() {
  const [activeTab, setActiveTab] = useState(0);
  const router = useRouter();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    
    // Navigate to the appropriate page based on the selected tab
    if (newValue === 0) {
      router.push('/search');
    } else if (newValue === 1) {
      router.push('/image-search');
    } else if (newValue === 2) {
      router.push('/compare');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" fontWeight="bold" gutterBottom>
          AI商品検索システム
        </Typography>
      </Box>
      
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            centered
            sx={{ mb: 3 }}
          >
            <Tab label="単一検索" />
            <Tab label="画像検索" />
            <Tab label="商品比較" />
          </Tabs>
          
          <Box sx={{ p: 2, textAlign: 'center' }}>
            {activeTab === 0 && (
              <Box>
                <Typography variant="h5" gutterBottom>
                  商品名や型番で検索
                </Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  商品名や型番を入力して、複数のECサイトから最適な商品を見つけましょう。
                </Typography>
                <Button 
                  component={Link}
                  href="/search"
                  variant="contained" 
                  size="large"
                  startIcon={<SearchIcon />}
                >
                  検索ページへ
                </Button>
              </Box>
            )}
            
            {activeTab === 1 && (
              <Box>
                <Typography variant="h5" gutterBottom>
                  画像で商品を検索
                </Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  商品の画像をアップロードして、類似商品を見つけましょう。
                </Typography>
                <Button 
                  component={Link}
                  href="/image-search"
                  variant="contained" 
                  size="large"
                  startIcon={<ImageIcon />}
                >
                  画像検索ページへ
                </Button>
              </Box>
            )}
            
            {activeTab === 2 && (
              <Box>
                <Typography variant="h5" gutterBottom>
                  商品を比較する
                </Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  2つの商品を入力して詳細な比較を行いましょう。
                </Typography>
                <Button 
                  component={Link}
                  href="/compare"
                  variant="contained" 
                  size="large"
                  startIcon={<CompareIcon />}
                >
                  比較ページへ
                </Button>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                単一検索
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                商品名や型番を入力して、複数のECサイトから最適な商品を見つけましょう。
              </Typography>
              <Button 
                component={Link}
                href="/search"
                variant="outlined" 
                fullWidth
                startIcon={<SearchIcon />}
              >
                検索ページへ
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                画像検索
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                商品の画像をアップロードして、類似商品を見つけましょう。
              </Typography>
              <Button 
                component={Link}
                href="/image-search"
                variant="outlined" 
                fullWidth
                startIcon={<ImageIcon />}
              >
                画像検索ページへ
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                商品比較
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                2つの商品を入力して詳細な比較を行いましょう。
              </Typography>
              <Button 
                component={Link}
                href="/compare"
                variant="outlined" 
                fullWidth
                startIcon={<CompareIcon />}
              >
                比較ページへ
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
} 