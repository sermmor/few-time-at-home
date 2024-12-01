import { readJSONFile, saveInAFile } from "../utils";
import { getUnfurl } from '../unfurl/unfurl';
import { BookmarkIndexEntry, createBookmark, getAllFilesAndDirectoriesOfFolderPath, parseFromOldBookmarks, reloadIndexList, searchInAllBookmarks } from "./bookmarks/bookmarks-utils";

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

  // TODO: addFolder = async
  
  // TODO: OJO, faltan funciones como Borrar marcador o carpeta, editar marcador o carpeta, crear carpeta, borrar de la papelera
  // TODO: get contenido (paginado) de la papelera, mover marcadores o carpeta. Algunas funciones serán NUEVAS.

  private removeDuplicates = (bookmarks: Bookmark[]): Bookmark[] => {
    const cloneBookmarks = [...bookmarks];
    const bookmarksWithoutDuplicates: Bookmark[] = [];
    cloneBookmarks.forEach(bmToCheck => {
      const url = bmToCheck.url.split(' ').join('');
      if (bookmarksWithoutDuplicates.findIndex(bm => bm.url === url) < 0) {
        bookmarksWithoutDuplicates.push(bmToCheck);
      }
    });
    return bookmarksWithoutDuplicates;
  };


  fileContent = (): any => this.bookmarks;

  setFileContent = (data: any): Promise<void> => new Promise<void>(resolve => {
    // TODO: Sincronizar marcadores, esto hay que hacerlo fichero por fichero. Lo suyo es eliminar todos los ficheros (haz un backup antes).
    this.bookmarks = data;
    this.saveBookmarks().then(() => resolve());
  });
}