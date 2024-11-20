import { mkdir, rename, rm, stat } from "fs/promises";
import { readJSONFile, saveInAFilePromise } from "../../utils";

export interface Bookmark {
  url: string;
  title: string;
  path?: string; // Param deprecated
}

interface BookmarkIndexEntry {
  nameFile: string;
  pathInBookmark: string;
}

const oldBookmarkPathFile = 'data/bookmark.json';
const bookmarkFolderPath = 'data/bookmarks';
const bookmarkIndexFilePath = 'data/bookmarks/index.json';
const bookmarkTrashFilePath = 'data/bookmarks/trash.json';

const isUsingOldBookmark = async(): Promise<boolean> => {
  let isUsingOldBookmark = true;
  try {
    const stats = await stat(oldBookmarkPathFile);
  } catch (err) {
    isUsingOldBookmark = false;
  }
  return isUsingOldBookmark;
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
    await saveInAFilePromise('', bookmarkIndexFilePath);
    console.log(`File ${bookmarkIndexFilePath} created correctly.`);
  }
  try {
    const stats = await stat(bookmarkTrashFilePath);
  } catch (err) {
    await saveInAFilePromise('', bookmarkTrashFilePath);
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
      entry.pathInBookmark.includes(currentPath) 
      && entry.pathInBookmark.substring(0, currentPath.length) === currentPath
    );
  }
};

// For openFolder action (like an "ls" command)
export const getAllFilesAndDirectoriesOfFolderPath = async(indexList: BookmarkIndexEntry[], folderPathInBookmark: string): Promise<(BookmarkIndexEntry | Bookmark)[]> => {
  // We extract first the subfolders in the indexList.
  const allFolders: BookmarkIndexEntry[] = getAllFolderListInPath(indexList, folderPathInBookmark);
  // We get the file bookmark entry content.
  const entry = indexList.find(({ pathInBookmark }) => pathInBookmark === folderPathInBookmark);
  const allBookmarks: Bookmark[] = entry ? await readJSONFile(entry.nameFile, '[]') : [];

  return [...allFolders, ...allBookmarks];
}

export const removeBookmark = async(nameFileBookmarkPath: string, urlBookmarkToDelete: string) => {
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
  if (entry) {
    await rm(entry.nameFile);
  }

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

  // Create result with folders edited and not edited and save index.
  await saveInAFilePromise(JSON.stringify([...newIndexListWithoutFoldersEdited, entry, ...allSubFoldersNew], null, 2), bookmarkIndexFilePath);
};

export const editBookmark = async(nameFileBookmarkPath: string, oldBookmark: Bookmark, newBookmark: Bookmark) => {
  const dataJson: Bookmark[] = await readJSONFile(nameFileBookmarkPath, '[]');
  const dataJsonWithoutBookmark = dataJson.filter(b => b.url !== oldBookmark.url);

  // We save in bookmark file, the content without the entry selected to delete.
  await saveInAFilePromise(JSON.stringify([...dataJsonWithoutBookmark, newBookmark], null, 2), nameFileBookmarkPath);
};

export const createBookmark = async(indexList: BookmarkIndexEntry[], pathFolderInBookmark: string, bookmark: Bookmark) => {
  const entry = indexList.filter(b => b.pathInBookmark === pathFolderInBookmark)[0];
  const dataJson: Bookmark[] = await readJSONFile(entry.nameFile, '[]');
  dataJson.push(bookmark);
  await saveInAFilePromise(JSON.stringify(dataJson, null, 2), entry.nameFile);
};

export const createFolder = async(indexList: BookmarkIndexEntry[], newPathInBookmark: string) => {
  const indexNewBookmark = indexList.length;
  const newFolder: BookmarkIndexEntry = {
    nameFile: `${bookmarkFolderPath}/b${indexNewBookmark}.json`,
    pathInBookmark: newPathInBookmark,
  }
  indexList.push(newFolder);
  await saveInAFilePromise(JSON.stringify(indexList, null, 2), bookmarkIndexFilePath);
}
// TODO: export const removeBookmarkFromTrash // Borramos definitivamente un marcador de la trash.json (en la trash NO hay carpetas).
// TODO: export const getTrash = (numberPage: number): Bookmarks[] // La papelera viene paginada (50 marcadores por página máximo).
// TODO: export const searchBookmarkOrFolder // Busca una palabra clave entre el índice de carpetas y todos los marcadores, ordenamos el resultado tal y como en searchInBookmark (MÁXIMO 100 resultados).
// TODO: export const searchInTrashBookmarkOrFolder // Lo mismo que el de arriba pero buscando en la trash.json.

export const moveBookmarksAndFolders = async (
  indexList: BookmarkIndexEntry[],
  toMove: (BookmarkIndexEntry | Bookmark)[],
  oldPath: string,
  newPath: string
) => {
  // ! HACER.
  /* TODO Mueve un listado de carpetas y marcadores de ubicación (los marcadores se mueven de fichero,
    las carpetas se modifica su path en el índice). */
};

// TODO: NO OLVIDAR QUE LA CARPETA DE BOOKMARK ENTERA (todos los ficheros) DEBE ENTRAR EN EL BACKUP.
// TODO: NO OLVIDAR DESCOMENTAR EL BACKUP DE INDEX.TS Y BORRAR LA LÍNEA 32 EN INDEX.TS, COLOCANDO LA LLAMADA EN bookmark.service.ts
// TODO: EN bookmark.service.ts DEBEMOS DE CARGAR EL ÍNDICE Y EL FICHERO '/' Y CONSTRUIR LAS CARPETAS DE ESE NIVEL (así las carpetas se construyen desde el index.json)
