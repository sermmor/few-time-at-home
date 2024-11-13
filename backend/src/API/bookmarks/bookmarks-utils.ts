import { mkdir, rename, stat } from "fs/promises";
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
  // TODO: NO OLVIDAR QUE LA CARPETA DE BOOKMARK ENTERA DEBE ENTRAR EN EL BACKUP.
  // TODO: NO OLVIDAR DESCOMENTAR EL BACKUP DE INDEX.TS Y BORRAR LA LÍNEA 32 EN INDEX.TS, COLOCANDO LA LLAMADA EN bookmark.service.ts
  // TODO: EN bookmark.service.ts DEBEMOS DE CARGAR EL ÍNDICE Y EL FICHERO '/' Y CONSTRUIR LAS CARPETAS DE ESE NIVEL (así las carpetas se construyen desde el index.json)
  // TODO: Tener en cuenta siempre el trash.json, porque los marcadores ya no se borrarán directamente, y no habrá botón de salvar, se guarda con cada marcador creado.
};

export const getAllFolderListInPath = (indexList: BookmarkIndexEntry[], currentPath: string) => {
  // TODO: En verdad todo tipo de estas funciones podrían ir en un "class BookmarkIndexEntry", porque también necesito un borrar carpeta y más. 
}

