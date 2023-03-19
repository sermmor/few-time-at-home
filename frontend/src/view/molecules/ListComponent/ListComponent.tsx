import { Box, Card, CardContent, IconButton, SxProps, Theme } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';

const listComponentStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'left',
  justifyContent: 'center',
  color: 'whitesmoke',
  backgroundColor: 'rgb(30, 30, 30)',
  minWidth: {xs: '15.5rem', sm: '27rem', md: '50rem'},
  marginBottom: '.5rem', 
}

const itemListStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: {xs: 'column', sm:'row'},
  alignItems: 'center',
  justifyContent: 'center',
}

interface Props {
  list: { id: string, item: string | JSX.Element }[];
  deleteAction?: (id: string) => void;
}

export const ListComponent = ({list, deleteAction}: Props) => <Card sx={listComponentStyle}>
    <CardContent>
      {
        list.map(element =>
          <Box key={element.id} sx={itemListStyle}>
            { deleteAction && <IconButton aria-label="delete" color='error' onClick={() => deleteAction(element.id)}>
                <DeleteIcon />
              </IconButton>
            }
            {element.item}
          </Box>
        )
      }
    </CardContent>
  </Card>;