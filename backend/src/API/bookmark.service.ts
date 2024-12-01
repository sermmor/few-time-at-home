import { readJSONFile, saveInAFile } from "../utils";
import { getUnfurl } from '../unfurl/unfurl';
import { BookmarkIndexEntry, parseFromOldBookmarks } from "./bookmarks/bookmarks-utils";

const pathBookmarkFile = 'data/bookmark.json';

export interface Bookmark {
  url: string;
  title: string;
  path: string; // TODO: Param deprecated => REMOVE
}

export class BookmarkService {
  static Instance: BookmarkService;
  bookmarks: Bookmark[] = []; // TODO: A ELIMINAR
  index: BookmarkIndexEntry[];

  constructor() {
    this.index = [];
    BookmarkService.Instance = this;
    // TODO: CARGAR EL ÍNDICE EN ALGÚN LADO DE LA API AL INICIO DEL TODO.
    
  }
  
  static parseFromOldBookmarks = async(): Promise<void> => parseFromOldBookmarks();  // TODO: LÍNEA A ELIMINAR CUANDO YA ESTÉN PARSEADOS EN PROD

  // TODO getFolderContent

  getBookmarks = (): Promise<Bookmark[]> => new Promise<Bookmark[]>(resolve => {
    // TODO: DEBEMOS DE CARGAR EL ÍNDICE Y EL FICHERO '/' (esto es el b0.json) Y CONSTRUIR LAS CARPETAS DE ESE NIVEL (así las carpetas se construyen desde el index.json)
    if (this.bookmarks.length > 0) {
      resolve(this.bookmarks);
    } else {
      // readJSONFile(pathBookmarkFile, '[]').then(dataJson => {
      //   this.bookmarks = dataJson;
      //   resolve(this.bookmarks);
      // });
      resolve([]);
    }
  });

  private searchPredicate = (bm: Bookmark) => (w: string): boolean => bm.title.toLowerCase().indexOf(w) >= 0
    || bm.url.toLowerCase().indexOf(w) >= 0
    || bm.path.toLowerCase().indexOf(w) >= 0;

  searchInBookmark = (wordlist: string): Bookmark[] => {
    // The bookmarks had 1 or more words.
    const words = wordlist.toLowerCase().split(' ').filter(value => value !== '');
    const maxResults = 100;
    const resultOr = this.bookmarks.filter(bm => words.filter(
      this.searchPredicate(bm)
    ).length > 0);

    const resultAnd = this.bookmarks.filter(bm => {
      let w: string;
      const searchCondition = this.searchPredicate(bm);
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
  }

  addBookmark = (urlBookmark: string, path: string = '/'): Promise<Bookmark[]> => new Promise<Bookmark[]>(resolve => {
    const url = urlBookmark.split(' ').join('');
    const isBookmarkAlready = this.bookmarks.findIndex(bm => bm.url === url) >= 0;
    if (isBookmarkAlready) {
      resolve(this.bookmarks);
    } else {
      getUnfurl(url).then(data => {
        const newBookmark: Bookmark = {
          url,
          path,
          title: data.title,
        };
        if (this.bookmarks.length > 0) {
          this.bookmarks.push(newBookmark);
          this.saveBookmarks().then((newBookmarkList) => resolve(newBookmarkList));
        } else {
          this.getBookmarks().then(() => {
            this.bookmarks.push(newBookmark);
            this.saveBookmarks().then((newBookmarkList) => resolve(newBookmarkList));
          });
        }
      });
    }
  });

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
  }

  updateBookmarks = (bookmarks: Bookmark[]): Promise<Bookmark[]> => new Promise<Bookmark[]>(resolve => {
    if (this.bookmarks.length > 0) {
      this.bookmarks = this.removeDuplicates(bookmarks);
      this.saveBookmarks().then((newBookmarkList) => resolve(newBookmarkList));
    } else {
      this.getBookmarks().then(() => {
        this.bookmarks = this.removeDuplicates(bookmarks);
        this.saveBookmarks().then((newBookmarkList) => resolve(newBookmarkList));
      });
    }
  });

  saveBookmarks = (): Promise<Bookmark[]> => new Promise<Bookmark[]>(resolve => {
    saveInAFile(JSON.stringify(this.bookmarks, null, 2), pathBookmarkFile);
    resolve(this.bookmarks);
    console.log("> Bookmark saved!");
  });

  fileContent = (): any => this.bookmarks;

  setFileContent = (data: any): Promise<void> => new Promise<void>(resolve => {
    // TODO: Sincronizar marcadores, esto hay que hacerlo fichero por fichero. Lo suyo es eliminar todos los ficheros (haz un backup antes).
    this.bookmarks = data;
    this.saveBookmarks().then(() => resolve());
  });
}