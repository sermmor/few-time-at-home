import { BookmarkItem, isFolder } from "../../../data-model/bookmarks";
import { GenericTree } from "../../../service/trees/genericTree";

export interface ActionsProps {
  bookmarks: {data: BookmarkItem[]};
  setBookmarks: React.Dispatch<React.SetStateAction<{ data: BookmarkItem[]; } | undefined>>;
  currentTreeNode: GenericTree<BookmarkItem>;
  setCurrentTreeNode: React.Dispatch<React.SetStateAction<GenericTree<BookmarkItem> | undefined>>;
}

export const deleteActionList = ({bookmarks, setBookmarks, currentTreeNode, setCurrentTreeNode}: ActionsProps, id: string) => {
  if (!bookmarks) return;
  const cloneList = [...bookmarks.data];
  const index = cloneList.findIndex(item => item.url === id);
  const elementToDelete = cloneList[index];
  cloneList.splice(index, 1);
  setBookmarks({data: [...cloneList]});

  if (currentTreeNode && isFolder(elementToDelete)) {
    currentTreeNode.removeChild(
      new GenericTree<BookmarkItem>(elementToDelete.title, elementToDelete), // ! IT'S WORKING FINE??? Check!!
      (item1, item2) => item1.url === item2.url
    );
    setCurrentTreeNode(currentTreeNode);
  } else if (currentTreeNode) {
    currentTreeNode.removeChild(
      new GenericTree<BookmarkItem>(currentTreeNode.label, elementToDelete),
      (item1, item2) => item1.url === item2.url
    );
    setCurrentTreeNode(currentTreeNode);
  }
};

export const addActionItemList = ({bookmarks, setBookmarks, currentTreeNode, setCurrentTreeNode}: ActionsProps, itemToAdd: BookmarkItem) => {
  if (!bookmarks) return;
  const cloneList = [...bookmarks.data];
  cloneList.push(itemToAdd);
  setBookmarks({data: [...cloneList]});

  if (currentTreeNode) {
    currentTreeNode.addChildren(currentTreeNode.label, itemToAdd);
    setCurrentTreeNode(currentTreeNode);
  }
};

export const editActionList = ({bookmarks, setBookmarks, currentTreeNode, setCurrentTreeNode}: ActionsProps, id: string) => (newTitle: string, newUrl: string) => {
  if (!bookmarks) return;
  const cloneList = [...bookmarks.data];
  const index = cloneList.findIndex(item => item.url === id);
  // cloneList[index] = {url: newUrl, title: newTitle, path: cloneList[index].path};
  const elementToEdit = {...cloneList[index]};
  cloneList[index] = {url: newUrl, title: newTitle};

  setBookmarks({data: [...cloneList]});

  if (currentTreeNode) {
    const childIndex = currentTreeNode.searchNodeLeafInChild(elementToEdit, (item1, item2) => item1.url === item2.url);
    currentTreeNode.children[childIndex].node!.title = newTitle;
    currentTreeNode.children[childIndex].node!.url = newUrl;
    
    setCurrentTreeNode(currentTreeNode);
  }
};

export const addFolderActionItemList = ({bookmarks, setBookmarks, currentTreeNode, setCurrentTreeNode}: ActionsProps, itemToAdd: BookmarkItem) => {
  if (!bookmarks) return;
  const cloneList = [...bookmarks.data];
  cloneList.push(itemToAdd);
  setBookmarks({data: [...cloneList]});

  if (currentTreeNode) {
    currentTreeNode.addChildren(currentTreeNode.label);
    setCurrentTreeNode(currentTreeNode);
  }
};
