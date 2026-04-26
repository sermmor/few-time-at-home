import React from 'react';
import { Alert, Box, Button } from '@mui/material';

interface FetchErrorBannerProps {
  /** Error message to display. Defaults to a generic server connectivity message. */
  message?: string;
  /** When provided, a "Reintentar" button appears that calls this callback. */
  onRetry?: () => void;
}

/**
 * Reusable error banner for useEffect fetch failures.
 * Renders an MUI error Alert with an optional retry button.
 */
export const FetchErrorBanner: React.FC<FetchErrorBannerProps> = ({
  message = 'No se pudieron cargar los datos. Comprueba la conexión con el servidor.',
  onRetry,
}) => (
  <Box sx={{ width: '100%', mb: 2 }}>
    <Alert
      severity="error"
      action={
        onRetry ? (
          <Button color="inherit" size="small" onClick={onRetry}>
            Reintentar
          </Button>
        ) : undefined
      }
    >
      {message}
    </Alert>
  </Box>
);
