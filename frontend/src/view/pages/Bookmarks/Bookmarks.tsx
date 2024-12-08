import { Box, Button, SxProps, Theme } from "@mui/material";
import React from "react";
import { BookmarksActions } from "../../../core/actions/bookmarks";
import { LabelAndTextFieldWithFolder } from "../../molecules/LabelAndTextFieldWithFolder/LabelAndTextFieldWithFolder";
import { LabelAndUrlField } from "../../molecules/LabelAndUrlField/LabelAndUrlField";
import { TitleAndListWithFolders } from "../../organism/TitleAndListWithFolders/TitleAndListWithFolders";
import { ActionsProps, addActionItemList, addFolderActionItemList, deleteActionList, editActionList, editFolderActionList, goBackToParentFolder, isSelectedItemList, moveItemListToFolder, onSearchItem, setOpenFolder } from "./ActionsBookmarkList";
import { ModalNewName } from "../../molecules/ModalNewName/ModalNewName";
import { BookmarkItem, getIdBookmarkItem, isFolder } from "../../../data-model/bookmarks";

const formStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
};

let indexNewBookmarkAdded = 0;

const cleanLabelFolder = (label: string): string => label.split('//').join('/');

const getPathParentFolder = (completePath: string): string => {
  const textSplited = completePath.split('/');
  return textSplited.slice(0, textSplited.length - 1).join('/');
}

const getNameFolder = (completePath: string): string => {
  const textSplited = completePath.split('/');
  return textSplited[textSplited.length - 1];
}

export const Bookmarks = () => {
  const [isOpenNameFolderDialog, setOpenNameFolderDialog] = React.useState(false);
  const [currentPath, setCurrentPath] = React.useState<string>('/'); // Current path === currentTreeNode.label
  const [bookmarks, setBookmarks] = React.useState<BookmarkItem[]>([]);
  const [breadcrumb, setBreadcrumb] = React.useState<string[]>([]);
  const [selectedNodes, setSelectedNodes] = React.useState<BookmarkItem[]>([]);

  React.useEffect(() => { BookmarksActions.getPathList({ path: currentPath }).then(({data}) => {
    setBookmarks(data);
  })}, [currentPath]);

  const action: ActionsProps = { currentPath, setCurrentPath, bookmarks, setBookmarks, breadcrumb, setBreadcrumb, selectedNodes, setSelectedNodes };

  // TODO: HAY BUG con el action de mover marcadores. CUANDO se selecciona se DEBE BLOQUEAR el cambiar de carpeta, CUANDO se le da a copiar DESBLOQUEAMOS cambiar de carpeta, EN PEGAR VOLVEMOS A LA NORMALIDAD.
  // TODO: Implementar PAPELERA de bookmarks

  return <Box sx={formStyle}> 
    {bookmarks && <>
        <TitleAndListWithFolders
          title='Bookmarks'
          id='Bookmarks_0'
          path={`${currentPath}`}
          onSelectItem={(id, checked) => isSelectedItemList(action, id, checked)}
          onOutSelectionMode={() => setSelectedNodes([])}
          onMoveItem={(idList) => moveItemListToFolder(action, idList)}
          deleteAction={(id) => deleteActionList(action, id)}
          onSearch={onSearchItem}
          addAction={() => { indexNewBookmarkAdded++; addActionItemList(action, { url: `new url ${indexNewBookmarkAdded}`, title: `new title ${indexNewBookmarkAdded}`}) } }
          addFolder={() => setOpenNameFolderDialog(true)}
          goBackToParent={() => goBackToParentFolder(action)}
          list={bookmarks.map((item, index) => ({id: getIdBookmarkItem(item), isFolder: isFolder(item), item: <>{
            isFolder(item) ?
              <LabelAndTextFieldWithFolder
                backgroundColor={(index % 2 === 0) ? '#D3D3D3' : '#FFFFFF'}
                text={item.title}
                path={getPathParentFolder(item.title)}
                nameFolder={getNameFolder(item.title)}
                onChange={editFolderActionList(action, `${item.url}`)}
                setOpenFolder={(label) => setOpenFolder(action, label)}/>
            :
              <LabelAndUrlField
                backgroundColor={(index % 2 === 0) ? '#D3D3D3' : '#FFFFFF'}
                textToShow={item.title}
                textUrl={item.url}
                onChange={editActionList(action, `${item.url}`)}/>
              }
            </>
          }))}
        />    
        <ModalNewName
          handleCloseDialog={() => setOpenNameFolderDialog(false)}
          isOpenDialog={isOpenNameFolderDialog}
          title='New Folder'
          description='Write new folder name'
          defaultName={`new folder ${indexNewBookmarkAdded}`}
          onAcceptNewName={(newName) => { indexNewBookmarkAdded++; addFolderActionItemList(action, {
            pathInBookmark: cleanLabelFolder(`${currentPath}/${newName}`),
            nameFile: ''
          }) }}
        />
      </>
    }
  </Box>
};
