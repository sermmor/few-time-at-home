import * as React from 'react';
import { AppBar, Box, Toolbar, IconButton, Typography, Menu, Button, MenuItem } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CottageIcon from '@mui/icons-material/Cottage';
import { redirect } from 'react-router-dom';
import { routesFTAH } from '../../Routes';

const pages = routesFTAH.filter(route => !route.isHiddenInMenuBar);

const handleOpenNavMenu = (setAnchorElNav: React.Dispatch<React.SetStateAction<HTMLElement | null>>) => (event: React.MouseEvent<HTMLElement>) => {
  setAnchorElNav(event.currentTarget);
};

const handleCloseNavMenu = (setAnchorElNav: React.Dispatch<React.SetStateAction<HTMLElement | null>>) => () => {
  setAnchorElNav(null);
};

const handlePushInMenuItem = (nameItem: string) => (event: React.MouseEvent<HTMLElement>) => {
  console.log(nameItem); // TODO: Navigation
  redirect(nameItem);
}

const handlePushInMenuMobileItem = (setAnchorElNav: React.Dispatch<React.SetStateAction<HTMLElement | null>>, nameItem: string) => (event: React.MouseEvent<HTMLElement>) => {
  console.log(nameItem); // TODO: Navigation
  redirect(nameItem);
  handleCloseNavMenu(setAnchorElNav)();
}

const ToolbarDesktopAndTablet = () => {
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
        {pages.map(({name, path}) => (
          <Button
            key={name}
            onClick={handlePushInMenuItem(path)}
            sx={{ my: 2, color: 'white', display: 'block' }}
          >
            {name}
          </Button>
        ))}
      </Box>
    </>
  );
}

const ToolbarMobile = () => {
  const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(null);
  return (
    <>
      <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
        <IconButton
          size="large"
          aria-label="account of current user"
          aria-controls="menu-appbar"
          aria-haspopup="true"
          onClick={handleOpenNavMenu(setAnchorElNav)}
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
          open={Boolean(anchorElNav)}
          onClose={handleCloseNavMenu(setAnchorElNav)}
          sx={{
            display: { xs: 'block', md: 'none' },
          }}
        >
          {pages.map(({name, path}) => (
            <MenuItem key={name} onClick={handlePushInMenuMobileItem(setAnchorElNav, path)}>
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
