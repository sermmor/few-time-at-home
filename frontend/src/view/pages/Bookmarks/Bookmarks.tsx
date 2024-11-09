import { Box, Button, SxProps, Theme } from "@mui/material";
import React from "react";
import { BookmarksActions } from "../../../core/actions/bookmarks";
import { BookmarkItem, urlFolder } from "../../../data-model/bookmarks";
import { GenericTree } from "../../../service/trees/genericTree";
import { LabelAndTextFieldWithFolder } from "../../molecules/LabelAndTextFieldWithFolder/LabelAndTextFieldWithFolder";
import { LabelAndUrlField } from "../../molecules/LabelAndUrlField/LabelAndUrlField";
import { TitleAndListWithFolders } from "../../organism/TitleAndListWithFolders/TitleAndListWithFolders";
import { ActionsProps, addActionItemList, addFolderActionItemList, deleteActionList, editActionList, editFolderActionList, goBackToParentFolder, isSelectedItemList, moveItemListToFolder, onSearchItem, setOpenFolder } from "./ActionsBookmarkList";
import { ModalNewName } from "../../molecules/ModalNewName/ModalNewName";

const formStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
};

const SaveNotesComponent = ({ tree, }: { tree: GenericTree<BookmarkItem>, }) => {
  const [isSave, setSave] = React.useState<boolean>(false);
  const [isInSavingProcess, setInSavingProcess] = React.useState<boolean>(false);
  const setConfiguration = () => {
    setInSavingProcess(true);
    // console.log(GenericTree.toString(tree, current => `{${current.title} | ${current.url}}`))
    BookmarksActions.sendBookmarks({data: tree}).then(() => {
      setInSavingProcess(false);
      setSave(true);
      setTimeout(() => setSave(false), 500);
    });
  }
  return <Box
    sx={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingRight: { xs: '0rem', sm: '3rem'}, paddingBottom: '3rem'}}
    >
      <Button
        variant='contained'
        sx={{minWidth: '15.5rem'}}
        onClick={() => setConfiguration()}
        disabled={isInSavingProcess }
        >
        Save
        </Button>
        {isSave && <Box sx={{paddingLeft: '1rem'}}>Saved!</Box>}
    </Box>
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
  const [tree, setTree] = React.useState<GenericTree<BookmarkItem>>();
  const [currentTreeNode, setCurrentTreeNode] = React.useState<GenericTree<BookmarkItem>>(); // Current path === currentTreeNode.label
  const [bookmarks, setBookmarks] = React.useState<{data: BookmarkItem[]}>();
  const [breadcrumb, setBreadcrumb] = React.useState<GenericTree<BookmarkItem>[]>([]);
  const [selectedNodes, setSelectedNodes] = React.useState<GenericTree<BookmarkItem>[]>([]);
  React.useEffect(() => { BookmarksActions.getBookmarks().then(data => {
    setTree(data.data);
    setCurrentTreeNode(data.data);
    setBookmarks({data: data.data.children.map((item, index) => item.node ? item.node : ({title: item.label, url: `${urlFolder}_${index}`}))});
  })}, []);

  const action: ActionsProps = { tree: tree!, bookmarks: bookmarks!, setBookmarks, currentTreeNode: currentTreeNode!, setCurrentTreeNode, breadcrumb, setBreadcrumb, selectedNodes, setSelectedNodes};

  return <Box sx={formStyle}> 
    {bookmarks && <>
        <TitleAndListWithFolders
          title='Bookmarks'
          id='Bookmarks_0'
          path={`${currentTreeNode?.label}`}
          onSelectItem={(id, checked) => isSelectedItemList(action, id, checked)}
          onOutSelectionMode={() => setSelectedNodes([])}
          onMoveItem={(idList) => moveItemListToFolder(action, idList)}
          deleteAction={(id) => deleteActionList(action, id)}
          onSearch={onSearchItem}
          addAction={() => { indexNewBookmarkAdded++; addActionItemList(action, { url: `new url ${indexNewBookmarkAdded}`, title: `new title ${indexNewBookmarkAdded}`}) } }
          addFolder={() => setOpenNameFolderDialog(true)}
          goBackToParent={() => goBackToParentFolder(action)}
          list={bookmarks.data.map((item, index) => ({id:`${item.url}`, isFolder: item.url.indexOf(urlFolder) > -1, item: <>{
            (item.url.indexOf(urlFolder) > -1) ?
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
            title: cleanLabelFolder(`${currentTreeNode!.label}/${newName}`),
            url: `${urlFolder}_${indexNewBookmarkAdded}`
          }) }}
        />
        <SaveNotesComponent tree={tree!}/>
      </>
    }
  </Box>
};
