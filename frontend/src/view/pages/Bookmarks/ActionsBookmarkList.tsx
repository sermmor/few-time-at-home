import { Link } from "@mui/material";
import { BookmarksActions } from "../../../core/actions/bookmarks";
import { Bookmark, BookmarkItem, IndexEntry, isFolder } from "../../../data-model/bookmarks";

export interface ActionsProps {
  currentPath: string;
  setCurrentPath: React.Dispatch<React.SetStateAction<string>>;
  bookmarks: BookmarkItem[];
  setBookmarks: React.Dispatch<React.SetStateAction<BookmarkItem[]>>;
  breadcrumb: string[];
  setBreadcrumb: React.Dispatch<React.SetStateAction<string[]>>;
  selectedNodes: BookmarkItem[];
  setSelectedNodes: React.Dispatch<React.SetStateAction<BookmarkItem[]>>;
}

export const deleteActionList = ({bookmarks, setBookmarks, currentTreeNode, setCurrentTreeNode}: ActionsProps, id: string) => {
  const cloneList = [...bookmarks.data];
  const index = cloneList.findIndex(item => item.url === id);
  const elementToDelete = cloneList[index];
  cloneList.splice(index, 1);
  setBookmarks({data: [...cloneList]});

  if (currentTreeNode && isFolder(elementToDelete)) {
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

export const addActionItemList = ({bookmarks, setBookmarks, currentTreeNode, setCurrentTreeNode}: ActionsProps, itemToAdd: Bookmark) => {
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

export const addFolderActionItemList = ({bookmarks, setBookmarks, currentTreeNode, setCurrentTreeNode}: ActionsProps, itemToAdd: IndexEntry) => {
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

export const isSelectedItemList = ({bookmarks, currentTreeNode, selectedNodes, setSelectedNodes}: ActionsProps, id: string, isSelected: boolean) => {
  const cloneSelectedNodes = [...selectedNodes];
  // Search node
  const bookmarkItemIndex = bookmarks.data.findIndex(bm => bm.url === id);
  const bookmarkItem = bookmarks.data[bookmarkItemIndex];
  const indexChild = (id.indexOf(urlFolder) > -1) ? currentTreeNode.searchLabelInChild(bookmarkItem.title)
    : currentTreeNode.searchNodeLeafInChild(bookmarkItem, (node1, node2) => node1.url === node2.url);
  const treeNodeClicked = currentTreeNode.children[indexChild];

  if (isSelected) {
    cloneSelectedNodes.push(treeNodeClicked);
  } else {
    const unselectedItemIndex = selectedNodes.findIndex(bm => treeNodeClicked.node && bm.node ?  bm.node.url === treeNodeClicked.node.url : bm.label === treeNodeClicked.label);
    cloneSelectedNodes.splice(unselectedItemIndex, 1);
  }

  setSelectedNodes(cloneSelectedNodes);
}

export const moveItemListToFolder = ({setBookmarks, tree, currentTreeNode, selectedNodes}: ActionsProps, idList: string[]) => {
  idList.forEach(id => {
    const labelFrom = selectedNodes[0].label;
    const labelToMove = currentTreeNode.label;
    const equalsBookmark = (node1: BookmarkItem, node2: BookmarkItem) => node1.url === node2.url;

    selectedNodes.forEach(node => tree.moveNode(labelFrom, labelToMove, node.node, equalsBookmark));
    setBookmarks({data: currentTreeNode.children.map((item, index) => item.node ? item.node : ({title: item.label, url: `${urlFolder}_${index}`}))});
  });
}

export const onSearchItem = (textToSearch: string) => new Promise<(string | JSX.Element)[]>(resolve => {
  BookmarksActions.searchBookmarks(textToSearch).then(bookmarksGetted => {
    resolve(bookmarksGetted.data.map(({ title, url }) => 
      <p><Link href={url} target='_blank' rel='noreferrer' sx={{ marginLeft: {xs: 'none', sm:'auto'}}}>
        {title}
      </Link></p>
    ));
  })
});
