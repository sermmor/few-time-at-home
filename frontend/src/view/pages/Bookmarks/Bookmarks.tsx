import { Box, Button, SxProps, Theme } from "@mui/material";
import React from "react";
import { BookmarksActions } from "../../../core/actions/bookmarks";
import { LabelAndTextFieldWithFolder } from "../../molecules/LabelAndTextFieldWithFolder/LabelAndTextFieldWithFolder";
import { LabelAndUrlField } from "../../molecules/LabelAndUrlField/LabelAndUrlField";
import { TitleAndListWithFolders } from "../../organism/TitleAndListWithFolders/TitleAndListWithFolders";
import { ActionsProps, addActionItemList, addFolderActionItemList, deleteActionList, editActionList, editFolderActionList, goBackToParentFolder, onSelectedItemList, moveItemListToFolder, onSearchItem, setOpenFolder } from "./ActionsBookmarkList";
import { ModalNewName } from "../../molecules/ModalNewName/ModalNewName";
import { BookmarkItem, getIdBookmarkItem, isFolder } from "../../../data-model/bookmarks";
import { useLocation, useNavigate } from "react-router-dom";
import { bookmarkRouteName, routesFTAH } from "../../Routes";

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
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const decodedPathname = decodeURIComponent(pathname);
  const bookmarkRootPath = routesFTAH.find(({name}) => name === bookmarkRouteName)?.path || '';
  const theRealPath = decodedPathname.split(bookmarkRootPath)[1];

  const [isOpenNameFolderDialog, setOpenNameFolderDialog] = React.useState(false);
  const [currentPath, setShadowPath] = React.useState<string>(!!theRealPath ? theRealPath : '/');
  const [bookmarks, setBookmarks] = React.useState<BookmarkItem[]>([]);
  const [selectedNodes, setSelectedNodes] = React.useState<BookmarkItem[]>([]);
  const [pathFromCopy, setPathFromCopy] = React.useState<string | undefined>();

  React.useEffect(() => {
    setShadowPath(!!theRealPath ? theRealPath : '/');
    BookmarksActions.getPathList({ path: currentPath }).then(({data}) => {
      setBookmarks(data);
    })}, [currentPath, theRealPath]);

  const setCurrentPath = (newPath: string) => {
    setShadowPath(newPath);
    navigate(`${bookmarkRootPath}${newPath}`);
  };

  const action: ActionsProps = { currentPath, setCurrentPath, bookmarks, setBookmarks, selectedNodes, setSelectedNodes, pathFromCopy, setPathFromCopy };

  // TODO: REVISAR crear marcador/carpeta, borrar marcador/carpeta, editar marcador/carpeta, mover marcadores y carpetas
  // TODO: HAY BUG con el action de mover marcadores. CUANDO se selecciona se DEBE BLOQUEAR el cambiar de carpeta, CUANDO se le da a copiar DESBLOQUEAMOS cambiar de carpeta, EN PEGAR VOLVEMOS A LA NORMALIDAD.
  // TODO: Implementar PAPELERA de bookmarks

  return <Box sx={formStyle}> 
    {bookmarks && <>
        <TitleAndListWithFolders
          title='Bookmarks'
          id='Bookmarks_0'
          path={`${currentPath}`}
          onSelectItem={(id, checked) => onSelectedItemList(action, id, checked)}
          onOutSelectionMode={() => setSelectedNodes([])}
          onMoveItem={(idList) => moveItemListToFolder(action, idList)}
          deleteAction={(id) => deleteActionList(action, id)}
          onSearch={onSearchItem}
          // TODO: SUSTITUIR LO DEL addAction de ABAJO POR LANZAR EL ModalNewName QUE YA LANZARÁ EL addActionItemList CON LOS DATOS REALES
          //addAction={() => { indexNewBookmarkAdded++; addActionItemList(action, { url: `new url ${indexNewBookmarkAdded}`, title: `new title ${indexNewBookmarkAdded}`}) } }
          addFolder={() => setOpenNameFolderDialog(true)}
          goBackToParent={() => goBackToParentFolder(action)}
          list={bookmarks.map((item, index) => ({id: getIdBookmarkItem(item), isFolder: isFolder(item), item: <>{
            isFolder(item) ?
              <LabelAndTextFieldWithFolder
                backgroundColor={(index % 2 === 0) ? '#D3D3D3' : '#FFFFFF'}
                text={item.pathInBookmark}
                path={getPathParentFolder(item.pathInBookmark)}
                nameFolder={getNameFolder(item.pathInBookmark)}
                onChange={(newText: string) => editFolderActionList(action, `${getIdBookmarkItem(item)}`, newText)}
                setOpenFolder={(label) => setOpenFolder(action, label)}/>
            :
              <LabelAndUrlField
                backgroundColor={(index % 2 === 0) ? '#D3D3D3' : '#FFFFFF'}
                textToShow={item.title}
                textUrl={item.url}
                onChange={(newTextToShow: string, newtextUrl: string) => editActionList(action, `${getIdBookmarkItem(item)}`, newTextToShow, newtextUrl)}/>
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
