import { Box, Button, SxProps, TextField, Theme, Typography, useMediaQuery } from "@mui/material";
import React from "react";
import { NotepadActions } from "../../../core/actions/notepad";
import { NotificationsActions } from "../../../core/actions/notifications";
import { TemporalData } from "../../../service/temporalData.service";
import { useConfiguredDialogAlphas } from "../../../core/context/DialogAlphasContext";

/** True on phones and tablets (Android, iPhone, iPad…), false on desktop OSes. */
const useIsMobileOrTablet = (): boolean => {
  const isTouchPointer = useMediaQuery('(pointer: coarse)');
  const isMobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return isTouchPointer || isMobileUA;
};

const formStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
};

const titleStyle = () => ({
  textTransform: 'uppercase',
  color: "white",
  textShadow: `
    -1px -1px 0 black,
    1px -1px 0 black,
    -1px 1px 0 black,
    1px 1px 0 black,
    -1px 0 0 black,
    1px 0 0 black,
    0 -1px 0 black,
    0 1px 0 black
  `,
});

const TELEGRAM_MAX_CHARS = 4096;

const getTextAreaStyle = (alpha: number): SxProps<Theme> => ({
  width: {xs: '15.5rem', sm: '27rem', md: '50rem', lg: '80%'},
  backgroundColor: `rgba(245, 245, 245, ${alpha})`,
})

const downloadText = (text: string) => {
  const blob = new Blob([text], { type: "text/plain"});
  const anchor = document.createElement("a");
  anchor.download = "MyNotes.txt";
  anchor.href = window.URL.createObjectURL(blob);
  anchor.target ="_blank";
  anchor.style.display = "none"; 
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export const Notepad = () => {
  const alphas = useConfiguredDialogAlphas();
  const isMobileOrTablet = useIsMobileOrTablet();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [textData, setTextData] = React.useState<string>(TemporalData.NotepadTextData);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = React.useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = React.useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = React.useState<'idle' | 'uploading' | 'ok' | 'error'>('idle');

  React.useEffect(() => {
    NotificationsActions.getAreNotificationsEnabled().then(isAlertReady => setIsNotificationsEnabled(isAlertReady));
  }, []);

  const sendFile = (file: File) => {
    setUploadStatus('uploading');
    NotepadActions.sendFileToTelegram(file).then(({ isSended }) => {
      setUploadStatus(isSended ? 'ok' : 'error');
      setTimeout(() => setUploadStatus('idle'), 3000);
    }).catch(() => {
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 3000);
    });
  };

  const handleDragOver = (evt: React.DragEvent<HTMLDivElement>) => {
    evt.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (evt: React.DragEvent<HTMLDivElement>) => {
    evt.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (evt: React.DragEvent<HTMLDivElement>) => {
    evt.preventDefault();
    setIsDraggingOver(false);
    const file = evt.dataTransfer.files[0];
    if (!file) return;
    sendFile(file);
  };

  const handleFileInputChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    sendFile(file);
    // Reset input so the same file can be selected again if needed
    evt.target.value = '';
  };

  const setTextNotepad = (text: string) => {
    TemporalData.NotepadTextData = text;
    setTextData(text);
  }

  return <Box sx={formStyle}>
    <Typography variant='h6' sx={titleStyle()}>
      Notepad {isNotificationsEnabled ? undefined : <span>(<span style={{color: 'red'}}>No context in Telegram</span>)</span>}
    </Typography>
    <TextField
      id="outlined-multiline-static"
      label="Mi bloc de notas"
      multiline
      autoFocus
      rows={12}
      sx={getTextAreaStyle(alphas.general)}
      placeholder="Write what you want"
      value={textData}
      inputProps={{ maxLength: TELEGRAM_MAX_CHARS }}
      helperText={
        <Typography
          variant='caption'
          component='span'
          sx={{ color: textData.length >= TELEGRAM_MAX_CHARS ? 'error.main' : textData.length >= TELEGRAM_MAX_CHARS * 0.9 ? 'warning.main' : 'text.secondary' }}
        >
          {textData.length} / {TELEGRAM_MAX_CHARS}
        </Typography>
      }
      onChange={evt => setTextNotepad(evt.target.value)}
      onKeyDown={(evt) => {
        if (evt.key === 'Tab') {
          evt.preventDefault();
          setTextNotepad(`${textData}\t`)
        }
      }}
    />

    {isMobileOrTablet ? (
      /* ── Mobile / tablet: file-picker button ─────────────────────────── */
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                 width: {xs: '15.5rem', sm: '27rem', md: '50rem', lg: '80%'} }}>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />
        <Button
          variant='contained'
          disabled={uploadStatus === 'uploading'}
          sx={{ width: '100%', height: '3.5rem' }}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadStatus === 'uploading' ? '⏳ Enviando...' : '📎 Subir fichero a Telegram'}
        </Button>
        {uploadStatus !== 'idle' && uploadStatus !== 'uploading' && (
          <Typography variant='caption' sx={{ color: uploadStatus === 'ok' ? 'success.main' : 'error.main' }}>
            {uploadStatus === 'ok' ? '✓ Fichero enviado a Telegram' : '✗ Error al enviar (¿bot sin contexto?)'}
          </Typography>
        )}
      </Box>
    ) : (
      /* ── Desktop: drag-and-drop zone ─────────────────────────────────── */
      <Box
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: {xs: '15.5rem', sm: '27rem', md: '50rem', lg: '80%'},
          height: '6rem',
          border: '2px dashed',
          borderColor: isDraggingOver ? 'primary.main' : uploadStatus === 'ok' ? 'success.main' : uploadStatus === 'error' ? 'error.main' : 'grey.500',
          borderRadius: '8px',
          backgroundColor: isDraggingOver
            ? 'rgba(25, 118, 210, 0.08)'
            : uploadStatus === 'ok'
            ? 'rgba(46, 125, 50, 0.08)'
            : uploadStatus === 'error'
            ? 'rgba(211, 47, 47, 0.08)'
            : `rgba(245, 245, 245, ${alphas.general})`,
          transition: 'all 0.2s ease',
          cursor: 'default',
          userSelect: 'none',
        }}
      >
        <Typography variant='body2' sx={{ color: uploadStatus === 'ok' ? 'success.main' : uploadStatus === 'error' ? 'error.main' : uploadStatus === 'uploading' ? 'primary.main' : 'text.secondary', textAlign: 'center' }}>
          {uploadStatus === 'uploading' && '⏳ Enviando a Telegram...'}
          {uploadStatus === 'ok' && '✓ Fichero enviado a Telegram'}
          {uploadStatus === 'error' && '✗ Error al enviar (¿bot sin contexto?)'}
          {uploadStatus === 'idle' && (isDraggingOver ? '📎 Suelta el fichero aquí' : 'Arrastrar aquí para subir a Telegram')}
        </Typography>
      </Box>
    )}
    <Box sx={{ display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '1rem', backgroundColor: `rgba(245, 245, 245, ${alphas.general})`, padding: '.5rem' }}>
      <Button
        variant='outlined'
        sx={{minWidth: '15.5rem'}}
        onClick={() => navigator.clipboard.writeText(textData)}
        >
        Copy
      </Button>
      <Button
        variant='outlined'
        sx={{minWidth: '15.5rem'}}
        onClick={() => setTextNotepad('')}
        >
        Remove
      </Button>
      <Button
        variant='outlined'
        sx={{minWidth: '15.5rem'}}
        onClick={() => downloadText(textData)}
        >
        Download
      </Button>
      <Button
        variant='outlined'
        sx={{minWidth: '15.5rem'}}
        onClick={() => NotepadActions.sendTextToTelegram(textData)}
        >
        Send to Telegram
      </Button>
    </Box>
  </Box>;
}
