import { Box, Card, CardContent, IconButton, SxProps, Theme } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';

const listComponentStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'left',
  justifyContent: 'center',
  color: 'rgb(30, 30, 30)',
  backgroundColor: 'whitesmoke',
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
  addAction?: () => void;
}

export const ListComponent = ({list, deleteAction, addAction}: Props) => <Card sx={listComponentStyle}>
    <CardContent>
      {
        list.map(element =>
          <Box key={element.id} sx={itemListStyle}>
            { deleteAction && <IconButton aria-label="delete" onClick={() => deleteAction(element.id)}>
                <DeleteIcon />
              </IconButton>
            }
            {element.item}
          </Box>
        )
      }
    { addAction && <IconButton aria-label="addItem" onClick={() => addAction()}>
        <AddCircleIcon />
      </IconButton>
    }

    </CardContent>
  </Card>;