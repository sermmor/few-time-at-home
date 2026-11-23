import { Box, LinearProgress, TextField, Typography } from "@mui/material";
import React from "react";

// Piezas comunes de las pestañas del conversor MP3, para que ambas se vean igual.

export const MP3_PANEL_WIDTH = '40rem';

const padZ = (n: number) => n.toString().padStart(2, '0');
export const formatElapsed = (secs: number) => `${padZ(Math.floor(secs / 60))}:${padZ(secs % 60)}`;

export const shortenFilename = (f: string, max = 50) => f.length > max ? `…${f.slice(-(max - 2))}` : f;

/** Cronómetro: cuenta segundos mientras `running` sea true; se reinicia al pasar de parado a en marcha. */
export const useElapsedSeconds = (running: boolean): number => {
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    if (!running) return;
    const start = Date.now();
    setElapsed(0);
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [running]);
  return elapsed;
};

interface ProgressPanelProps {
  /** Texto en verde cuando ha terminado; si se indica, sustituye a la cabecera. */
  finishedText?: string;
  /** Texto de error en rojo; si se indica, sustituye a la cabecera. */
  errorText?: string;
  filename: string;
  /** Texto a la derecha de la cabecera (tiempo, "fichero X/Y", etc.). */
  rightText: string;
  value: number;
  indeterminate?: boolean;
  footerLeft?: string;
  footerRight?: string;
}

export const Mp3ProgressPanel = ({ finishedText, errorText, filename, rightText, value, indeterminate, footerLeft, footerRight }: ProgressPanelProps) => {
  const isEnded = !!finishedText || !!errorText;
  return <Box sx={{ width: MP3_PANEL_WIDTH, maxWidth: '100%' }}>
    {finishedText ? (
      <Typography variant="body2" sx={{ mb: 0.5, color: 'success.main', fontWeight: 600 }}>{finishedText}</Typography>
    ) : errorText ? (
      <Typography variant="body2" sx={{ mb: 0.5, color: 'error.main', fontWeight: 600 }}>{errorText}</Typography>
    ) : (
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
        <Typography variant="caption" title={filename}
          sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          🎵 {shortenFilename(filename)}
        </Typography>
        <Typography variant="caption" sx={{ ml: 1, whiteSpace: 'nowrap', color: 'text.secondary' }}>
          {rightText}
        </Typography>
      </Box>
    )}

    <LinearProgress
      variant={indeterminate && !isEnded ? 'indeterminate' : 'determinate'}
      value={value}
      sx={{ height: 8, borderRadius: 4 }}
      color={finishedText ? 'success' : errorText ? 'error' : 'primary'}
    />

    {!isEnded && (footerLeft || footerRight) && (
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.25 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{footerLeft}</Typography>
        <Typography variant="caption">{footerRight}</Typography>
      </Box>
    )}
  </Box>;
};

/** Área de log de solo lectura que se desplaza sola hasta la última línea. */
export const Mp3LogArea = ({ label, value }: { label: string; value: string }) => {
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);
  React.useEffect(() => {
    if (inputRef.current) inputRef.current.scrollTop = inputRef.current.scrollHeight;
  }, [value]);
  return <TextField label={label} multiline rows={8} value={value} inputRef={inputRef}
    InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
    sx={{ width: MP3_PANEL_WIDTH, maxWidth: '100%' }} />;
};
