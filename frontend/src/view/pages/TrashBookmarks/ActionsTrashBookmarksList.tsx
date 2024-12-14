import { Link } from "@mui/material";
import { BookmarksActions } from "../../../core/actions/bookmarks";
import { Bookmark } from "../../../data-model/bookmarks";

export interface ActionsProps {
  bookmarks: Bookmark[];
  setBookmarks: React.Dispatch<React.SetStateAction<Bookmark[]>>;
  bookmarksByPage: number;
  setBookmarksByPage: React.Dispatch<React.SetStateAction<number>>;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  numberOfPages: number;
  setNumberOfPages: React.Dispatch<React.SetStateAction<number>>;
  totalOfBookmarks: number;
  setTotalOfBookmarks: React.Dispatch<React.SetStateAction<number>>;
}

const removeDuplicatedBookmarks = (bookmarks: Bookmark[]): Bookmark[] => {
  const allItems: Bookmark[] = [];
  bookmarks.forEach(b => {
    if (!allItems.find(i => i.url === b.url)) {
      allItems.push(b);
    }
  });
  return allItems;
}

export const deleteActionList = async({
  setBookmarks,
  bookmarksByPage,
  currentPage,
  setCurrentPage,
  setNumberOfPages,
  setTotalOfBookmarks,
}: ActionsProps, id: string) => {
  await BookmarksActions.getRemoveInTrash({url: id});
  const { bookmarks, numberOfPages, totalOfBookmarks } = await BookmarksActions.getTrashList({ bookmarksByPage, currentPage});
  if (currentPage < numberOfPages) {
    setCurrentPage(numberOfPages - 1);
  }
  setBookmarks(bookmarks);
  setNumberOfPages(numberOfPages);
  setTotalOfBookmarks(totalOfBookmarks);
};

export const onSearchItem = (textToSearch: string) => new Promise<(string | JSX.Element)[]>(resolve => {
  BookmarksActions.getSearchTrash({ data: textToSearch }).then(bookmarksGetted => {
    resolve(removeDuplicatedBookmarks(bookmarksGetted.data).map(({ title, url }) => 
      <p><Link href={url} target='_blank' rel='noreferrer' sx={{ marginLeft: {xs: 'none', sm:'auto'}}}>
        {title}
      </Link></p>
    ));
  });
});

export const goToPage = async({setCurrentPage,numberOfPages}: ActionsProps, newCurrentPage: number) => {
  if (newCurrentPage >= numberOfPages || newCurrentPage < 0) return;
  setCurrentPage(newCurrentPage); // When changes currentPage, the useEffects works.
}