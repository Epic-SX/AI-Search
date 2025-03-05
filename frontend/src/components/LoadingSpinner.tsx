import { CircularProgress, Box } from '@mui/material';

export default function LoadingSpinner() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" py={6}>
      <CircularProgress size={48} />
    </Box>
  );
} 