// Sección de los diálogos de propiedades: descarga los favicons que faltan.
// Solo actúa sobre los enlaces sin favicon (de todos los escritorios); los que
// ya tienen uno no se tocan. Se aplica al momento, sin esperar a "Guardar".

import React from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DesktopConfig } from '../../../core/actions/desktop';

export type RefreshMissingFavicons = (
  onProgress?: (done: number, total: number) => void,
) => Promise<{ updated: number; total: number }>;

interface Props {
  config:    DesktopConfig;
  onRefresh: RefreshMissingFavicons;
}

export const DesktopMissingFaviconsSection: React.FC<Props> = ({ config, onRefresh }) => {
  const missing = (config.links ?? []).filter(l => !l.favicon).length;
  const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null);
  const [result,   setResult  ] = React.useState<string | null>(null);

  const run = () => {
    setResult(null);
    setProgress({ done: 0, total: missing });
    onRefresh((done, total) => setProgress({ done, total }))
      .then(({ updated, total }) => {
        const failed = total - updated;
        setResult(
          `${updated} de ${total} favicon${total !== 1 ? 's' : ''} actualizado${updated !== 1 ? 's' : ''}` +
          (failed > 0 ? ` · ${failed} sin conseguir (¿página no disponible?)` : ''),
        );
      })
      .catch(() => setResult('Error al actualizar los favicons'))
      .finally(() => setProgress(null));
  };

  const running = progress !== null;

  return (
    <>
      <Typography variant="subtitle2" sx={{
        mb: 1.5, fontWeight: 600, textTransform: 'uppercase',
        fontSize: '0.72rem', color: 'text.secondary', letterSpacing: '0.05em',
      }}>
        Favicons de los enlaces
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          size="small"
          disabled={running || missing === 0}
          onClick={run}
          startIcon={running
            ? <CircularProgress size={14} color="inherit" />
            : <RefreshIcon fontSize="small" />}
          sx={{ textTransform: 'none' }}
        >
          {running
            ? `Actualizando… ${progress!.done} / ${progress!.total}`
            : 'Actualizar favicons que faltan'}
        </Button>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {result ?? (missing === 0
            ? 'Todos los enlaces tienen favicon'
            : `${missing} enlace${missing !== 1 ? 's' : ''} sin favicon`)}
        </Typography>
      </Box>
    </>
  );
};
