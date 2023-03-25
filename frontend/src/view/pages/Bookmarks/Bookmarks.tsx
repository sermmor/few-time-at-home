import { Box, Button, SxProps, Theme } from "@mui/material";
import React from "react";
import { BookmarksActions } from "../../../core/actions/bookmarks";
import { BookmarkItem, BookmarksDataModel, isFolder, urlFolder } from "../../../data-model/bookmarks";
import { GenericTree } from "../../../service/trees/genericTree";
import { LabelAndUrlField } from "../../molecules/LabelAndUrlField/LabelAndUrlField";
import { TitleAndListWithFolders } from "../../organism/TitleAndDraggableList/TitleAndDraggableList";
import { ActionsProps, addActionItemList, deleteActionList, editActionList } from "./ActionsBookmarkList";

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
  const setConfiguration = () => {
    // console.log(GenericTree.toString(tree, current => `{${current.title} | ${current.url}}`))
    BookmarksActions.sendBookmarks({data: tree}).then(() => {
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
        >
        Save
        </Button>
        {isSave && <Box sx={{paddingLeft: '1rem'}}>Saved!</Box>}
    </Box>
};

let indexNewBookmarkAdded = 0;

export const Bookmarks = () => {
  const [tree, setTree] = React.useState<GenericTree<BookmarkItem>>();
  const [currentTreeNode, setCurrentTreeNode] = React.useState<GenericTree<BookmarkItem>>(); // Current path === currentTreeNode.label
  const [bookmarks, setBookmarks] = React.useState<{data: BookmarkItem[]}>();
  React.useEffect(() => { BookmarksActions.getBookmarks().then(data => {
    setTree(data.data);
    setCurrentTreeNode(data.data);
    setBookmarks({data: data.data.children.map((item, index) => item.node ? item.node : ({title: item.label, url: `${urlFolder}_${index}`}))})
  })}, []);

  const action: ActionsProps = { bookmarks: bookmarks!, setBookmarks, currentTreeNode: currentTreeNode!, setCurrentTreeNode, };

  // TODO: ADD folder, RENAME folder, OPEN folder, REMOVE folder, and MOVE items to folder.
  
  return <Box sx={formStyle}> 
    {bookmarks && <>
        <TitleAndListWithFolders
          title='Bookmarks'
          id='Bookmarks_0'
          deleteAction={(id) => deleteActionList(action, id)}
          // addAction={() => addActionList({ url: `new url ${indexNewBookmarkAdded}`, title: `new title ${indexNewBookmarkAdded}`, path: currentlyPath! }) }
          addAction={() => {indexNewBookmarkAdded++; addActionItemList(action, { url: `new url ${indexNewBookmarkAdded}`, title: `new title ${indexNewBookmarkAdded}`})} }
          list={bookmarks.data.map((item) => ({id:`${item.url}`, isFolder: false, item: <LabelAndUrlField
            textToShow={item.title}
            textUrl={item.url}
            onChange={editActionList(action, `${item.url}`)}/>
          }))}
        />
        <SaveNotesComponent tree={tree!}/>
      </>
    }
  </Box>
};
