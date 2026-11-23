import { Box, SxProps, Tab, Tabs, Theme, Typography } from "@mui/material";
import React from "react";
import { useTranslation } from 'react-i18next';
import { useConfiguredDialogAlphas } from "../../../core/context/DialogAlphasContext";
import { Mp3FolderConverterTab } from "./Mp3FolderConverterTab";
import { Mp3CarUsbTab } from "./Mp3CarUsbTab";
import { MP3_PANEL_WIDTH } from "./Mp3Shared";

const getFormStyle = (alpha: number): SxProps<Theme> => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
  backgroundColor: `rgba(245, 245, 245, ${alpha})`,
  paddingBottom: '2rem',
  paddingTop: '1.5rem',
  paddingX: '1rem',
});

const TAB_STORAGE_KEY = 'ftah.mp3Converter.tab';

const readTab = (): number => {
  try { return localStorage.getItem(TAB_STORAGE_KEY) === '1' ? 1 : 0; } catch { return 0; }
};

export const Mp3Converter = () => {
  const alphas = useConfiguredDialogAlphas();
  const { t } = useTranslation();
  const [tab, setTab] = React.useState<number>(readTab);

  const changeTab = (value: number) => {
    setTab(value);
    try { localStorage.setItem(TAB_STORAGE_KEY, String(value)); } catch { /* sin almacenamiento */ }
  };

  return <Box sx={getFormStyle(alphas.general)}>
    <Typography variant='h6' sx={{ textTransform: 'uppercase' }}>
      {t('mp3.pageTitle')}
    </Typography>

    <Tabs value={tab} onChange={(_, value) => changeTab(value)} variant="fullWidth"
      sx={{ width: MP3_PANEL_WIDTH, maxWidth: '100%', borderBottom: 1, borderColor: 'divider' }}>
      <Tab label={t('mp3.title')} sx={{ textTransform: 'none' }} />
      <Tab label={t('mp3car.tab')} sx={{ textTransform: 'none' }} />
    </Tabs>

    {/* Las dos pestañas se mantienen montadas para no perder el estado ni el log al cambiar. */}
    <Box sx={{ display: tab === 0 ? 'flex' : 'none', width: '100%', justifyContent: 'center' }}>
      <Mp3FolderConverterTab />
    </Box>
    <Box sx={{ display: tab === 1 ? 'flex' : 'none', width: '100%', justifyContent: 'center' }}>
      <Mp3CarUsbTab />
    </Box>
  </Box>;
};
