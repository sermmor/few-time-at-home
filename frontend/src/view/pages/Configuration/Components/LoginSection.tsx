import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { ConfigurationDataZipped } from '../../../../data-model/configuration';
import { ConfigurationSaveButton } from './ConfigurationSaveButton';
import { useConfiguredDialogAlphas } from '../../../../core/context/DialogAlphasContext';
import { AuthActions } from '../../../../core/actions/auth';

const CYAN      = '#00ffe7';
const CYAN_DIM  = 'rgba(0,255,231,0.55)';
const CYAN_BORD = 'rgba(0,255,231,0.15)';
const MAGENTA   = '#ff00cc';
const BG        = '#020c18';
const MONO      = '"Courier New", Courier, monospace';

const sectionSx = {
  display:       'flex',
  flexDirection: 'column' as const,
  gap:           '1.5rem',
  padding:       '1.5rem',
  background:    BG,
  width:         '100%',
};

const rowSx = {
  display:       'flex',
  flexDirection: 'row' as const,
  flexWrap:      'wrap' as const,
  gap:           '2rem',
  alignItems:    'center',
};

const labelSx = {
  fontFamily:    MONO,
  fontSize:      '0.82rem',
  letterSpacing: '0.08rem',
  textTransform: 'uppercase' as const,
  color:         CYAN,
  minWidth:      '14rem',
};

const fieldSx = { minWidth: { xs: '15.5rem', sm: '18rem' } };

interface LoginSectionProps {
  config:    ConfigurationDataZipped;
  setConfig: (c: ConfigurationDataZipped) => void;
  onLogout:  () => void;
}

export const LoginSection: React.FC<LoginSectionProps> = ({ config, setConfig, onLogout }) => {
  const alphas       = useConfiguredDialogAlphas();
  const [showPass, setShowPass] = React.useState(false);

  const set = (field: 'user' | 'password' | 'loginEnabled') => (value: string | boolean) =>
    setConfig({ ...config, [field]: value });

  return (
    <Accordion sx={{ opacity: alphas.configurationCards }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Login</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={sectionSx}>

          {/* ── loginEnabled toggle ── */}
          <Box sx={rowSx}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.loginEnabled}
                  onChange={e => set('loginEnabled')(e.target.checked)}
                />
              }
              label={
                <Typography sx={{ ...labelSx, minWidth: 'unset' }}>
                  Activar formulario de login
                </Typography>
              }
            />
          </Box>

          {/* ── user ── */}
          <Box sx={rowSx}>
            <Typography sx={labelSx}>Usuario:</Typography>
            <TextField
              variant="standard"
              value={config.user}
              sx={fieldSx}
              onChange={e => set('user')(e.target.value)}
            />
          </Box>

          {/* ── password ── */}
          <Box sx={rowSx}>
            <Typography sx={labelSx}>Contraseña:</Typography>
            <TextField
              variant="standard"
              type={showPass ? 'text' : 'password'}
              value={config.password}
              sx={fieldSx}
              onChange={e => set('password')(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPass(s => !s)}
                      edge="end"
                      size="small"
                      sx={{ color: CYAN_DIM, '&:hover': { color: CYAN } }}
                    >
                      {showPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* ── Info when login disabled ── */}
          {!config.loginEnabled && (
            <Typography sx={{
              fontFamily:    MONO,
              fontSize:      '0.72rem',
              letterSpacing: '0.06rem',
              color:         CYAN_DIM,
              borderLeft:    `2px solid ${CYAN_BORD}`,
              paddingLeft:   '0.75rem',
            }}>
              El formulario de login está desactivado. Cualquier usuario puede acceder a la aplicación sin autenticarse.
            </Typography>
          )}

          {/* ── Divider ── */}
          <Box sx={{ width: '100%', height: '1px', background: CYAN_BORD }} />

          {/* ── Logout button ── */}
          <Box>
            <Button
              variant="outlined"
              onClick={onLogout}
              sx={{
                borderColor:  MAGENTA,
                color:        MAGENTA,
                fontFamily:   MONO,
                letterSpacing:'0.1rem',
                fontSize:     '0.78rem',
                borderRadius: 0,
                '&:hover': {
                  borderColor:     MAGENTA,
                  backgroundColor: 'rgba(255,0,204,0.07)',
                  boxShadow:       `0 0 14px rgba(255,0,204,0.35)`,
                },
              }}
            >
              // CERRAR SESIÓN //
            </Button>
          </Box>

        </Box>
        <ConfigurationSaveButton config={config} type="configuration" />
      </AccordionDetails>
    </Accordion>
  );
};
