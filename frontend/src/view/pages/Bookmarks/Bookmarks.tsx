import { Box, Button, SxProps, Theme } from "@mui/material";
import React from "react";
import { BookmarksActions } from "../../../core/actions/bookmarks";
import { BookmarkItem, BookmarksDataModel } from "../../../data-model/bookmarks";
import { LabelAndDoubleTextField } from "../../molecules/LabelAndDoubleTextField/LabelAndDoubleTextField";
import { TitleAndList } from "../../organism/TitleAndList/TitleAndList";

const formStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
};

const SaveNotesComponent = ({bookmarks}: {bookmarks: BookmarksDataModel}) => {
  const [isSave, setSave] = React.useState<boolean>(false);
  const setConfiguration = () => {
    BookmarksActions.sendBookmarks(bookmarks);
    setSave(true);
    setTimeout(() => setSave(false), 500);
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
  const [bookmarks, setBookmarks] = React.useState<BookmarksDataModel>();
  React.useEffect(() => { BookmarksActions.getBookmarks().then(data => setBookmarks(data)) }, []);

  const deleteActionList = (id: string) => {
    if (!bookmarks) return;
    const cloneList = [...bookmarks.data];
    const index = cloneList.findIndex(item => item.url === id);
    cloneList.splice(index, 1);
    setBookmarks({data: [...cloneList]});
  };

  const addActionList = (itemToAdd: BookmarkItem) => {
    if (!bookmarks) return;
    const cloneList = [...bookmarks.data];
    cloneList.push(itemToAdd);
    indexNewBookmarkAdded++;
    setBookmarks({data: [...cloneList]});
  };
  
  const editActionList = (id: string) => (newTitle: string, newUrl: string) => {
    if (!bookmarks) return;
    const cloneList = [...bookmarks.data];
    const index = cloneList.findIndex(item => item.url === id);
    cloneList[index] = {url: newUrl, title: newTitle};
    setBookmarks({data: [...cloneList]});
  };
  
  return <Box sx={formStyle}> 
    {bookmarks && <>
        <TitleAndList
          title='Bookmarks'
          deleteAction={deleteActionList}
          addAction={() => addActionList({ url: `new url ${indexNewBookmarkAdded}`, title: `new title ${indexNewBookmarkAdded}` }) }
          list={bookmarks.data.map((item) => ({id:`${item.url}`, item: <LabelAndDoubleTextField
            textToShow={item.title}
            textUrl={item.url}
            onChange={editActionList(`${item.url}`)}/>
          }))}
        />
        <SaveNotesComponent bookmarks={bookmarks}/>
      </>
    }
  </Box>
};
