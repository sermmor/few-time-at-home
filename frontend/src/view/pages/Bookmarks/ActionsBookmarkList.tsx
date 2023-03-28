import { BookmarkItem, isFolder, urlFolder } from "../../../data-model/bookmarks";
import { GenericTree } from "../../../service/trees/genericTree";
import { PathUtils } from "../../../service/trees/pathUtils";

export interface ActionsProps {
  bookmarks: {data: BookmarkItem[]};
  setBookmarks: React.Dispatch<React.SetStateAction<{ data: BookmarkItem[]; } | undefined>>;
  currentTreeNode: GenericTree<BookmarkItem>;
  setCurrentTreeNode: React.Dispatch<React.SetStateAction<GenericTree<BookmarkItem> | undefined>>;
  breadcrumb: GenericTree<BookmarkItem>[];
  setBreadcrumb: React.Dispatch<React.SetStateAction<GenericTree<BookmarkItem>[]>>;

}

export const deleteActionList = ({bookmarks, setBookmarks, currentTreeNode, setCurrentTreeNode}: ActionsProps, id: string) => {
  const cloneList = [...bookmarks.data];
  const index = cloneList.findIndex(item => item.url === id);
  const elementToDelete = cloneList[index];
  cloneList.splice(index, 1);
  setBookmarks({data: [...cloneList]});

  if (currentTreeNode && isFolder(elementToDelete)) { // TODO: THERE IS A RANDOM CRASH HERE!!!
    const indexToRemove = currentTreeNode.searchLabelInChild(elementToDelete.title);
    const toRemove = currentTreeNode.children[indexToRemove];

    currentTreeNode.removeChild(toRemove, (item1, item2) => item1.url === item2.url);
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
    const splitNameFolder = newTitle.split('/');
    currentTreeNode.children[childIndex].renameLabelNode(splitNameFolder[splitNameFolder.length - 1]);

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

export const setOpenFolder = ({setBookmarks, currentTreeNode, setCurrentTreeNode, breadcrumb, setBreadcrumb}: ActionsProps, labelFolder: string) => {
  if (currentTreeNode) {
    const childIndex = currentTreeNode.searchLabelInChild(labelFolder);
    const newCurrentTreeNode = currentTreeNode.children[childIndex];

    const newBookmark = {data: newCurrentTreeNode.children.map((item, index) =>
      item.node ? item.node : ({title: item.label, url: `${urlFolder}_${index}`}))};
    
    const cloneBreadcrumb = [...breadcrumb];
    cloneBreadcrumb.push(currentTreeNode);

    setBreadcrumb(cloneBreadcrumb);
    setBookmarks(newBookmark);
    setCurrentTreeNode(newCurrentTreeNode);
  }
}

export const goBackToParentFolder = ({setBookmarks, setCurrentTreeNode, breadcrumb, setBreadcrumb}: ActionsProps) => {
  const cloneBreadcrumb = [...breadcrumb];
  const parentTreeNode = cloneBreadcrumb.pop();

  if (parentTreeNode) {
    const newBookmark = {data: parentTreeNode.children.map((item, index) =>
      item.node ? item.node : ({title: item.label, url: `${urlFolder}_${index}`}))};
  
    setBreadcrumb(cloneBreadcrumb);
    setBookmarks(newBookmark);
    setCurrentTreeNode(parentTreeNode);
  }
}