import * as React from 'react';
import { AppBar, Box, Toolbar, IconButton, Typography, Menu, Button, MenuItem } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CottageIcon from '@mui/icons-material/Cottage';
import { useNavigate } from 'react-router-dom';
import { RouteFTAHElement, routesFTAH } from '../../Routes';
import { MenuPageItem } from './components/MenuPageItem';

type PageData = RouteFTAHElement | {name: string, pages: RouteFTAHElement[]};

const pages = routesFTAH.filter(route => !route.isHiddenInMenuBar);

const ToolbarDesktopAndTablet = () => {
  const navigate = useNavigate();

  const groupsNames = pages.map(p => p.group).filter((item, pos, self) => {
    return self.indexOf(item) === pos;
  }).filter(item => item !== '');
  const pagesWithoutGroups = pages.filter(p => p.group === '');
  const groupsWithPages = groupsNames.map(nameGroup => ({
    name: nameGroup,
    pages: pages.filter(p => p.group === nameGroup),
  }));
  const allPages: PageData[] = [pagesWithoutGroups[0], ...groupsWithPages, ...pagesWithoutGroups.filter((value, index) => index !== 0)];

  return (
    <>
      <CottageIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1, ml: 2 }} />
      <Typography
        variant="h6"
        noWrap
        component="a"
        href="/"
        sx={{
          mr: 2,
          display: { xs: 'none', md: 'flex' },
          fontFamily: 'monospace',
          fontWeight: 700,
          letterSpacing: '.3rem',
          color: 'inherit',
          textDecoration: 'none',
        }}
      >
        FEW_TIME@HOME
      </Typography>
      <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
        {allPages.map((p) => {
          if ('pages' in p) {
            return <MenuPageItem key={p.name} page={p} />;
          } else {
            const {name, path} = p;
            return (
              <Button
                key={name}
                onClick={() => navigate(path)}
                sx={{ my: 2, color: 'white', display: 'block' }}
              >
                {name}
              </Button>
            )
          }
        })}
      </Box>
    </>
  );
}

const ToolbarMobile = () => {
  const navigate = useNavigate();
  const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(null);
  return (
    <>
      <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
        <IconButton
          size="large"
          aria-label="account of current user"
          aria-controls="menu-appbar"
          aria-haspopup="true"
          onClick={event => setAnchorElNav(event.currentTarget)}
          color="inherit"
        >
          <MenuIcon />
        </IconButton>
        <Menu
          id="menu-appbar"
          anchorEl={anchorElNav}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          open={!!anchorElNav}
          onClose={() => setAnchorElNav(null)}
          sx={{
            display: { xs: 'block', md: 'none' },
          }}
        >
          {pages.map(({name, path}) => (
            <MenuItem
              key={name}
              onClick={() => {
                navigate(path);
                setAnchorElNav(null);
              }}
            >
              <Typography textAlign="center">{name}</Typography>
            </MenuItem>
          ))}
        </Menu>
      </Box>
      <CottageIcon sx={{ display: { xs: 'flex', md: 'none' }, mr: 1 }} />
      <Typography
        variant="h5"
        noWrap
        component="a"
        href=""
        sx={{
          mr: 2,
          display: { xs: 'flex', md: 'none' },
          flexGrow: 1,
          fontFamily: 'monospace',
          fontWeight: 700,
          letterSpacing: '.3rem',
          color: 'inherit',
          textDecoration: 'none',
        }}
      >
        FEW_TIME@HOME
      </Typography>
    </>
  );
}

export const AppMenubar = () => {
  return (
    <AppBar position="static" sx={{ backgroundColor: 'black' }}>
      <Toolbar disableGutters>
        <ToolbarDesktopAndTablet />
        <ToolbarMobile />
      </Toolbar>
    </AppBar>
  );
}
