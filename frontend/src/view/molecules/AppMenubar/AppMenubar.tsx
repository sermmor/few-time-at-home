import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import CottageIcon from '@mui/icons-material/Cottage';
import { RouteStatus } from '../../Routes';

const pages = Object.values(RouteStatus);

const handleOpenNavMenu = (setAnchorElNav: React.Dispatch<React.SetStateAction<HTMLElement | null>>) => (event: React.MouseEvent<HTMLElement>) => {
  setAnchorElNav(event.currentTarget);
};

const handleCloseNavMenu = (setAnchorElNav: React.Dispatch<React.SetStateAction<HTMLElement | null>>) => () => {
  setAnchorElNav(null);
};

const handlePushInMenuItem = (nameItem: string) => (event: React.MouseEvent<HTMLElement>) => {
  console.log(nameItem); // TODO: Navigation
}

const handlePushInMenuMobileItem = (setAnchorElNav: React.Dispatch<React.SetStateAction<HTMLElement | null>>, nameItem: string) => (event: React.MouseEvent<HTMLElement>) => {
  console.log(nameItem); // TODO: Navigation
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
        {pages.map((page) => (
          <Button
            key={page}
            onClick={handlePushInMenuItem(page)}
            sx={{ my: 2, color: 'white', display: 'block' }}
          >
            {page}
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
          {pages.map((page) => (
            <MenuItem key={page} onClick={handlePushInMenuMobileItem(setAnchorElNav, page)}>
              <Typography textAlign="center">{page}</Typography>
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
