import React from "react";
import { Box, Card, CardContent, IconButton, Typography, SxProps, Theme, Button, TextField } from "@mui/material";
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import { ItemListWithFoldersComponent } from "../../molecules/ItemListWithFoldersComponent/ItemListWithFoldersComponent";

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

const breadcrumbStyle: SxProps<Theme> = {
  paddingLeft: '1rem',
  fontStyle: 'oblique',
}


export const TitleAndListWithFolders = ({title, id, path, list, deleteAction, addAction, addFolder, duplicateItem, goBackToParent, onMoveItem, onSelectItem, onOutSelectionMode}: {
  title: string;
  id: string;
  path: string;
  list: { id: string, isFolder: boolean, item: string | JSX.Element }[];
  deleteAction?: (id: string) => void;
  addAction?: () => void;
  addFolder?: () => void;
  duplicateItem?: () => void;
  onOutSelectionMode?: () => void;
  onSelectItem?: (id: string, isSelected: boolean) => void;
  onMoveItem?: (listIdItemSelect: string[]) => void;
  goBackToParent?: () => void;
}) => {
  const [isInSelectListMode, setSelectListMode] = React.useState<boolean>(false);
  const [isInMoveItemMode, setMoveItemMode] = React.useState<boolean>(false);
  const [toSearch, setToSearch] = React.useState<string>('');
  const [isCheckedList, setCheckedList] = React.useState<boolean[]>(list.map(() => false));
  const [checkedIdList, setCheckedIdList] = React.useState<string[]>([]);

  const onSelectItemGeneral = (index: number) => (id: string, checked: boolean) => {
    if (checked && checkedIdList.indexOf(id) === -1) {
      const cloneCheckedIdList = [...checkedIdList];
      cloneCheckedIdList.push(id);
      setCheckedIdList(cloneCheckedIdList);
    } else if (!checked) {
      const cloneCheckedIdList = [...checkedIdList];
      const index = cloneCheckedIdList.indexOf(id);
      cloneCheckedIdList.splice(index, 1);
      setCheckedIdList(cloneCheckedIdList);
    }
    const cloneChecked = [...isCheckedList]
    cloneChecked[index] = checked;

    setCheckedList(cloneChecked);
    if (onSelectItem) onSelectItem(id, checked);
  }

  const onSelectListMode = (enable: boolean) => {
    if (enable) {
      setCheckedList(isCheckedList.map(() => false));
    }
    setSelectListMode(enable);
  }

  const moveItemProcess = (isMoveBegins: boolean) => () => {
    if (isInMoveItemMode) {
      onMoveItem!(checkedIdList);
    }
    if (!isMoveBegins) {
      checkOnSelectListMode(!isInSelectListMode);
    }
    setMoveItemMode(isMoveBegins);
  }

  const checkOnSelectListMode = (newIsInSelectListMode: boolean) => {
    onSelectListMode(newIsInSelectListMode);
    if (onOutSelectionMode && !newIsInSelectListMode) onOutSelectionMode();
  }

  // TODO: DO FROM Bookmarks.tsx OR HERE: Searcher, move item (folder and links) in other path. Save all this changes in paths. Tree structure to get lists.
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
      <Button onClick={() => {
        checkOnSelectListMode(!isInSelectListMode);
        moveItemProcess(false);
        setMoveItemMode(false);
      }}>{isInSelectListMode ? <CheckBoxOutlineBlankIcon /> : <CheckBoxIcon />}</Button>
      {
        isInSelectListMode && !isInMoveItemMode && 
          <Button onClick={moveItemProcess(true)}>{<DriveFileMoveIcon />}</Button>
      }
      {
        isInMoveItemMode && 
          <Button onClick={moveItemProcess(false)}>{<ContentPasteIcon />}</Button>
      }
      {
        !isInMoveItemMode && 
          <Button onClick={duplicateItem}>{<FileCopyIcon />}</Button>
      }
      {
        !isInSelectListMode && 
          <Button onClick={addFolder}><CreateNewFolderIcon /></Button>
      }
      {
        (!isInSelectListMode || isInMoveItemMode) && 
          <Button onClick={goBackToParent}><ArrowUpwardIcon /></Button>
      }
    </Box>
    <Box sx={{...buttonListStyle, ...breadcrumbStyle}}>
      { path }
    </Box>
    <Card sx={listComponentStyle}>
      <CardContent>
        {
          list.map((element, index) =>
            <Box key={element.id} sx={itemListStyle}>
              <ItemListWithFoldersComponent {...{element, deleteAction, isInSelectListMode, isElementSelected: isCheckedList[index], onSelect: onSelectItemGeneral(index)}}/>
            </Box>
          )
        }
      { addAction && <IconButton aria-label="addItem" onClick={addAction}>
          <AddCircleIcon />
        </IconButton>
      }
      </CardContent>
    </Card>
  </>
};
