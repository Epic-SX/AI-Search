import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import ThemeRegistry from '@/components/ThemeRegistry'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Box, Container } from '@mui/material'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI商品検索システム',
  description: 'AIを活用した商品検索・比較システム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <ThemeRegistry>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header />
            <Container 
              component="main" 
              sx={{ 
                flexGrow: 1, 
                pt: 2, // 40px in MUI's spacing
                pb: 5,  // 40px in MUI's spacing
                px: 2   // 16px padding on left and right
              }}
            >
              {children}
            </Container>
            <Footer />
            <ToastContainer position="bottom-right" />
          </Box>
        </ThemeRegistry>
      </body>
    </html>
  )
} 