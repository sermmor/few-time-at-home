import { Box, Button, SxProps, Theme } from "@mui/material";
import React from "react";
import { useTranslation } from 'react-i18next';
import { BookmarksActions } from "../../../core/actions/bookmarks";
import { FetchErrorBanner } from "../../molecules/FetchErrorBanner/FetchErrorBanner";
import { LabelAndUrlField } from "../../molecules/LabelAndUrlField/LabelAndUrlField";
import { TitleAndListWithFolders } from "../../organism/TitleAndListWithFolders/TitleAndListWithFolders";
import { ActionsProps, deleteActionList, goToPage, onSearchItem,} from "./ActionsTrashBookmarksList";
import { Bookmark } from "../../../data-model/bookmarks";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const widthBoxes = {xs: '15.5rem', sm: '27rem', md: '50rem', lg: '70rem'};

const formStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
};

export const TrashBookmarks = () => {
  const { t } = useTranslation();
  const [bookmarks, setBookmarks] = React.useState<Bookmark[]>([]);

  const [bookmarksByPage, setBookmarksByPage] = React.useState<number>(50);
  const [currentPage, setCurrentPage] = React.useState<number>(0);
  const [numberOfPages, setNumberOfPages] = React.useState<number>(0);
  const [totalOfBookmarks, setTotalOfBookmarks] = React.useState<number>(0);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setFetchError(null);
    BookmarksActions.getTrashList({ bookmarksByPage, currentPage })
      .then(({ bookmarks, numberOfPages, totalOfBookmarks }) => {
        setBookmarks(bookmarks);
        setNumberOfPages(numberOfPages);
        setTotalOfBookmarks(totalOfBookmarks);
      })
      .catch(() => setFetchError(t('common.error.loadTrashBookmarks')));
  }, [bookmarksByPage, currentPage, t]);

  const action: ActionsProps = { bookmarks, bookmarksByPage, currentPage, numberOfPages, totalOfBookmarks,
    setBookmarks, setBookmarksByPage, setCurrentPage, setNumberOfPages, setTotalOfBookmarks };

  return <Box sx={formStyle}>
    {fetchError && <FetchErrorBanner message={fetchError} />}
    {bookmarks && <>
        <TitleAndListWithFolders
          title={t('trashBookmarks.title')}
          id='Trash_bookmarks_0'
          helpSearchLabel={t('trashBookmarks.searchLabel')}
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
        <Box sx={{ backgroundColor: '#ccd9ff',  width: widthBoxes }}>
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <Button disabled={currentPage === 0} onClick={() => goToPage(action, currentPage - 1)}><ArrowBackIcon /></Button>
            <Box>{t('trashBookmarks.page')} {currentPage + 1} {t('trashBookmarks.of')} {numberOfPages}</Box>
            <Button disabled={currentPage === numberOfPages - 1} onClick={() => goToPage(action, currentPage + 1)}><ArrowForwardIcon /></Button>
          </Box>
        </Box>
        <Box sx={{ display: 'flex',
          flexDirection: 'row',
          alignItems: 'start',
          justifyContent: 'left',
          width: widthBoxes,
          fontSize: '14px',
          backgroundColor: '#D3D3D3',
          marginBottom: '3rem',
        }}>
          {t('trashBookmarks.total')} {totalOfBookmarks} {t('trashBookmarks.showing')} {bookmarksByPage} {t('trashBookmarks.perPage')}
        </Box>
      </>
    }
  </Box>
};
