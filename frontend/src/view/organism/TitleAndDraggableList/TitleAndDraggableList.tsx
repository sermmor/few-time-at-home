import { Box, Card, CardContent, IconButton, Typography, SxProps, Theme, Button, TextField } from "@mui/material";
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { ItemListWithFoldersComponent } from "../../molecules/ItemListWithFoldersComponent/ItemListWithFoldersComponent";
import React from "react";

const widthBoxes = {xs: '15.5rem', sm: '27rem', md: '50rem', lg: '70rem'};

const listComponentStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'left',
  justifyContent: 'center',
  color: 'rgb(30, 30, 30)',
  backgroundColor: 'whitesmoke',
  width: widthBoxes,
  marginBottom: '.5rem', 
}

const itemListStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: {xs: 'column', sm:'row'},
  alignItems: 'center',
  justifyContent: 'center',
}
const buttonListStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: {xs: 'column', sm:'row'},
  alignItems: 'center',
  justifyContent: 'left',
  backgroundColor: 'whitesmoke',
  width: widthBoxes,
}

export const TitleAndListWithFolders = ({title, id, list, deleteAction, addAction}: {
  title: string;
  id: string;
  list: { id: string, isFolder: boolean, item: string | JSX.Element }[];
  deleteAction?: (id: string) => void;
  addAction?: () => void;
}) => {
  const [isInSelectListMode, setSelectListMode] = React.useState<boolean>(false);
  const [isInMoveItemMode, setMoveItemMode] = React.useState<boolean>(false);
  const [toSearch, setToSearch] = React.useState<string>('');
  const [isCheckedList, setCheckedList] = React.useState<boolean[]>(list.map(() => false));

  const onSelectItem = (index: number) => (id: string, checked: boolean) => {
    const cloneChecked = [...isCheckedList]
    cloneChecked[index] = checked;
    setCheckedList(cloneChecked);
  }

  const onSelectListMode = (enable: boolean) => {
    if (!enable) {
      setCheckedList(isCheckedList.map(() => false));
    }
    setSelectListMode(enable);
  }

  // TODO: DO FROM Bookmarks.tsx OR HERE: Searcher, create folders, move item (folder and links) in other path. Save all this changes in paths. Tree structure to get lists.
  return <>
    <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
      {title}
    </Typography>
    <TextField
          variant="outlined"
          value={toSearch}
          helperText="Search bookmark"
          sx={{width: widthBoxes}}
          onChange={evt => setToSearch(evt.target.value)}
          onKeyDown={(evt) => evt.key === 'Escape' ? setToSearch('')
            : (evt.key === 'Enter') ? undefined : undefined }
        />
    <Box sx={buttonListStyle}>
      <Button onClick={() => onSelectListMode(!isInSelectListMode)}>{isInSelectListMode ? 'Cancel selection' : 'Select Items'}</Button>
      {
        isInSelectListMode && 
          <Button onClick={() => setMoveItemMode(!isInMoveItemMode)}>{isInMoveItemMode ? 'Move here' : 'Move Items'}</Button>
        // TODO: Duplicate item NOT for bookmark case but for file case.
      }
      <Button onClick={() => undefined}>Create Folder</Button>
    </Box>
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
