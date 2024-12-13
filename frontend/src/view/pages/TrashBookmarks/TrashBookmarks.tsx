import { Box, Button, SxProps, Theme } from "@mui/material";
import React from "react";
import { BookmarksActions } from "../../../core/actions/bookmarks";
import { LabelAndUrlField } from "../../molecules/LabelAndUrlField/LabelAndUrlField";
import { TitleAndListWithFolders } from "../../organism/TitleAndListWithFolders/TitleAndListWithFolders";
import { ActionsProps, deleteActionList, onSearchItem,} from "./ActionsTrashBookmarksList";
import { Bookmark } from "../../../data-model/bookmarks";

const formStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
};

export const TrashBookmarks = () => {
  const [bookmarks, setBookmarks] = React.useState<Bookmark[]>([]);

  const [bookmarksByPage, setBookmarksByPage] = React.useState<number>(5);
  const [currentPage, setCurrentPage] = React.useState<number>(0);
  

  React.useEffect(() => {
    BookmarksActions.getTrashList({ bookmarksByPage, currentPage}).then(({ data }) => {
      setBookmarks(data);
    });
  }, [bookmarksByPage, currentPage]);

  const action: ActionsProps = { bookmarks, bookmarksByPage, currentPage, setBookmarks, setBookmarksByPage, setCurrentPage };

  // TODO: Poner botones de siguiente página y anterior página y de número actual de página.

  return <Box sx={formStyle}> 
    {bookmarks && <>
        <TitleAndListWithFolders
          title='Trash Bookmarks'
          id='Trash_bookmarks_0'
          helpSearchLabel='Search in trash bookmarks'
          noActionsMode={true}
          deleteAction={(id) => deleteActionList(action, id)}
          onSearch={onSearchItem}
          list={bookmarks.map((item, index) => ({id: item.url, isFolder: false, item:
            <LabelAndUrlField
              backgroundColor={(index % 2 === 0) ? '#D3D3D3' : '#FFFFFF'}
              textToShow={item.title}
              textUrl={item.url}
            />
          }))}
        />
      </>
    }
  </Box>
};
