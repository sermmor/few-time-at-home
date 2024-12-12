import { Link } from "@mui/material";
import { BookmarksActions } from "../../../core/actions/bookmarks";
import { Bookmark, BookmarkItem, getBookmarkItemById, getParentPath, IndexEntry, isEqualIdBookmarkItem } from "../../../data-model/bookmarks";

export interface ActionsProps {
  currentPath: string;
  setCurrentPath: (newPath: string) => void;
  bookmarks: BookmarkItem[];
  setBookmarks: React.Dispatch<React.SetStateAction<BookmarkItem[]>>;
  selectedNodes: BookmarkItem[];
  setSelectedNodes: React.Dispatch<React.SetStateAction<BookmarkItem[]>>;
  pathFromCopy: string | undefined;
  setPathFromCopy: React.Dispatch<React.SetStateAction<string | undefined>>;
}

export const deleteActionList = async({ currentPath, bookmarks, setBookmarks }: ActionsProps, id: string) => {
  const { item: itemToDelete, isFolder } = getBookmarkItemById(bookmarks, id);
  
  if (!itemToDelete) return;

  if (isFolder) {
    const { data } = await BookmarksActions.getRemoveFolder({ path: itemToDelete.pathInBookmark });
    setBookmarks(data);
  } else {
    const { data } = await BookmarksActions.getRemoveBookmark({ path: currentPath, url: itemToDelete.url });
    setBookmarks(data);
  }
};

export const addActionItemList = async({currentPath, bookmarks, setBookmarks}: ActionsProps, itemToAdd: Bookmark) => {
  // ONLY FOR BOOKMARKS, NOT FOLDERS
  const { data } = await BookmarksActions.getAddBookmark({...itemToAdd, path: currentPath});
  const cloneList = [...bookmarks];
  cloneList.push(data as unknown as BookmarkItem);
  setBookmarks([...cloneList]);
};

export const editActionList = async({currentPath, bookmarks, setBookmarks}: ActionsProps, id: string, newTitle: string, newUrl: string) => {
  // ONLY FOR BOOKMARKS, NOT FOLDERS
  const { item: oldItem } = getBookmarkItemById(bookmarks, id);

  if (!oldItem) return;

  const { data } = await BookmarksActions.getEditBookmark({
    path: currentPath,
    oldBookmark: {title: oldItem.title, url: oldItem.url},
    newBookmark: {title: newTitle, url: newUrl}
  });

  setBookmarks(data);
};

export const editFolderActionList = async({bookmarks, setBookmarks}: ActionsProps, id: string, newTitle: string) => {
  // ONLY FOR FOLDERS
  const { item: oldItem } = getBookmarkItemById(bookmarks, id);

  if (!oldItem) return;

  const { data } = await BookmarksActions.getEditFolder({
    oldPath: oldItem.pathInBookmark,
    newPath: newTitle, // We supposed that title is the COMPLETED path.
  });

  setBookmarks(data);
};

export const addFolderActionItemList = async({bookmarks, setBookmarks}: ActionsProps, itemToAdd: IndexEntry) => {
  // ONLY FOR FOLDERS
  const { data } = await BookmarksActions.getAddFolder({ path: itemToAdd.pathInBookmark });

  const cloneList = [...bookmarks];
  cloneList.push(data as unknown as BookmarkItem);
  setBookmarks([...cloneList]);
};

export const setOpenFolder = ({setCurrentPath}: ActionsProps, labelFolder: string) => {
  setCurrentPath(labelFolder); // This launch the useEffect, cause only editing the currentPath, getPathList and setBookmarks will launch updating the bookmarks.
}

export const goBackToParentFolder = ({ currentPath, setCurrentPath}: ActionsProps): string => {
  const parentPath = getParentPath(currentPath);
  
  if (parentPath) {
    setCurrentPath(parentPath); // This launch the useEffect, cause only editing the currentPath, getPathList and setBookmarks will launch updating the bookmarks.
    return parentPath;
  }
  setCurrentPath('/'); // This launch the useEffect, cause only editing the currentPath, getPathList and setBookmarks will launch updating the bookmarks.
  return '/';
}

export const onSelectedItemList = ({ currentPath, bookmarks, selectedNodes, setSelectedNodes, setPathFromCopy }: ActionsProps, id: string, isSelected: boolean) => {
  const { item: itemToSelectOrUnselect } = getBookmarkItemById(bookmarks, id);
  
  if (!itemToSelectOrUnselect) return;

  const cloneSelectedNodes = [...selectedNodes];
  if (isSelected) {
    setPathFromCopy(currentPath);
    cloneSelectedNodes.push({
      ...itemToSelectOrUnselect,
    });
  } else {
    const unselectedItemIndex = selectedNodes.findIndex(bm => isEqualIdBookmarkItem(bm, id));
    cloneSelectedNodes.splice(unselectedItemIndex, 1);
  }

  setSelectedNodes(cloneSelectedNodes);
}

export const moveItemListToFolder = async({currentPath, pathFromCopy, setBookmarks, selectedNodes}: ActionsProps, idList: string[]) => {
  if (!idList || idList.length === 0 || !pathFromCopy) return;
  
  const itemsToPasteList: BookmarkItem[] = idList.map(id => getBookmarkItemById(selectedNodes, id).item).filter(item => !!item) as unknown as BookmarkItem[];
  const { data } = await BookmarksActions.getMove({
    newPath: currentPath,
    oldPath: pathFromCopy,
    toMove: itemsToPasteList,
  });

  setBookmarks(data);
}

export const onSearchItem = (textToSearch: string) => new Promise<(string | JSX.Element)[]>(resolve => {
  BookmarksActions.getSearch({ data: textToSearch }).then(bookmarksGetted => {
    resolve(bookmarksGetted.data.map(({ title, url }) => 
      <p><Link href={url} target='_blank' rel='noreferrer' sx={{ marginLeft: {xs: 'none', sm:'auto'}}}>
        {title}
      </Link></p>
    ));
  });
});
