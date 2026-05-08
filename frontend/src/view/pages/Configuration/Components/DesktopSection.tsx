import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Switch,
  SxProps,
  TextField,
  Theme,
  Typography,
} from '@mui/material';
import ExpandMoreIcon  from '@mui/icons-material/ExpandMore';
import DashboardIcon   from '@mui/icons-material/Dashboard';
import TabletIcon      from '@mui/icons-material/Tablet';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from 'react-i18next';
import { DesktopActions, DesktopProfileMeta, DesktopProfilesInfo } from '../../../../core/actions/desktop';
import { useConfiguredDialogAlphas } from '../../../../core/context/DialogAlphasContext';

// ── Styles ────────────────────────────────────────────────────────────────────

const sectionBoxStyle: SxProps<Theme> = {
  display:       'flex',
  flexDirection: 'column',
  gap:           '1.5rem',
  padding:       '1.5rem',
};

const rowStyle: SxProps<Theme> = {
  display:        'flex',
  flexDirection:  { xs: 'column', sm: 'row' },
  gap:            '0.75rem',
  alignItems:     'center',
  minWidth:       { xs: '15.5rem', sm: '27rem', md: '50rem' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export const DesktopSection: React.FC = () => {
  const { t }  = useTranslation();
  const alphas = useConfiguredDialogAlphas();

  const [info,       setInfo      ] = React.useState<DesktopProfilesInfo | null>(null);
  const [loading,    setLoading   ] = React.useState(true);
  const [newName,    setNewName   ] = React.useState('');
  const [newTablet,  setNewTablet ] = React.useState(false);
  const [creating,   setCreating  ] = React.useState(false);
  const [activating, setActivating] = React.useState<string | null>(null);
  const [feedback,   setFeedback  ] = React.useState<{ msg: string; ok: boolean } | null>(null);

  // ── Load on mount ────────────────────────────────────────────────────────
  React.useEffect(() => {
    DesktopActions.listProfiles()
      .then(setInfo)
      .catch(() => setFeedback({ msg: t('desktopProfiles.errorLoad'), ok: false }))
      .finally(() => setLoading(false));
  }, [t]);

  // Auto-clear feedback after 3 s
  React.useEffect(() => {
    if (!feedback) return;
    const id = setTimeout(() => setFeedback(null), 3000);
    return () => clearTimeout(id);
  }, [feedback]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleCreate = () => {
    if (!newName.trim()) return;
    setCreating(true);
    DesktopActions.createProfile(newName.trim(), newTablet)
      .then(updated => {
        setInfo(updated);
        setNewName('');
        setNewTablet(false);
        setFeedback({ msg: t('desktopProfiles.createSuccess'), ok: true });
      })
      .catch((err: Error) => {
        const key = err.message === 'already_exists'
          ? 'desktopProfiles.alreadyExists'
          : 'desktopProfiles.createError';
        setFeedback({ msg: t(key), ok: false });
      })
      .finally(() => setCreating(false));
  };

  const handleActivate = (name: string) => {
    setActivating(name);
    DesktopActions.activateProfile(name)
      .then(updated => {
        setInfo(updated);
        setFeedback({ msg: t('desktopProfiles.activateSuccess'), ok: true });
      })
      .catch(() => setFeedback({ msg: t('desktopProfiles.activateError'), ok: false }))
      .finally(() => setActivating(null));
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Accordion sx={{ opacity: alphas.configurationCards, width: '100%' }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <DashboardIcon sx={{ fontSize: '1.1rem' }} />
          <Typography>{t('desktopProfiles.sectionTitle')}</Typography>
        </Box>
      </AccordionSummary>

      <AccordionDetails>
        <Box sx={{ ...sectionBoxStyle, background: `rgba(255,255,255,${alphas.general})` }}>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: '1rem' }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <>
              {/* ── Profile list ──────────────────────────────────────── */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: '0.5rem', fontWeight: 600 }}>
                  {t('desktopProfiles.profiles')}
                </Typography>

                <List disablePadding dense sx={{
                  border: '1px solid', borderColor: 'divider',
                  borderRadius: '6px', overflow: 'hidden',
                }}>
                  {(info?.profiles ?? []).map((profile: DesktopProfileMeta) => {
                    const isActive = profile.name === info?.active;
                    return (
                      <ListItem
                        key={profile.name}
                        divider
                        sx={{ backgroundColor: isActive ? 'rgba(0,255,231,0.07)' : 'transparent' }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <Typography
                                variant="body2"
                                sx={{ fontFamily: 'monospace', fontWeight: isActive ? 700 : 400 }}
                              >
                                {profile.name}
                              </Typography>
                              {isActive && (
                                <Chip
                                  icon={<CheckCircleIcon sx={{ fontSize: '0.9rem !important' }} />}
                                  label={t('desktopProfiles.active')}
                                  size="small" color="success" variant="outlined"
                                  sx={{ height: '1.3rem', fontSize: '0.65rem' }}
                                />
                              )}
                              {profile.tabletMode && (
                                <Chip
                                  icon={<TabletIcon sx={{ fontSize: '0.9rem !important' }} />}
                                  label={t('desktopProfiles.tabletBadge')}
                                  size="small" color="info" variant="outlined"
                                  sx={{ height: '1.3rem', fontSize: '0.65rem' }}
                                />
                              )}
                            </Box>
                          }
                        />
                        {!isActive && (
                          <ListItemSecondaryAction>
                            <Button
                              size="small" variant="outlined"
                              disabled={activating === profile.name}
                              onClick={() => handleActivate(profile.name)}
                              startIcon={
                                activating === profile.name
                                  ? <CircularProgress size={12} color="inherit" />
                                  : undefined
                              }
                              sx={{ minWidth: '6rem', fontSize: '0.72rem' }}
                            >
                              {t('desktopProfiles.activate')}
                            </Button>
                          </ListItemSecondaryAction>
                        )}
                      </ListItem>
                    );
                  })}
                </List>
              </Box>

              {/* ── Create new profile ────────────────────────────────── */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: '0.75rem', fontWeight: 600 }}>
                  {t('desktopProfiles.newProfileTitle')}
                </Typography>

                <Box sx={{ ...rowStyle }}>
                  <TextField
                    label={t('desktopProfiles.newProfileName')}
                    variant="outlined" size="small"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    disabled={creating}
                    sx={{ flexGrow: 1, minWidth: '12rem' }}
                    inputProps={{ maxLength: 40 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={newTablet}
                        onChange={e => setNewTablet(e.target.checked)}
                        disabled={creating}
                        size="small"
                        color="info"
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <TabletIcon sx={{ fontSize: '1rem', color: newTablet ? 'info.main' : 'text.disabled' }} />
                        <Typography variant="body2" sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                          {t('desktopProfiles.tabletModeLabel')}
                        </Typography>
                      </Box>
                    }
                  />
                  <Button
                    variant="contained"
                    disabled={!newName.trim() || creating}
                    onClick={handleCreate}
                    startIcon={creating ? <CircularProgress size={14} color="inherit" /> : undefined}
                    sx={{ minWidth: '7rem', whiteSpace: 'nowrap' }}
                  >
                    {t('desktopProfiles.addProfile')}
                  </Button>
                </Box>

                <Typography variant="caption" sx={{ color: 'text.secondary', mt: '0.4rem', display: 'block' }}>
                  {t('desktopProfiles.nameHint')}
                </Typography>
              </Box>

              {/* ── Feedback message ─────────────────────────────────── */}
              {feedback && (
                <Typography variant="body2" sx={{
                  color: feedback.ok ? 'success.main' : 'error.main',
                  fontFamily: 'monospace', fontSize: '0.8rem',
                }}>
                  {feedback.ok ? '✓' : '✗'} {feedback.msg}
                </Typography>
              )}
            </>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};
