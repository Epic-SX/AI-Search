'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import { 
  Search as SearchIcon, 
  Image as ImageIcon, 
  CompareArrows as CompareIcon,
  Build as BuildIcon 
} from '@mui/icons-material';

export default function Header() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + '/');
  };
  
  return (
    <AppBar position="static" color="default" elevation={1} sx={{ backgroundColor: 'white' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          <Typography
            variant="h6"
            component={Link}
            href="/"
            sx={{ 
              fontWeight: 'bold', 
              color: 'primary.main',
              textDecoration: 'none',
              flexGrow: 1
            }}
          >
            AI商品検索
          </Typography>
          
          <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
            <Button 
              component={Link} 
              href="/search"
              startIcon={<SearchIcon />}
              sx={{ 
                mx: 1,
                fontWeight: isActive('/search') ? 'bold' : 'normal',
                color: isActive('/search') ? 'primary.main' : 'inherit',
                borderBottom: isActive('/search') ? '2px solid' : 'none',
                borderRadius: 0,
                pb: 0.5
              }}
            >
              単一検索
            </Button>
            <Button 
              component={Link} 
              href="/image-search"
              startIcon={<ImageIcon />}
              sx={{ 
                mx: 1,
                fontWeight: isActive('/image-search') ? 'bold' : 'normal',
                color: isActive('/image-search') ? 'primary.main' : 'inherit',
                borderBottom: isActive('/image-search') ? '2px solid' : 'none',
                borderRadius: 0,
                pb: 0.5
              }}
            >
              画像検索
            </Button>
            <Button 
              component={Link} 
              href="/tools"
              startIcon={<BuildIcon />}
              sx={{ 
                mx: 1,
                fontWeight: isActive('/tools') ? 'bold' : 'normal',
                color: isActive('/tools') ? 'primary.main' : 'inherit',
                borderBottom: isActive('/tools') ? '2px solid' : 'none',
                borderRadius: 0,
                pb: 0.5
              }}
            >
              ツール
            </Button>
            <Button 
              component={Link} 
              href="/compare"
              startIcon={<CompareIcon />}
              sx={{ 
                mx: 1,
                fontWeight: isActive('/compare') ? 'bold' : 'normal',
                color: isActive('/compare') ? 'primary.main' : 'inherit',
                borderBottom: isActive('/compare') ? '2px solid' : 'none',
                borderRadius: 0,
                pb: 0.5
              }}
            >
              商品比較
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
} 