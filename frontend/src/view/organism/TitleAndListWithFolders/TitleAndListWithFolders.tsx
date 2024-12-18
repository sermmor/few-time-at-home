import React from "react";
import { Box, Card, CardContent, IconButton, Typography, SxProps, Theme, Button, Input } from "@mui/material";
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SyncIcon from '@mui/icons-material/Sync';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudCircleIcon from '@mui/icons-material/CloudCircle';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { ItemListWithFoldersComponent } from "../../molecules/ItemListWithFoldersComponent/ItemListWithFoldersComponent";
import { SearchAndList } from "../SearchAndList/SearchAndList";

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
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'left',
  backgroundColor: 'whitesmoke',
  width: widthBoxes,
  borderStyle: 'solid',
  borderWidth: '.05rem',
  borderColor: '#9f9f9f',
}

const breadcrumbStyle: SxProps<Theme> = {
  paddingLeft: '1rem',
  fontStyle: 'oblique',
}

interface Props {
  title: string;
  id: string;
  path?: string;
  helpSearchLabel: string;
  noActionsMode?: boolean;
  list: { id: string, isFolder: boolean, item: string | JSX.Element }[];
  deleteAction?: (id: string) => void;
  addAction?: () => void;
  addFolder?: () => void;
  duplicateItem?: () => void;
  onInSelectionMode?: (isInSelected: boolean) => void;
  onOutSelectionMode?: () => void;
  onSelectItem?: (id: string, isSelected: boolean) => void;
  onMoveItem?: (listIdItemSelect: string[]) => void;
  goBackToParent?: () => void;
  onSearch?: (textToSearch: string) => Promise<(string | JSX.Element)[]>;
  onUploadItem?: (event: any) => void;
  updateContent?: () => void;
  seeTrashDrive?: () => void;
  seeCloudDrive?: () => void;
  filterItemPredicate?: (id: string) => boolean;
  filterFileInEditor?: (id: string) => boolean;
  openFileInEditor?: (id: string) => void;
  createFile?: () => void;
  showPhotoLibrary?: () => void;
}

export const TitleAndListWithFolders = ({
  title,
  path,
  helpSearchLabel,
  noActionsMode,
  list,
  deleteAction,
  addAction,
  addFolder,
  duplicateItem,
  goBackToParent,
  onMoveItem,
  onSelectItem,
  onInSelectionMode,
  onOutSelectionMode,
  onSearch,
  onUploadItem,
  updateContent,
  seeTrashDrive,
  seeCloudDrive,
  filterItemPredicate,
  filterFileInEditor,
  openFileInEditor,
  createFile,
  showPhotoLibrary,
}: Props) => {
  const [isInSelectListMode, setSelectListMode] = React.useState<boolean>(false);
  const [isInMoveItemMode, setMoveItemMode] = React.useState<boolean>(false);
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
    if (onInSelectionMode) onInSelectionMode(false);

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
    if (onOutSelectionMode && !newIsInSelectListMode) {
      if (onInSelectionMode) onInSelectionMode(false);
      onOutSelectionMode();
    }
    if (onInSelectionMode && newIsInSelectListMode) onInSelectionMode(true);
  }
  
  return <>
    <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
      {title}
    </Typography>
    {onSearch && <SearchAndList helperText={helpSearchLabel} widthBoxes={widthBoxes} onSearch={onSearch} />}
    {!noActionsMode && <Box sx={{...buttonListStyle, position: 'sticky', top: '4.3rem', zIndex: 3}}>
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
        !isInSelectListMode && showPhotoLibrary && <Button onClick={showPhotoLibrary}>{<PhotoLibraryIcon />}</Button>
      }
      {
        isInMoveItemMode &&
          <Button onClick={moveItemProcess(false)}>{<ContentPasteIcon />}</Button>
      }
      {
        !isInMoveItemMode && duplicateItem && 
          <Button onClick={duplicateItem}>{<FileCopyIcon />}</Button>
      }
      {
        !isInSelectListMode && createFile && 
          <Button onClick={createFile}>{<NoteAddIcon />}</Button>
      }
      {
        !isInSelectListMode && 
          <Button onClick={addFolder}><CreateNewFolderIcon /></Button>
      }
      {
        !isInSelectListMode && onUploadItem &&
        <>
          <Button onClick={() => {document.getElementById('fileToUpload')!.click()}}><CloudUploadIcon /></Button>
          <Input type='file' id='fileToUpload' sx={{'display': 'none'}} onChange={onUploadItem}/>
        </>
      }
      {
        !isInSelectListMode && seeCloudDrive && 
          <Button onClick={seeCloudDrive}><CloudCircleIcon /></Button>
      }
      {
        !isInSelectListMode && seeTrashDrive && 
          <Button onClick={seeTrashDrive}><DeleteIcon /></Button>
      }
      {
        !isInSelectListMode && updateContent && 
          <Button onClick={updateContent}><SyncIcon /></Button>
      }
      {
        (!isInSelectListMode || isInMoveItemMode) && 
        <Button onClick={goBackToParent}><ArrowUpwardIcon /></Button>
      }
    </Box>}
    {path && <Box sx={{...buttonListStyle, ...breadcrumbStyle}}>
      { path }
    </Box>}
    <Card sx={listComponentStyle}>
      <CardContent>
        {
          list.map((element, index) =>
            <Box key={element.id} sx={itemListStyle}>
              {
                (!filterItemPredicate || filterItemPredicate(element.id)) && 
                <ItemListWithFoldersComponent {...{
                  element,
                  deleteAction,
                  isInSelectListMode,
                  IconOpenFileInEditor: element.id.indexOf('.txt') > -1 ? undefined : <PhotoLibraryIcon />,
                  isElementSelected: isCheckedList[index],
                  onSelect: onSelectItemGeneral(index),
                  onOpenFileInEditor: filterFileInEditor && openFileInEditor && filterFileInEditor(element.id) ? openFileInEditor : undefined,
                }}/>
              }
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
