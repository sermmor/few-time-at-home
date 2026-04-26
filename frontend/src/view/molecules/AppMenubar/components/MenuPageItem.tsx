import * as React from 'react';
import { RouteFTAHElement } from '../../../Routes';
import { Button, Menu, MenuItem } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon   from '@mui/icons-material/ArrowDropUp';
import { useNavigate, useLocation } from 'react-router-dom';
import { CY, navBtnSx } from '../AppMenubar';

type PageData = { name: string; pages: RouteFTAHElement[] };

export const MenuPageItem = ({ page }: { page: PageData }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);
  const open = !!anchor;

  // Close the submenu whenever the active route changes.
  // With React Router's startTransition + lazy loading, the navigate() call
  // defers its batch (including setAnchor(null)) so the menu can stay open
  // while the lazy chunk loads. Watching location.pathname guarantees the
  // menu closes as soon as the new route is committed.
  React.useEffect(() => {
    setAnchor(null);
  }, [location.pathname]);

  return (
    <>
      <Button
        onClick={e => setAnchor(e.currentTarget)}
        sx={{
          ...navBtnSx,
          color:      open ? CY.cyan      : CY.cyanDim,
          background: open ? CY.cyanFaint : 'transparent',
          textShadow: open ? `0 0 8px ${CY.cyan}` : 'none',
          gap: '0.15rem',
        }}
        endIcon={
          open
            ? <ArrowDropUpIcon  sx={{ fontSize: '1rem !important', color: 'inherit' }} />
            : <ArrowDropDownIcon sx={{ fontSize: '1rem !important', color: 'inherit' }} />
        }
      >
        {page.name}
      </Button>

      <Menu
        anchorEl={anchor}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        open={open}
        onClose={() => setAnchor(null)}
        sx={{
          '& .MuiPaper-root': {
            backgroundColor: CY.bg,
            border:          `1px solid ${CY.border}`,
            borderRadius:    0,
            boxShadow:       `0 0 20px rgba(0,255,231,0.18), 0 4px 24px rgba(0,0,0,0.6)`,
            minWidth:        '150px',
          },
          '& .MuiList-root': { padding: '4px 0' },
        }}
      >
        {page.pages.map(({ name, path }) => (
          <MenuItem
            key={name}
            onClick={() => { navigate(path); setAnchor(null); }}
            sx={{
              color:          CY.cyanDim,
              fontFamily:     '"Courier New", Courier, monospace',
              fontSize:       '0.73rem',
              letterSpacing:  '0.07rem',
              textTransform:  'uppercase',
              padding:        '8px 18px',
              transition:     'all 0.12s',
              '&:hover': {
                color:      CY.cyan,
                background: CY.cyanFaint,
                textShadow: `0 0 6px ${CY.cyan}`,
              },
            }}
          >
            {name}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
