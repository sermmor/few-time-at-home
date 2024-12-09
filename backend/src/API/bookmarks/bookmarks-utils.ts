import { mkdir, readdir, rename, rm, stat } from "fs/promises";
import { readJSONFile, saveInAFilePromise } from "../../utils";

export interface Bookmark {
  url: string;
  title: string;
  path?: string; // Param deprecated, only used in searchs but not saved in bookmarks files.
}

export interface BookmarkIndexEntry {
  nameFile: string;
  pathInBookmark: string;
}

const oldBookmarkPathFile = 'data/bookmark.json';
const bookmarkFolderPath = 'data/bookmarks';
const bookmarkIndexFilePath = 'data/bookmarks/index.json';
const bookmarkTrashFilePath = 'data/bookmarks/trash.json';

const isUsingOldBookmark = async(): Promise<boolean> => {
  let isUsingOld = false;
  try {
    const stats = await stat(bookmarkIndexFilePath);
  } catch (err) {
    isUsingOld = true;
  }
  return isUsingOld;
}

const createNewBookmark = async() => {
  try {
    const stats = await stat(bookmarkFolderPath);
  } catch (err) {
    await mkdir(bookmarkFolderPath, {recursive: true});
    console.log(`Folder ${bookmarkFolderPath} created correctly.`);
  }
  try {
    const stats = await stat(bookmarkIndexFilePath);
  } catch (err) {
    await saveInAFilePromise('[]', bookmarkIndexFilePath);
    console.log(`File ${bookmarkIndexFilePath} created correctly.`);
  }
  try {
    const stats = await stat(bookmarkTrashFilePath);
  } catch (err) {
    await saveInAFilePromise('[]', bookmarkTrashFilePath);
    console.log(`File ${bookmarkTrashFilePath} created correctly.`);
  }
}

export const parseFromOldBookmarks = async(): Promise<void> => {
  const isOld = await isUsingOldBookmark();
  if (!isOld) return;

  const dataJson = await readJSONFile(oldBookmarkPathFile, '[]');
  const allJson = dataJson as Bookmark[];

  const allPaths = allJson.map(b => b.path || '/').filter((item, pos, self) => self.indexOf(item) === pos);

  await createNewBookmark();

  let currentPath: string;
  let nameFile: string;
  let bookmarks: Bookmark[];
  const indexList: BookmarkIndexEntry[] = [];

  for (let i = 0; i < allPaths.length; i++) {
    currentPath = allPaths[i];
    nameFile = `${bookmarkFolderPath}/b${i}.json`;
    bookmarks = allJson.filter(b => b.path === currentPath).map(({ title, url}) => ({ title, url }));
    await saveInAFilePromise(JSON.stringify(bookmarks, null, 2), nameFile);
    indexList.push({ nameFile, pathInBookmark: currentPath });
  }

  await saveInAFilePromise(JSON.stringify(indexList, null, 2), bookmarkIndexFilePath);
  
  await rename(oldBookmarkPathFile, `${oldBookmarkPathFile}.old`);
};

// Not only the first time. When we use operations like rename, delete or add, we'll need to reload the indexList.
export const reloadIndexList = async(): Promise<BookmarkIndexEntry[]> => {
  const indexList: BookmarkIndexEntry[] = await readJSONFile(bookmarkIndexFilePath, '[]');
  return indexList;
}

const getAllFolderListInPath = (indexList: BookmarkIndexEntry[], currentPath: string): BookmarkIndexEntry[] => {
  if ("/" === currentPath) {
    return indexList.filter(entry => entry.pathInBookmark !== '/' && entry.pathInBookmark.split('/').length === 2);
  } else {
    return indexList.filter(entry => 
      entry.pathInBookmark.substring(0, currentPath.length) === currentPath
    );
  }
};

const pathLength = (path: string): number => '/' === path ? 1 : path.split('/').length;

// For openFolder action (like an "ls" command)
export const getAllFilesAndDirectoriesOfFolderPath = async(indexList: BookmarkIndexEntry[], folderPathInBookmark: string): Promise<(BookmarkIndexEntry | Bookmark)[]> => {
  // We extract first the subfolders in the indexList.
  let allFolders: BookmarkIndexEntry[] = getAllFolderListInPath(indexList, folderPathInBookmark);

  // Check shadow folders (folders without bookmarks and without files)
  const shadowFoldersList: BookmarkIndexEntry[] = [];
  let spliterShadowFolder: string[];
  let currentShadowFolder: string;
  allFolders.forEach((f, i) => {
    if (pathLength(f.pathInBookmark) > pathLength(folderPathInBookmark) + 1) {
      spliterShadowFolder = f.pathInBookmark.split('/').slice(0, pathLength(folderPathInBookmark) + 1);
      currentShadowFolder = spliterShadowFolder.join('/');
      if (!shadowFoldersList.find(f => f.pathInBookmark === currentShadowFolder) && !allFolders.find(f => f.pathInBookmark === currentShadowFolder)) {
        shadowFoldersList.push({
          nameFile: `shadow_${i}`,
          pathInBookmark: currentShadowFolder,
        })
      }
    }
  });
  allFolders = [...allFolders, ...shadowFoldersList];

  // We filter the folder itself and the "grandchildren" folders.
  allFolders = allFolders.filter(f =>
    f.pathInBookmark !== folderPathInBookmark
    && pathLength(f.pathInBookmark) === pathLength(folderPathInBookmark) + 1
  );

  // We get the file bookmark entry content.
  const entry = indexList.find(({ pathInBookmark }) => pathInBookmark === folderPathInBookmark);
  const allBookmarks: Bookmark[] = entry ? await readJSONFile(entry.nameFile, '[]') : [];

  return [
    ...allFolders.sort((a, b) => a.pathInBookmark.localeCompare(b.pathInBookmark)),
    ...allBookmarks.sort((a, b) => a.title.localeCompare(b.title)),
  ];
}

export const removeBookmark = async(indexList: BookmarkIndexEntry[], pathFolderInBookmark: string, urlBookmarkToDelete: string) => {
  const nameFileBookmarkPath = indexList.filter(b => b.pathInBookmark === pathFolderInBookmark)[0].nameFile;
  const dataJson: Bookmark[] = await readJSONFile(nameFileBookmarkPath, '[]');
  const newDataJson = dataJson.filter(b => b.url !== urlBookmarkToDelete);
  const entryDeleted = dataJson.filter(b => b.url === urlBookmarkToDelete)[0];
  
  // We save in trash the entry
  const trashDataJson: Bookmark[] = await readJSONFile(bookmarkTrashFilePath, '[]');
  trashDataJson.push(entryDeleted);
  await saveInAFilePromise(JSON.stringify(trashDataJson, null, 2), bookmarkTrashFilePath);

  // We save in bookmark file, the content without the entry selected to delete.
  await saveInAFilePromise(JSON.stringify(newDataJson, null, 2), nameFileBookmarkPath);
};

export const removeFolder = async(indexList: BookmarkIndexEntry[], pathFolderInBookmark: string) => {
  // Create new indexList to save.
  const allSubFolders: BookmarkIndexEntry[] = getAllFolderListInPath(indexList, pathFolderInBookmark);
  const indexWithoutDeletedEntry: BookmarkIndexEntry[] = indexList.filter(entry => 
    entry.pathInBookmark !== pathFolderInBookmark
    && allSubFolders.filter(subFolderEntry => subFolderEntry.pathInBookmark === entry.pathInBookmark).length === 0
  );
  
  // Save content of the subfolders.
  const entry = indexList.find(({ pathInBookmark }) => pathInBookmark === pathFolderInBookmark);
  let bookmarksToSaveInTrash: Bookmark[] = entry ? await readJSONFile(entry.nameFile, '[]') : [];
  for (let i = 0; i < allSubFolders.length; i++) {
    const allSubEntries: Bookmark[] = await readJSONFile(allSubFolders[i].nameFile, '[]');
    bookmarksToSaveInTrash = [...bookmarksToSaveInTrash, ...allSubEntries];
  }

  // We save in trash all the bookmarks deleted.
  const trashDataJson: Bookmark[] = await readJSONFile(bookmarkTrashFilePath, '[]');
  await saveInAFilePromise(JSON.stringify([...trashDataJson, ...bookmarksToSaveInTrash], null, 2), bookmarkTrashFilePath);
  
  // Remove all subfolders and the main folder.
  for (let i = 0; i < allSubFolders.length; i++) {
    await rm(allSubFolders[i].nameFile);
  }
  // if (entry) { // Is already deleted because it's in the allSubFolders list.
  //   await rm(entry.nameFile);
  // }

  // Save the new index content.
  await saveInAFilePromise(JSON.stringify(indexWithoutDeletedEntry, null, 2), bookmarkIndexFilePath);
};

export const editFolder = async(indexList: BookmarkIndexEntry[], oldPathFolderInBookmark: string, newPathFolderInBookmark: string) => {
  // Change name folder in the file index (the propierty 'path' in the b.json is DEPRECATED).
  const entry = indexList.filter(b => b.pathInBookmark === oldPathFolderInBookmark)[0];
  const allSubFoldersOld: BookmarkIndexEntry[] = getAllFolderListInPath(indexList, oldPathFolderInBookmark);
  const newIndexListWithoutFoldersEdited = indexList.filter(entry2 => 
    entry2.pathInBookmark !== oldPathFolderInBookmark
    && allSubFoldersOld.filter(subFolderEntry => subFolderEntry.pathInBookmark === entry2.pathInBookmark).length === 0
  );

  // Update folder and subfolder names.
  entry.pathInBookmark = newPathFolderInBookmark;
  const allSubFoldersNew: BookmarkIndexEntry[] = allSubFoldersOld.map(({ nameFile, pathInBookmark }) => ({
    nameFile,
    pathInBookmark: pathInBookmark.split(oldPathFolderInBookmark).join(newPathFolderInBookmark),
  }));
  const entryDuplicated = allSubFoldersNew.find(b => b.nameFile === entry.nameFile);
  if (!entryDuplicated) {
    allSubFoldersNew.push(entry);
  } else {
    entryDuplicated.pathInBookmark = newPathFolderInBookmark;
  }

  // Create result with folders edited and not edited and save index.
  await saveInAFilePromise(JSON.stringify([...newIndexListWithoutFoldersEdited, ...allSubFoldersNew], null, 2), bookmarkIndexFilePath);
};

export const editBookmark = async(nameFileBookmarkPath: string, oldBookmark: Bookmark, newBookmark: Bookmark) => {
  const dataJson: Bookmark[] = await readJSONFile(nameFileBookmarkPath, '[]');
  const dataJsonWithoutBookmark = dataJson.filter(b => b.url !== oldBookmark.url);

  // We save in bookmark file, the content without the entry selected to delete.
  await saveInAFilePromise(JSON.stringify([...dataJsonWithoutBookmark, newBookmark], null, 2), nameFileBookmarkPath);
};

export const createBookmark = async(indexList: BookmarkIndexEntry[], pathFolderInBookmark: string, bookmark: Bookmark) => {
  const entry = indexList.find(b => b.pathInBookmark === pathFolderInBookmark);
  if (!entry) return;
  const dataJson: Bookmark[] = await readJSONFile(entry.nameFile, '[]');
  const isAlreadyAdded = !!dataJson.find(b => b.url === bookmark.url);
  if (!isAlreadyAdded) {
    dataJson.push(bookmark);
    await saveInAFilePromise(JSON.stringify(dataJson, null, 2), entry.nameFile);
  }
};

const searchNextIndexFree = (indexList: BookmarkIndexEntry[]): number => {
  const allIndex: number[] = indexList.map(i => +i.nameFile.split("data/bookmarks/b")[1].split(".json")[0]);
  const allIndexSorted = allIndex.sort((a, b) => a - b);
  let newIndex = 0;
  for (let i = 0; i < allIndexSorted.length; i++) {
    if (allIndexSorted[i] === newIndex) {
      newIndex++;
    } else {
      return newIndex;
    }
  }
  return newIndex;
}

export const createFolder = async(indexList: BookmarkIndexEntry[], newPathInBookmark: string): Promise<BookmarkIndexEntry> => {
  const indexAlreadyAdded = indexList.find(i => i.pathInBookmark === newPathInBookmark);
  if (!indexAlreadyAdded) {
    const indexNewBookmark = searchNextIndexFree(indexList);
    const nameFile = `${bookmarkFolderPath}/b${indexNewBookmark}.json`;
    const newFolder: BookmarkIndexEntry = {
      nameFile,
      pathInBookmark: newPathInBookmark,
    }
    indexList.push(newFolder);
    await saveInAFilePromise('[]', nameFile);
    await saveInAFilePromise(JSON.stringify(indexList, null, 2), bookmarkIndexFilePath);
    return newFolder;
  } else {
    return indexAlreadyAdded;
  }
};

export const removeBookmarkFromTrash = async(urlBookmark: string): Promise<Bookmark[]> => {
  // Remove forever a bookmark from trash.json (in trash NO FOLDER, NEVER).
  const dataJson: Bookmark[] = await readJSONFile(bookmarkTrashFilePath, '[]');
  const newData = dataJson.filter(b => urlBookmark !== b.url);
  await saveInAFilePromise(JSON.stringify(newData, null, 2), bookmarkTrashFilePath);
  
  return newData;
};

export const getTrash = async(bookmarksByPage: number, currentPage: number): Promise<Bookmark[]> => {
  // The trash is paginated (50 bookmarks by page is a good number).
  const dataJson: Bookmark[] = await readJSONFile(bookmarkTrashFilePath, '[]');

  // Remove repeated elements.
  const allItems: Bookmark[] = [];
  dataJson.forEach(b => {
    if (!allItems.find(i => i.url === b.url)) {
      allItems.push(b);
    }
  });
  
  // Get index init and index end, and check edge cases.
  let initBookmarkToReturn = bookmarksByPage * currentPage;
  
  if (initBookmarkToReturn >= allItems.length) {
    initBookmarkToReturn = allItems.length - bookmarksByPage;
    initBookmarkToReturn = initBookmarkToReturn < 0 ? 0 : initBookmarkToReturn;
  }

  let endBookmarkToReturn = (bookmarksByPage * (currentPage + 1)) - 1;

  if (endBookmarkToReturn > allItems.length) {
    endBookmarkToReturn = allItems.length - 1;
  }

  if (endBookmarkToReturn < 0) {
    endBookmarkToReturn = allItems.length - 1;
  }

  return allItems.slice(initBookmarkToReturn, endBookmarkToReturn + 1);
};

const searchPredicate = (bm: Bookmark, path: string) => (w: string): boolean => bm.title.toLowerCase().indexOf(w) >= 0
  || bm.url.toLowerCase().indexOf(w) >= 0
  || path.toLowerCase().indexOf(w) >= 0;

const searchInBookmark = (wordlist: string, bookmarkList: Bookmark[]): Bookmark[] => {
  // The bookmarks had 1 or more words.
  const words = wordlist.toLowerCase().split(' ').filter(value => value !== '');
  const maxResults = 100;
  const resultOr = bookmarkList.filter(bm => words.filter(
    searchPredicate(bm, bm.path || '')
  ).length > 0);

  const resultAnd = bookmarkList.filter(bm => {
    let w: string;
    const searchCondition = searchPredicate(bm, bm.path || '');
    for (let i = 0; i < words.length; i++) {
      w = words[i];
      if (!searchCondition(w)) {
        return false;
      }
    }
    return true;
  });

  // Create results, the first ones has to be the results with all results. Then the or results. The and results are in the or results, so...
  const resultsOrWithoutAnd = resultOr.filter(bmOr => resultAnd.findIndex(bmAnd => bmAnd.url === bmOr.url) === -1);
  const result = resultAnd.concat(resultsOrWithoutAnd);

  return (result.length > maxResults) ? result.slice(0, maxResults) : result;
};

export const searchInAllBookmarks = async(indexList: BookmarkIndexEntry[], wordlist: string): Promise<Bookmark[]> => {
  // Get all the bookmarks and then search in the collection.
  let allBookmarks: Bookmark[] = [];
  let currentPath: string;
  let currentBookmarks: Bookmark[];
  for (let i = 0; i < indexList.length; i++) {
    currentPath = indexList[i].pathInBookmark;
    currentBookmarks = await readJSONFile(indexList[i].nameFile, '[]');
    currentBookmarks = currentBookmarks.map(b => ({
      ...b,
      path: currentPath,
    }));
    allBookmarks = [...allBookmarks, ...currentBookmarks];
  }
  return searchInBookmark(wordlist, allBookmarks);
};

export const searchAllBookmarksInTrash = async(wordlist: string): Promise<Bookmark[]> => {
  const dataJson: Bookmark[] = await readJSONFile(bookmarkTrashFilePath, '[]');
  return searchInBookmark(wordlist, dataJson);
};

const moveBookmarks = async (
  indexList: BookmarkIndexEntry[],
  toMove: (BookmarkIndexEntry | Bookmark)[],
  oldPath: string,
  newPath: string,
) => {
  const entryNewFolder = indexList.filter(b => b.pathInBookmark === newPath)[0];
  const entryOldFolder = indexList.filter(b => b.pathInBookmark === oldPath)[0];

  const bookmarksToMove: Bookmark[] = toMove.filter(item => 'url' in item) as Bookmark[];
  const bookmarksInNewFolder: Bookmark[] = await readJSONFile(entryNewFolder.nameFile, '[]');
  const bookmarksInOldFolder: Bookmark[] = await readJSONFile(entryOldFolder.nameFile, '[]');
  const bookmarksNoMove = bookmarksInOldFolder.filter(b => !bookmarksToMove.find(b2 => b.url === b2.url));

  await saveInAFilePromise(JSON.stringify(bookmarksNoMove, null, 2), oldPath);
  await saveInAFilePromise(JSON.stringify([...bookmarksInNewFolder, ...bookmarksToMove], null, 2), newPath);
};

const moveFolders = async (
  indexList: BookmarkIndexEntry[],
  toMove: (BookmarkIndexEntry | Bookmark)[],
  oldPath: string,
  newPath: string,
) => {
  const foldersToMove: BookmarkIndexEntry[] = toMove.filter(item => 'nameFile' in item) as BookmarkIndexEntry[];
  let realAllFoldersToMove: BookmarkIndexEntry[] = [];

  // Extract all subfolders to move and mix with foldersToMove.
  foldersToMove.forEach(currentFolder => {
    const allSubfolders = getAllFolderListInPath(indexList, currentFolder.pathInBookmark);
    const entryDuplicated = allSubfolders.find(b => b.nameFile === currentFolder.nameFile);
    if (!entryDuplicated) {
      allSubfolders.push(currentFolder);
    }
    realAllFoldersToMove = [...realAllFoldersToMove, ...allSubfolders];
  });

  // Extract all folders to NO move.
  const foldersNoMoved = indexList.filter(folder => !foldersToMove.find(f => f.nameFile === folder.nameFile));

  // Apply the new path to all folders to move and save index.
  const allFoldersMoved = realAllFoldersToMove.map(folder => ({
    ...folder,
    pathInBookmark: `${newPath}/${folder.pathInBookmark.substring(oldPath.length)}`
  }));

  await saveInAFilePromise(JSON.stringify([...foldersNoMoved, ...allFoldersMoved], null, 2), bookmarkIndexFilePath);
}

export const moveBookmarksAndFolders = async(
  indexList: BookmarkIndexEntry[],
  toMove: (BookmarkIndexEntry | Bookmark)[],
  oldPath: string,
  newPath: string
) => {
  await moveBookmarks(indexList, toMove, oldPath, newPath);
  await moveFolders(indexList, toMove, oldPath, newPath);
};

export const replaceAllBookmarkFromDisk = async(data: any) => {
  // Delete all bookmarks, save bookmark in a old bookmark style path, update old bookmark to new bookmark format.
  // const fileList = await readdir(bookmarkFolderPath);
  // for (let i = 0; i < fileList.length; i++) {
  //   await rm(fileList[i]);
  // }
  await rm(bookmarkFolderPath, { recursive: true, force: true });
  await saveInAFilePromise(JSON.stringify(data, null, 2), oldBookmarkPathFile);
  await parseFromOldBookmarks();
}

export const getBookmarksFilesPathList = async() => {
  const pathList = [bookmarkIndexFilePath, bookmarkTrashFilePath];
  const indexList: BookmarkIndexEntry[] = await readJSONFile(bookmarkIndexFilePath, '[]');

  return [
    ...pathList,
    ...indexList.map(b => b.nameFile),
  ];
};

export const getBookmarksNameFilesPathList = (bookmarkPathFileList: string[]) => bookmarkPathFileList.map(path => {
  const split = path.split('/');
  return `bookmark_${split[split.length - 1]}`;
});
