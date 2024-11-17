import { mkdir, rename, rm, stat } from "fs/promises";
import { readJSONFile, saveInAFilePromise } from "../../utils";

export interface Bookmark {
  url: string;
  title: string;
  path: string;
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

  const allPaths = allJson.map(b => b.path).filter((item, pos, self) => self.indexOf(item) === pos);

  await createNewBookmark();

  let currentPath: string;
  let nameFile: string;
  let bookmarks: Bookmark[];
  const indexList: BookmarkIndexEntry[] = [];

  for (let i = 0; i < allPaths.length; i++) {
    currentPath = allPaths[i];
    nameFile = `${bookmarkFolderPath}/b${i}.json`;
    bookmarks = allJson.filter(b => b.path === currentPath);
    await saveInAFilePromise(JSON.stringify(bookmarks, null, 2), nameFile);
    indexList.push({ nameFile, pathInBookmark: currentPath });
  }

  await saveInAFilePromise(JSON.stringify(indexList, null, 2), bookmarkIndexFilePath);
  
  await rename(oldBookmarkPathFile, `${oldBookmarkPathFile}.old`);
  // TODO: NO OLVIDAR QUE LA CARPETA DE BOOKMARK ENTERA (todos los ficheros) DEBE ENTRAR EN EL BACKUP.
  // TODO: NO OLVIDAR DESCOMENTAR EL BACKUP DE INDEX.TS Y BORRAR LA LÍNEA 32 EN INDEX.TS, COLOCANDO LA LLAMADA EN bookmark.service.ts
  // TODO: EN bookmark.service.ts DEBEMOS DE CARGAR EL ÍNDICE Y EL FICHERO '/' Y CONSTRUIR LAS CARPETAS DE ESE NIVEL (así las carpetas se construyen desde el index.json)
};

export const getAllFolderListInPath = (indexList: BookmarkIndexEntry[], currentPath: string): BookmarkIndexEntry[] => {
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
export const getAllFileAndDirectoriesOfFolderPath = async(indexList: BookmarkIndexEntry[], folderPathInBookmark: string): Promise<(BookmarkIndexEntry | Bookmark)[]> => {
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
    && allSubFolders.filter(subFolderEntry => subFolderEntry.pathInBookmark === pathFolderInBookmark).length === 0
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

// TODO: export const editBookmark // Cambiar nombre o título del marcador
// TODO: export const editFolder // Cambiar nombre de la carpeta en el fichero índice
// TODO: export const moveBookmarksAndFolders // Mueve un listado de carpetas y marcadores de ubicación (los marcadores se mueven de fichero, las carpetas se modifica su path en el índice).
// TODO: export const createBookmark // Crea un nuevo marcador en la carpeta correspondiente (su b.json)
// TODO: export const createFolder // Crea una nueva carpeta en el índice.
// TODO: export const removeFolderOrBookmarkFromTrash // Borramos definitivamente un marcador o una carpeta de la trash.json
// TODO: export const getTrash = (numberPage: number): Bookmarks[] // La papelera viene paginada (50 marcadores por página máximo).
// TODO: export const searchBookmarkOrFolder // Busca una palabra clave entre el índice de carpetas y todos los marcadores, ordenamos el resultado tal y como en searchInBookmark (MÁXIMO 100 resultados).
// TODO: export const searchInTrashBookmarkOrFolder // Lo mismo que el de arriba pero buscando en la trash.json.


// TODO: VER EL RESTO DE TODO DE MÁS ARRIBA.