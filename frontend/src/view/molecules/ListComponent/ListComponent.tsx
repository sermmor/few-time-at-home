import { Box, Card, CardContent, SxProps, Theme } from "@mui/material";

const listComponentStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'whitesmoke',
  backgroundColor: 'rgb(30, 30, 30)',
  minWidth: {xs: '15.5rem', sm: '27rem', md: '50rem'},
}

export const ListComponent = ({list}: {list: string[] | JSX.Element[]}) =>
  <Card sx={listComponentStyle}>
    <CardContent>
      {
        list.map(element => <Box sx={{marginBottom: '.5rem', width:'100%'}}>
            {element}
          </Box>)
      }
    </CardContent>
  </Card>;