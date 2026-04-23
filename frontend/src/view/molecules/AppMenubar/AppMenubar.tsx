import * as React from 'react';
import { AppBar, Box, Toolbar, IconButton, Menu, MenuItem, Button, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate } from 'react-router-dom';
import { RouteFTAHElement, routesFTAH } from '../../Routes';
import { MenuPageItem } from './components/MenuPageItem';

// ── Cyberpunk palette ──────────────────────────────────────────────────────
export const CY = {
  bg:        '#020c18',
  cyan:      '#00ffe7',
  cyanDim:   'rgba(0,255,231,0.65)',
  cyanFaint: 'rgba(0,255,231,0.07)',
  border:    'rgba(0,255,231,0.30)',
};

type PageData = RouteFTAHElement | { name: string; pages: RouteFTAHElement[] };

const pages = routesFTAH.filter(route => !route.isHiddenInMenuBar);

export const navBtnSx = {
  color:          CY.cyanDim,
  fontFamily:     '"Courier New", Courier, monospace',
  fontWeight:     700,
  fontSize:       '0.72rem',
  letterSpacing:  '0.07rem',
  textTransform:  'uppercase' as const,
  px:             1.5,
  py:             1,
  borderRadius:   0,
  transition:     'color 0.15s, background 0.15s, text-shadow 0.15s',
  '&:hover': {
    color:       CY.cyan,
    background:  CY.cyanFaint,
    textShadow:  `0 0 8px ${CY.cyan}`,
  },
};

// ── Desktop / tablet toolbar ───────────────────────────────────────────────
const ToolbarDesktopAndTablet = () => {
  const navigate = useNavigate();

  const groupsNames = pages
    .map(p => p.group)
    .filter((item, pos, self) => self.indexOf(item) === pos)
    .filter(item => item !== '');
  const pagesWithoutGroups = pages.filter(p => p.group === '');
  const groupsWithPages    = groupsNames.map(nameGroup => ({
    name:  nameGroup,
    pages: pages.filter(p => p.group === nameGroup),
  }));
  const allPages: PageData[] = [
    pagesWithoutGroups[0],
    ...groupsWithPages,
    ...pagesWithoutGroups.filter((_, i) => i !== 0),
  ];

  return (
    <>
      {/* ── Logo ── */}
      <Typography
        noWrap
        component="a"
        href="/"
        sx={{
          display:        { xs: 'none', md: 'flex' },
          fontFamily:     '"Courier New", Courier, monospace',
          fontWeight:     700,
          fontSize:       '0.95rem',
          letterSpacing:  '.22rem',
          color:          CY.cyan,
          textDecoration: 'none',
          textShadow:     `0 0 8px ${CY.cyan}, 0 0 22px rgba(0,255,231,0.35)`,
          px:             2.5,
          py:             1,
          borderRight:    `1px solid ${CY.border}`,
          mr:             1,
          userSelect:     'none',
          whiteSpace:     'nowrap',
        }}
      >
        FEW_TIME@HOME
      </Typography>

      {/* ── Nav items ── */}
      <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
        {allPages.map(p =>
          'pages' in p
            ? <MenuPageItem key={p.name} page={p} />
            : (
              <Button
                key={p.name}
                onClick={() => navigate(p.path)}
                sx={navBtnSx}
              >
                {p.name}
              </Button>
            )
        )}
      </Box>
    </>
  );
};

// ── Mobile toolbar ─────────────────────────────────────────────────────────
const ToolbarMobile = () => {
  const navigate = useNavigate();
  const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);

  return (
    <>
      <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' }, alignItems: 'center' }}>
        <IconButton
          size="large"
          onClick={e => setAnchor(e.currentTarget)}
          sx={{ color: CY.cyan }}
        >
          <MenuIcon />
        </IconButton>

        <Menu
          anchorEl={anchor}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          keepMounted
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          open={!!anchor}
          onClose={() => setAnchor(null)}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiPaper-root': {
              backgroundColor: CY.bg,
              border:          `1px solid ${CY.border}`,
              borderRadius:    0,
              boxShadow:       `0 0 20px rgba(0,255,231,0.15)`,
            },
            '& .MuiList-root': { padding: '4px 0' },
          }}
        >
          {pages.map(({ name, path }) => (
            <MenuItem
              key={name}
              onClick={() => { navigate(path); setAnchor(null); }}
              sx={{
                color:          CY.cyanDim,
                fontFamily:     'monospace',
                fontSize:       '0.78rem',
                letterSpacing:  '0.07rem',
                textTransform:  'uppercase',
                '&:hover': { color: CY.cyan, background: CY.cyanFaint },
              }}
            >
              {name}
            </MenuItem>
          ))}
        </Menu>
      </Box>

      {/* Mobile logo */}
      <Typography
        noWrap
        component="a"
        href="/"
        sx={{
          display:        { xs: 'flex', md: 'none' },
          flexGrow:       1,
          fontFamily:     'monospace',
          fontWeight:     700,
          fontSize:       '0.88rem',
          letterSpacing:  '.18rem',
          color:          CY.cyan,
          textDecoration: 'none',
          textShadow:     `0 0 8px ${CY.cyan}`,
          mr:             2,
        }}
      >
        FEW_TIME@HOME
      </Typography>
    </>
  );
};

// ── AppMenubar ─────────────────────────────────────────────────────────────
export const AppMenubar = () => (
  <AppBar
    position="static"
    sx={{
      backgroundColor: CY.bg,
      borderBottom:    `2px solid ${CY.cyan}`,
      boxShadow:       `0 2px 20px rgba(0,255,231,0.18), 0 0 60px rgba(0,255,231,0.04)`,
    }}
  >
    <Toolbar disableGutters>
      <ToolbarDesktopAndTablet />
      <ToolbarMobile />
    </Toolbar>
  </AppBar>
);
