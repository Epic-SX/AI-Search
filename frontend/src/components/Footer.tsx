import { Box, Container, Typography, Link as MuiLink } from '@mui/material';

export default function Footer() {
  return (
    <Box 
      component="footer" 
      sx={{ 
        bgcolor: 'white',
        color: 'text.primary',
        py: 3,
        borderTop: 1,
        borderColor: 'divider',
        mt: 'auto',
        width: '100%'
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' }, 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Typography variant="body2" sx={{ mb: { xs: 2, md: 0 } }}>
            &copy; {new Date().getFullYear()} AI商品検索システム. All rights reserved.
          </Typography>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <MuiLink href="#" color="inherit" underline="hover" variant="body2">
              利用規約
            </MuiLink>
            <MuiLink href="#" color="inherit" underline="hover" variant="body2">
              プライバシーポリシー
            </MuiLink>
            <MuiLink href="#" color="inherit" underline="hover" variant="body2">
              お問い合わせ
            </MuiLink>
          </Box>
        </Box>
      </Container>
    </Box>
  );
} 