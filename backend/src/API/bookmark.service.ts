import { readJSONFile } from "../utils";
import { getUnfurl } from '../unfurl/unfurl';
import { BookmarkIndexEntry, createBookmark, createFolder, editBookmark, editFolder, getAllFilesAndDirectoriesOfFolderPath, getTrash, moveBookmarksAndFolders, parseFromOldBookmarks, reloadIndexList, replaceAllBookmarkFromDisk, removeBookmark, removeBookmarkFromTrash, removeFolder, searchInAllBookmarks, searchAllBookmarksInTrash } from "./bookmarks/bookmarks-utils";

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
  getBookmarks = async(path = '/', forceReloadIndex = false): Promise<(BookmarkIndexEntry | Bookmark)[]> => {
    if (this.index.length === 0 || forceReloadIndex) {
      this.index = await reloadIndexList();
    }
    const content = await getAllFilesAndDirectoriesOfFolderPath(this.index, path);
    return content;
  };

  getBookmarkInTrash = async(bookmarksByPage: number, currentPage: number): Promise<Bookmark[]> => getTrash(bookmarksByPage, currentPage);

  // TODO: Comprobar que sigue funcionando en Telegram
  searchInBookmark = async (wordlist: string): Promise<Bookmark[]> => await searchInAllBookmarks(this.index, wordlist);

  searchInTrash = async (wordlist: string): Promise<Bookmark[]> => await searchAllBookmarksInTrash(wordlist);
  
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
    let parentPath = folderPath.split('/').slice(0, -1).join('/');
    parentPath = parentPath === undefined || parentPath === '' ? '/' : parentPath;
    return await this.getBookmarks(parentPath, true);
  };

  removeBookmarkInTrash = async(urlBookmark: string): Promise<Bookmark[]> => removeBookmarkFromTrash(urlBookmark);

  editBookmark = async (path: string, oldBookmark: Bookmark, newBookmark: Bookmark): Promise<(BookmarkIndexEntry | Bookmark)[]> => {
    const filePath = this.index.find(f => f.pathInBookmark === path)?.nameFile;
    if (filePath) {
      await editBookmark(filePath, oldBookmark, newBookmark);
    }
    return await this.getBookmarks(path);
  };

  editFolder = async (oldPathFolderInBookmark: string, newPathInBookmark: string): Promise<(BookmarkIndexEntry | Bookmark)[]> =>{
    await editFolder(this.index, oldPathFolderInBookmark, newPathInBookmark);
    let parentPath = newPathInBookmark.split('/').slice(0, -1).join('/');
    parentPath = parentPath === undefined || parentPath === '' ? '/' : parentPath;
    return await this.getBookmarks(parentPath, true);
  };

  moveBookmarksAndFolders = async(toMove: (BookmarkIndexEntry | Bookmark)[], oldPath: string, newPath: string): Promise<(BookmarkIndexEntry | Bookmark)[]> => {
    await moveBookmarksAndFolders(this.index, toMove, oldPath, newPath);
    return await this.getBookmarks(newPath, true);
  };

  fileContent = async(): Promise<any> => {
    let allBookmarks: {
      url: string;
      title: string;
      path: string;
    }[] = [];

    let currentPath: string;
    let currentBookmarks: {
      url: string;
      title: string;
      path: string;
    }[];

    for (let i = 0; i < this.index.length; i++) {
      currentPath = this.index[i].nameFile;
      currentBookmarks = await readJSONFile(currentPath, '[]');
      currentBookmarks = currentBookmarks.map(b => ({
        ...b,
        path: currentPath,
      }));
      allBookmarks = [...allBookmarks, ...currentBookmarks];
    }
    return allBookmarks;
  }

  setFileContent = async (data: any): Promise<void> => await replaceAllBookmarkFromDisk(data);
};
