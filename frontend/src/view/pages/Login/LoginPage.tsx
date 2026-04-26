import React from 'react';
import { Box, IconButton, InputAdornment, TextField, Typography, GlobalStyles } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { AuthActions } from '../../../core/actions/auth';
import { useTranslation } from 'react-i18next';

// ── Palette ───────────────────────────────────────────────────────────────────
const CY = {
  bg:       '#020c18',
  bgPanel:  '#071526',
  cyan:     '#00ffe7',
  cyanDim:  'rgba(0,255,231,0.6)',
  cyanFaint:'rgba(0,255,231,0.07)',
  cyanBord: 'rgba(0,255,231,0.25)',
  magenta:  '#ff00cc',
  mono:     '"Courier New", Courier, monospace',
};

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { t } = useTranslation();
  const [user,        setUser]        = React.useState('');
  const [password,    setPassword]    = React.useState('');
  const [showPass,    setShowPass]    = React.useState(false);
  const [error,       setError]       = React.useState('');
  const [loading,     setLoading]     = React.useState(false);

  const handleLogin = () => {
    if (!user || !password) {
      setError(t('loginPage.enterCredentials'));
      return;
    }
    setLoading(true);
    setError('');
    AuthActions.login(user, password).then(({ success }) => {
      setLoading(false);
      if (success) {
        onLoginSuccess();
      } else {
        setError(t('loginPage.wrongCredentials'));
        setPassword('');
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <>
      <GlobalStyles styles={{
        '@keyframes cy-scanline': {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)'  },
        },
        '@keyframes cy-blink': {
          '0%, 100%': { opacity: 1 },
          '50%':      { opacity: 0 },
        },
        '@keyframes cy-glow-pulse': {
          '0%, 100%': { textShadow: `0 0 8px ${CY.cyan}, 0 0 20px rgba(0,255,231,0.4)` },
          '50%':      { textShadow: `0 0 16px ${CY.cyan}, 0 0 40px rgba(0,255,231,0.7), 0 0 80px rgba(0,255,231,0.2)` },
        },
      }} />

      {/* Full-screen dark background */}
      <Box sx={{
        position:   'fixed',
        inset:      0,
        background: `radial-gradient(ellipse at 50% 40%, rgba(0,255,231,0.04) 0%, ${CY.bg} 70%)`,
        overflow:   'hidden',
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>

        {/* Scanline effect */}
        <Box sx={{
          position:   'absolute',
          inset:      0,
          pointerEvents: 'none',
          '&::after': {
            content:    '""',
            position:   'absolute',
            left: 0, right: 0,
            height:     '2px',
            background: 'rgba(0,255,231,0.07)',
            animation:  'cy-scanline 6s linear infinite',
          },
        }} />

        {/* Grid overlay */}
        <Box sx={{
          position:   'absolute',
          inset:      0,
          pointerEvents: 'none',
          backgroundImage: `
            linear-gradient(rgba(0,255,231,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,231,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }} />

        {/* Login panel */}
        <Box sx={{
          position:      'relative',
          width:         { xs: '90%', sm: '26rem' },
          background:    CY.bgPanel,
          border:        `1px solid ${CY.cyanBord}`,
          boxShadow:     `0 0 30px rgba(0,255,231,0.1), 0 0 80px rgba(0,255,231,0.04), inset 0 0 30px rgba(0,255,231,0.02)`,
          padding:       '2.5rem 2rem',
          display:       'flex',
          flexDirection: 'column',
          gap:           '1.5rem',
          alignItems:    'center',
        }}>

          {/* Corner accents */}
          {(['tl','tr','bl','br'] as const).map(pos => (
            <Box key={pos} sx={{
              position: 'absolute',
              width: '12px', height: '12px',
              ...(pos === 'tl' && { top: '-1px',    left: '-1px',    borderTop:    `2px solid ${CY.cyan}`, borderLeft:   `2px solid ${CY.cyan}` }),
              ...(pos === 'tr' && { top: '-1px',    right: '-1px',   borderTop:    `2px solid ${CY.cyan}`, borderRight:  `2px solid ${CY.cyan}` }),
              ...(pos === 'bl' && { bottom: '-1px', left: '-1px',    borderBottom: `2px solid ${CY.cyan}`, borderLeft:   `2px solid ${CY.cyan}` }),
              ...(pos === 'br' && { bottom: '-1px', right: '-1px',   borderBottom: `2px solid ${CY.cyan}`, borderRight:  `2px solid ${CY.cyan}` }),
            }} />
          ))}

          {/* Title */}
          <Box sx={{ textAlign: 'center', paddingBottom: '0.5rem' }}>
            <Typography sx={{
              fontFamily:    CY.mono,
              fontWeight:    700,
              fontSize:      { xs: '1.1rem', sm: '1.3rem' },
              letterSpacing: '0.25rem',
              color:         CY.cyan,
              textTransform: 'uppercase',
              animation:     'cy-glow-pulse 3s ease-in-out infinite',
            }}>
              FEW_TIME@HOME
            </Typography>
            <Typography sx={{
              fontFamily:    CY.mono,
              fontSize:      '0.65rem',
              letterSpacing: '0.18rem',
              color:         CY.cyanDim,
              textTransform: 'uppercase',
              marginTop:     '0.3rem',
            }}>
              {t('loginPage.accessTitle')}
            </Typography>
            <Box sx={{
              width:        '100%',
              height:       '1px',
              background:   `linear-gradient(90deg, transparent, ${CY.cyan}, transparent)`,
              marginTop:    '1rem',
              opacity:      0.4,
            }} />
          </Box>

          {/* User field */}
          <TextField
            fullWidth
            label={t('loginPage.userLabel')}
            variant="outlined"
            value={user}
            onChange={e => setUser(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="username"
            inputProps={{ style: { fontFamily: CY.mono, fontSize: '0.9rem', color: CY.cyan } }}
            InputLabelProps={{ style: { fontFamily: CY.mono, fontSize: '0.8rem', letterSpacing: '0.1rem', color: CY.cyanDim } }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset':             { borderColor: CY.cyanBord },
                '&:hover fieldset':       { borderColor: CY.cyanDim  },
                '&.Mui-focused fieldset': { borderColor: CY.cyan     },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: CY.cyan },
            }}
          />

          {/* Password field */}
          <TextField
            fullWidth
            label={t('loginPage.passwordLabel')}
            variant="outlined"
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="current-password"
            inputProps={{ style: { fontFamily: CY.mono, fontSize: '0.9rem', color: CY.cyan } }}
            InputLabelProps={{ style: { fontFamily: CY.mono, fontSize: '0.8rem', letterSpacing: '0.1rem', color: CY.cyanDim } }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPass(s => !s)}
                    edge="end"
                    sx={{ color: CY.cyanDim, '&:hover': { color: CY.cyan } }}
                  >
                    {showPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset':             { borderColor: CY.cyanBord },
                '&:hover fieldset':       { borderColor: CY.cyanDim  },
                '&.Mui-focused fieldset': { borderColor: CY.cyan     },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: CY.cyan },
            }}
          />

          {/* Error message */}
          {error && (
            <Typography sx={{
              fontFamily:    CY.mono,
              fontSize:      '0.72rem',
              letterSpacing: '0.1rem',
              color:         CY.magenta,
              textShadow:    `0 0 8px ${CY.magenta}`,
              textAlign:     'center',
            }}>
              !! {error}
            </Typography>
          )}

          {/* Login button */}
          <Box
            component="button"
            onClick={loading ? undefined : handleLogin}
            sx={{
              width:           '100%',
              padding:         '0.7rem 1rem',
              background:      loading ? 'rgba(0,255,231,0.04)' : 'transparent',
              border:          `1px solid ${loading ? CY.cyanBord : CY.cyan}`,
              color:           loading ? CY.cyanDim : CY.cyan,
              fontFamily:      CY.mono,
              fontSize:        '0.82rem',
              fontWeight:      700,
              letterSpacing:   '0.2rem',
              textTransform:   'uppercase',
              cursor:          loading ? 'wait' : 'pointer',
              boxShadow:       loading ? 'none' : `0 0 10px rgba(0,255,231,0.2)`,
              transition:      'box-shadow 0.2s, background 0.2s, border-color 0.2s',
              '&:hover':       !loading ? {
                background:  CY.cyanFaint,
                boxShadow:   `0 0 22px rgba(0,255,231,0.45)`,
              } : {},
            }}
          >
            {loading ? t('loginPage.verifying') : t('loginPage.access')}
          </Box>

          {/* Footer */}
          <Typography sx={{
            fontFamily:    CY.mono,
            fontSize:      '0.6rem',
            letterSpacing: '0.08rem',
            color:         'rgba(0,255,231,0.25)',
            textAlign:     'center',
          }}>
            {t('loginPage.privateSystem')}
          </Typography>
        </Box>
      </Box>
    </>
  );
};
