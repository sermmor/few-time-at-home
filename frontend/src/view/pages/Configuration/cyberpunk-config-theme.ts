import { createTheme } from '@mui/material/styles';

const CYAN       = '#00ffe7';
const MAGENTA    = '#ff00cc';
const BG_DARK    = '#020c18';
const BG_PAPER   = '#071526';
const CYAN_DIM   = 'rgba(0,255,231,0.6)';
const CYAN_FAINT = 'rgba(0,255,231,0.07)';
const CYAN_BORD  = 'rgba(0,255,231,0.22)';
const MONO       = '"Courier New", Courier, monospace';

export const cyberpunkConfigTheme = createTheme({
  palette: {
    mode: 'dark',
    primary:    { main: CYAN,    contrastText: BG_DARK },
    secondary:  { main: MAGENTA, contrastText: BG_DARK },
    background: { default: BG_DARK, paper: BG_PAPER },
    text:       { primary: CYAN, secondary: CYAN_DIM },
    divider:    CYAN_BORD,
  },
  typography: {
    fontFamily: MONO,
    allVariants: { color: CYAN },
  },
  components: {
    // ── Accordion ──────────────────────────────────────────────────────────
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundColor: BG_PAPER,
          backgroundImage: 'none',
          border:          `1px solid ${CYAN_BORD}`,
          boxShadow:       'none',
          opacity:         '1 !important',          // override the alpha-based opacity
          borderRadius:    '0 !important',
          '&::before':     { display: 'none' },
          '&:hover':       { borderColor: 'rgba(0,255,231,0.45)' },
          '&.Mui-expanded': {
            borderColor: CYAN,
            boxShadow:   `0 0 14px rgba(0,255,231,0.12)`,
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          padding:          '0 1rem',
          '& .MuiTypography-root': {
            fontFamily:     MONO,
            fontWeight:     700,
            fontSize:       '0.82rem',
            letterSpacing:  '0.12rem',
            textTransform:  'uppercase',
            color:          CYAN,
          },
          '& .MuiSvgIcon-root': { color: CYAN },
          '&:hover': { background: CYAN_FAINT },
        },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
          padding:         '0',
        },
      },
    },
    // ── TextField ──────────────────────────────────────────────────────────
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-input': {
            color:      CYAN,
            fontFamily: MONO,
            fontSize:   '0.85rem',
          },
          // Standard variant
          '& .MuiInput-underline:before':       { borderBottomColor: CYAN_BORD },
          '& .MuiInput-underline:hover:before': { borderBottomColor: CYAN_DIM },
          '& .MuiInput-underline:after':        { borderBottomColor: CYAN },
          // Label
          '& .MuiInputLabel-root':             { color: CYAN_DIM, fontFamily: MONO, fontSize: '0.82rem' },
          '& .MuiInputLabel-root.Mui-focused': { color: CYAN },
          // Outlined variant
          '& .MuiOutlinedInput-root': {
            color:        CYAN,
            fontFamily:   MONO,
            '& fieldset':              { borderColor: CYAN_BORD },
            '&:hover fieldset':        { borderColor: CYAN_DIM  },
            '&.Mui-focused fieldset':  { borderColor: CYAN      },
          },
          // Read-only / disabled
          '& .MuiInputBase-input.Mui-disabled': { color: CYAN_DIM, WebkitTextFillColor: CYAN_DIM },
        },
      },
    },
    // ── Button ─────────────────────────────────────────────────────────────
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily:    MONO,
          letterSpacing: '0.1rem',
          textTransform: 'uppercase',
          borderRadius:  0,
        },
        contained: {
          backgroundColor: 'transparent',
          border:          `1px solid ${CYAN}`,
          color:           CYAN,
          boxShadow:       `0 0 6px rgba(0,255,231,0.18)`,
          '&:hover': {
            backgroundColor: CYAN_FAINT,
            boxShadow:       `0 0 18px rgba(0,255,231,0.4)`,
          },
          '&.Mui-disabled': {
            borderColor: CYAN_BORD,
            color:       CYAN_BORD,
          },
        },
        outlined: {
          borderColor: CYAN,
          color:       CYAN,
          '&:hover': {
            backgroundColor: CYAN_FAINT,
            borderColor:     CYAN,
            boxShadow:       `0 0 12px rgba(0,255,231,0.3)`,
          },
        },
      },
    },
    // ── Switch ─────────────────────────────────────────────────────────────
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          color: CYAN_DIM,
          '&.Mui-checked': {
            color: CYAN,
            '& + .MuiSwitch-track': { backgroundColor: 'rgba(0,255,231,0.35)', opacity: 1 },
          },
        },
        track: { backgroundColor: CYAN_BORD, opacity: 1 },
      },
    },
    // ── FormControlLabel ───────────────────────────────────────────────────
    MuiFormControlLabel: {
      styleOverrides: {
        label: { color: CYAN, fontFamily: MONO, fontSize: '0.85rem' },
      },
    },
    // ── Typography ─────────────────────────────────────────────────────────
    MuiTypography: {
      styleOverrides: {
        root: { color: CYAN },
      },
    },
    // ── IconButton ─────────────────────────────────────────────────────────
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: CYAN,
          '&:hover': { background: CYAN_FAINT },
        },
      },
    },
    // ── Divider ────────────────────────────────────────────────────────────
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: CYAN_BORD },
      },
    },
    // ── InputAdornment ─────────────────────────────────────────────────────
    MuiInputAdornment: {
      styleOverrides: {
        root: { color: CYAN_DIM },
      },
    },
    // ── Alert (Snackbar) ───────────────────────────────────────────────────
    MuiAlert: {
      styleOverrides: {
        filledSuccess: {
          backgroundColor: 'rgba(0,255,231,0.15)',
          color:           CYAN,
          border:          `1px solid ${CYAN}`,
        },
        filledError: {
          backgroundColor: 'rgba(255,0,204,0.15)',
          color:           MAGENTA,
          border:          `1px solid ${MAGENTA}`,
        },
      },
    },
    // ── Tooltip ────────────────────────────────────────────────────────────
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: BG_PAPER,
          border:          `1px solid ${CYAN_BORD}`,
          color:           CYAN,
          fontFamily:      MONO,
          fontSize:        '0.75rem',
        },
      },
    },
  },
});
