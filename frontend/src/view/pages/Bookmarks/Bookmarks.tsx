import { Box, SxProps, Theme } from "@mui/material";
import React from "react";
import { useTranslation } from 'react-i18next';
import { BookmarksActions } from "../../../core/actions/bookmarks";
import { FetchErrorBanner } from "../../molecules/FetchErrorBanner/FetchErrorBanner";
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const decodedPathname = decodeURIComponent(pathname);
  const bookmarkRootPath = routesFTAH.find(({name}) => name === bookmarkRouteName)?.path || '';
  const theRealPath = decodedPathname.split(bookmarkRootPath)[1];

  const [isSelectionModeFlag, setSelectionModeFlag] = React.useState(false);
  const [isOpenNameFolderDialog, setOpenNameFolderDialog] = React.useState(false);
  const [isOpenNameBookmarkDialog, setOpenNameBookmarkDialog] = React.useState(false);
  const [currentPath, setShadowPath] = React.useState<string>(!!theRealPath ? theRealPath : '/');
  const [bookmarks, setBookmarks] = React.useState<BookmarkItem[]>([]);
  const [selectedNodes, setSelectedNodes] = React.useState<BookmarkItem[]>([]);
  const [pathFromCopy, setPathFromCopy] = React.useState<string | undefined>();
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setShadowPath(!!theRealPath ? theRealPath : '/');
    setFetchError(null);
    BookmarksActions.getPathList({ path: currentPath })
      .then(({data}) => { setBookmarks(data); })
      .catch(() => setFetchError(t('common.error.loadBookmarks')));
  }, [currentPath, theRealPath]);

  const setCurrentPath = (newPath: string) => {
    setShadowPath(newPath);
    navigate(`${bookmarkRootPath}${newPath}`);
  };

  const action: ActionsProps = { currentPath, setCurrentPath, bookmarks, setBookmarks, selectedNodes, setSelectedNodes, pathFromCopy, setPathFromCopy };
  
  return <Box sx={formStyle}>
    {fetchError && <FetchErrorBanner message={fetchError} />}
    {bookmarks && <>
        <TitleAndListWithFolders
          title={t('bookmarks.title')}
          id='Bookmarks_0'
          helpSearchLabel={t('bookmarks.searchLabel')}
          path={`${currentPath}`}
          onSelectItem={(id, checked) => onSelectedItemList(action, id, checked)}
          onInSelectionMode={(isInSelected) => setSelectionModeFlag(isInSelected)}
          onOutSelectionMode={() => setSelectedNodes([])}
          onMoveItem={(idList) => moveItemListToFolder(action, idList)}
          deleteAction={(id) => deleteActionList(action, id)}
          onSearch={onSearchItem}
          addAction={() => setOpenNameBookmarkDialog(true)}
          addFolder={() => setOpenNameFolderDialog(true)}
          goBackToParent={() => goBackToParentFolder(action)}
          list={bookmarks.map((item, index) => ({id: getIdBookmarkItem(item), isFolder: isFolder(item), item: <>{
            isFolder(item) ?
              <LabelAndTextFieldWithFolder
                backgroundColor={(index % 2 === 0) ? '#D3D3D3' : '#FFFFFF'}
                text={item.pathInBookmark}
                path={getPathParentFolder(item.pathInBookmark)}
                nameFolder={getNameFolder(item.pathInBookmark)}
                isSelectionModeFlag={isSelectionModeFlag}
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
          title={t('bookmarks.newFolder')}
          description={t('bookmarks.newFolderDescription')}
          defaultName={`new folder ${indexNewBookmarkAdded}`}
          onAcceptNewName={(newName) => { indexNewBookmarkAdded++; addFolderActionItemList(action, {
            pathInBookmark: cleanLabelFolder(`${currentPath}/${newName}`),
            nameFile: ''
          }) }}
        />
        <ModalNewName
          handleCloseDialog={() => setOpenNameBookmarkDialog(false)}
          isOpenDialog={isOpenNameBookmarkDialog}
          title={t('bookmarks.newBookmark')}
          description={t('bookmarks.newBookmarkDescription')}
          defaultName={`http://www...${indexNewBookmarkAdded}`}
          onAcceptNewName={(newName) => { indexNewBookmarkAdded++; addActionItemList(action, {
            title: '',
            url: newName,
          }) }}
        />
      </>
    }
  </Box>
};
