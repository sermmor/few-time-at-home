import React, { useState } from "react";
import {
  Box, Button, TextField, Typography,
  SxProps, Theme, Accordion, AccordionSummary, AccordionDetails,
  CircularProgress,
} from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';
import { synchronizeActions } from "../../../../core/actions/synchronize";
import { useConfiguredDialogAlphas } from "../../../../core/context/DialogAlphasContext";

const getSynchronizeSectionStyle = (alpha: number): SxProps<Theme> => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'left',
  justifyContent: 'initial',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
  marginBottom: '2rem',
  padding: '1rem',
  color: 'rgb(30, 30, 30)',
  backgroundColor: `rgba(245, 245, 245, ${alpha})`,
});

interface SynchronizeSectionProps {
  synchronizeUrl: string;
  setSynchronizeUrl: (url: string) => void;
}

type SyncStatus = 'idle' | 'loading' | 'done';

export const SynchronizeSection: React.FC<SynchronizeSectionProps> = ({
  synchronizeUrl,
  setSynchronizeUrl,
}) => {
  const alphas = useConfiguredDialogAlphas();
  const { t } = useTranslation();
  const [status,  setStatus]  = useState<SyncStatus>('idle');
  const [message, setMessage] = useState('');

  const handleDownload = () => {
    setStatus('loading');
    setMessage('');
    synchronizeActions.downloadData(synchronizeUrl)
      .then(res => {
        setStatus('done');
        setMessage(res.message ?? t('sync.success'));
      })
      .catch(() => {
        setStatus('done');
        setMessage(t('sync.error'));
      });
  };

  const isLoading = status === 'loading';
  const isError   = status === 'done' && message.startsWith('❌');

  return (
    <Accordion sx={{ opacity: alphas.configurationCards }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>{t('sync.sectionTitle')}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={getSynchronizeSectionStyle(alphas.general)}>
          <Typography variant='h6' sx={{ textTransform: 'uppercase' }}>
            {t('sync.syncAllData')}
          </Typography>
          <Typography variant='body2' sx={{ color: 'rgb(80, 80, 80)' }}>
            {t('sync.description')}
          </Typography>
          <TextField
            label={t('sync.urlLabel')}
            variant="standard"
            value={synchronizeUrl}
            sx={{ minWidth: { xs: '15.5rem', sm: '5rem', md: '30rem' } }}
            onChange={evt => setSynchronizeUrl(evt.target.value)}
            disabled={isLoading}
          />
          <Button
            variant='contained'
            sx={{ minWidth: '15.5rem' }}
            onClick={handleDownload}
            disabled={isLoading || !synchronizeUrl}
            startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {isLoading ? t('sync.syncing') : t('sync.download')}
          </Button>
          {status === 'done' && (
            <Typography
              variant='body2'
              sx={{ color: isError ? 'error.main' : 'success.main', fontWeight: 500 }}
            >
              {message}
            </Typography>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};
