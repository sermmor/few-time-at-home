import { Box, Card, CardContent, IconButton, Typography, SxProps, Theme } from "@mui/material";
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { ItemListWithFoldersComponent } from "../../molecules/ItemListWithFoldersComponent/ItemListWithFoldersComponent";
import React from "react";

const listComponentStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'left',
  justifyContent: 'center',
  color: 'rgb(30, 30, 30)',
  backgroundColor: 'whitesmoke',
  width: {xs: '15.5rem', sm: '27rem', md: '50rem', lg: '70rem'},
  marginBottom: '.5rem', 
}

const itemListStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: {xs: 'column', sm:'row'},
  alignItems: 'center',
  justifyContent: 'center',
}

export const TitleAndListWithFolders = ({title, id, list, deleteAction, addAction}: {
  title: string;
  id: string;
  list: { id: string, isFolder: boolean, item: string | JSX.Element }[];
  deleteAction?: (id: string) => void;
  addAction?: () => void;
}) => {
  const [isInSelectListMode, setSelectListMode] = React.useState<boolean>(false);
  const [isCheckedList, setCheckedList] = React.useState<boolean[]>(list.map(() => false));

  const onSelectItem = (index: number) => (id: string, checked: boolean) => {
    const cloneChecked = [...isCheckedList]
    cloneChecked[index] = checked;
    console.log(cloneChecked)
    setCheckedList(cloneChecked);
  }

return <>
  <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
    {title}
  </Typography>
  <Card sx={listComponentStyle}>
    <CardContent>
      {
        list.map((element, index) =>
          <Box key={element.id} sx={itemListStyle}>
            <ItemListWithFoldersComponent {...{element, deleteAction, isInSelectListMode, isElementSelected: isCheckedList[index], onSelect: onSelectItem(index)}}/>
          </Box>
        )
      }
    { addAction && <IconButton aria-label="addItem" onClick={() => addAction()}>
        <AddCircleIcon />
      </IconButton>
    }
    </CardContent>
  </Card>
</>
};
