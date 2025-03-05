'use client';

import { ReactNode, useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '@/theme/theme';

export default function ThemeRegistry({ children }: { children: ReactNode }) {
  // Add client-side only rendering to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only render the children when the component has mounted on the client
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {mounted ? children : <div style={{ visibility: 'hidden' }}>{children}</div>}
    </ThemeProvider>
  );
} 