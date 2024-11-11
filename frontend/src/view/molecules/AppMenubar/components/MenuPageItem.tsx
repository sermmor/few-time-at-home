import * as React from 'react';
import { RouteFTAHElement } from '../../../Routes';
import { Button, Menu, MenuItem, Typography } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import { useNavigate } from 'react-router-dom';

type PageData = {name: string, pages: RouteFTAHElement[]};

export const MenuPageItem = ({page}: {page: PageData}) => {
  const navigate = useNavigate();
  const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(null);

  return <>
    <Button
      aria-label={page.name}
      aria-controls="menu-appbar"
      aria-haspopup="true"
      onClick={event => {setAnchorElNav(event.currentTarget)}}
      sx={{ my: 2, color: 'white', display: 'flex' }}
      color="inherit"
    >
      {page.name} {anchorElNav ? <ArrowDropUpIcon /> : <ArrowDropDownIcon/>}
    </Button>
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
      key={page.name}
      onClose={() => setAnchorElNav(null)}
    >
      {page.pages.map(({name, path}) => (
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
  </>;
}