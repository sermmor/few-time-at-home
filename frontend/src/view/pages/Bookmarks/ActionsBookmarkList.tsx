import { BookmarkItem, isFolder, urlFolder } from "../../../data-model/bookmarks";
import { GenericTree } from "../../../service/trees/genericTree";

export interface ActionsProps {
  bookmarks: {data: BookmarkItem[]};
  setBookmarks: React.Dispatch<React.SetStateAction<{ data: BookmarkItem[]; } | undefined>>;
  currentTreeNode: GenericTree<BookmarkItem>;
  setCurrentTreeNode: React.Dispatch<React.SetStateAction<GenericTree<BookmarkItem> | undefined>>;
}

export const deleteActionList = ({bookmarks, setBookmarks, currentTreeNode, setCurrentTreeNode}: ActionsProps, id: string) => {
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
  const cloneList = [...bookmarks.data];
  cloneList.push(itemToAdd);
  setBookmarks({data: [...cloneList]});

  if (currentTreeNode) {
    currentTreeNode.addChildren(currentTreeNode.label, itemToAdd);
    setCurrentTreeNode(currentTreeNode);
  }
};

export const editActionList = ({bookmarks, setBookmarks, currentTreeNode, setCurrentTreeNode}: ActionsProps, id: string) => (newTitle: string, newUrl: string) => {
  const cloneList = [...bookmarks.data];
  const index = cloneList.findIndex(item => item.url === id);
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

export const editFolderActionList = ({bookmarks, setBookmarks, currentTreeNode, setCurrentTreeNode}: ActionsProps, id: string) => (newTitle: string) => {
  const cloneList = [...bookmarks.data];
  const index = cloneList.findIndex(item => item.url === id);
  const elementToEdit = {...cloneList[index]};
  cloneList[index] = {url: id, title: newTitle};

  setBookmarks({data: [...cloneList]});

  if (currentTreeNode) {
    const childIndex = currentTreeNode.searchLabelInChild(elementToEdit.title);
    currentTreeNode.children[childIndex].label = newTitle;

    setCurrentTreeNode(currentTreeNode);
  }
};

export const addFolderActionItemList = ({bookmarks, setBookmarks, currentTreeNode, setCurrentTreeNode}: ActionsProps, itemToAdd: BookmarkItem) => {
  const cloneList = [...bookmarks.data];
  cloneList.push(itemToAdd);
  setBookmarks({data: [...cloneList]});

  if (currentTreeNode) {
    currentTreeNode.addChildren(itemToAdd.title);
    setCurrentTreeNode(currentTreeNode);
  }
};

export const setOpenFolder = ({bookmarks, setBookmarks, currentTreeNode, setCurrentTreeNode}: ActionsProps, labelFolder: string) => {
  if (currentTreeNode) {
    const childIndex = currentTreeNode.searchLabelInChild(labelFolder);
    const newCurrentTreeNode = currentTreeNode.children[childIndex];

    const newBookmark = {data: newCurrentTreeNode.children.map((item, index) =>
      item.node ? item.node : ({title: item.label, url: `${urlFolder}_${index}`}))};
    
    setBookmarks(newBookmark);
    setCurrentTreeNode(newCurrentTreeNode);
  }
}