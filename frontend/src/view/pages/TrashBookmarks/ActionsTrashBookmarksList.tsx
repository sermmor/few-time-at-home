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

export const deleteActionList = async({ setBookmarks, bookmarksByPage, currentPage }: ActionsProps, id: string) => {
  await BookmarksActions.getRemoveInTrash({url: id});
  const { data } = await BookmarksActions.getTrashList({ bookmarksByPage, currentPage});
  setBookmarks(data);
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
