import { readJSONFile, saveInAFile } from "../utils";
import { getUnfurl } from '../unfurl/unfurl';
import { BookmarkIndexEntry, createBookmark, createFolder, getAllFilesAndDirectoriesOfFolderPath, parseFromOldBookmarks, reloadIndexList, removeBookmark, removeFolder, searchInAllBookmarks } from "./bookmarks/bookmarks-utils";

export interface Bookmark {
  url: string;
  title: string;
}

export class BookmarkService {
  static Instance: BookmarkService;
  index: BookmarkIndexEntry[];

  constructor() {
    this.index = [];
    BookmarkService.Instance = this;
  }
  
  static parseFromOldBookmarks = async(): Promise<void> => parseFromOldBookmarks();  // TODO: LÍNEA A ELIMINAR CUANDO YA ESTÉN PARSEADOS EN PROD

  // Get all the content in a folder with path 'path' (is '/' by default).
  getBookmarks = async(path = '/'): Promise<(BookmarkIndexEntry | Bookmark)[]> => {
    await parseFromOldBookmarks();  // TODO: LÍNEA A ELIMINAR CUANDO YA ESTÉN PARSEADOS EN PROD.

    if (this.index.length === 0) {
      this.index = await reloadIndexList();
    }
    const content = await getAllFilesAndDirectoriesOfFolderPath(this.index, path);
    return content;
  };

  // TODO: Comprobar que sigue funcionando en Telegram
  searchInBookmark = async (wordlist: string): Promise<Bookmark[]> => await searchInAllBookmarks(this.index, wordlist);
  
  // TODO: Comprobar que sigue funcionando en Telegram
  addBookmark = async (urlBookmark: string, path: string = '/', title = ''): Promise<Bookmark> => {
    const url = urlBookmark.split(' ').join('');
    
    const newBookmark: Bookmark = { url, title };
    if (newBookmark.title.length === 0) {
      const data = await getUnfurl(url);
      newBookmark.title = data.title;
    }
    // We supposed that path is a existing path.
    await createBookmark(this.index, path, newBookmark);

    return newBookmark;
  };

  addFolder = async (folderPath: string): Promise<BookmarkIndexEntry> => await createFolder(this.index, folderPath);
  
  removeBookmark = async (folderPath: string, urlBookmark: string): Promise<(BookmarkIndexEntry | Bookmark)[]> => {
    await removeBookmark(this.index, folderPath, urlBookmark);
    return await this.getBookmarks(folderPath);
  };

  removeFolder = async (folderPath: string): Promise<(BookmarkIndexEntry | Bookmark)[]> => {
    await removeFolder(this.index, folderPath);
    const parentPath = folderPath.split('/').slice(0, -1).join('/');
    return await this.getBookmarks(parentPath);
  };

  // TODO: OJO, faltan funciones como editar marcador o carpeta, borrar de la papelera
  // TODO: get contenido (paginado) de la papelera, mover marcadores o carpeta. Algunas funciones serán NUEVAS.


  fileContent = (): any => this.bookmarks;

  setFileContent = (data: any): Promise<void> => new Promise<void>(resolve => {
    // TODO: Sincronizar marcadores, esto hay que hacerlo fichero por fichero. Lo suyo es eliminar todos los ficheros (haz un backup antes).
    this.bookmarks = data;
    this.saveBookmarks().then(() => resolve());
  });
}