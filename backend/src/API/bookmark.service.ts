import { readFile } from "fs";
import { saveInAFile } from "../utils";

const pathBookmarkFile = 'data/bookmark.json';

export interface Bookmark {
  url: string;
  title: string;
}

export class BookmarkService {
  static Instance: BookmarkService;
  bookmarks: Bookmark[];

  constructor() {
    this.bookmarks = [];
    BookmarkService.Instance = this;
  }

  getBookmarks = (): Promise<Bookmark[]> => new Promise<Bookmark[]>(resolve => {
    if (this.bookmarks.length > 0) {
      resolve(this.bookmarks);
    } else {
      readFile(pathBookmarkFile, (err: any, data: any) => {
        if (err) throw err;
        const bookmarksStringList = JSON.parse(<string> <any> data);
        this.bookmarks = bookmarksStringList;
        resolve(this.bookmarks);
      });
    }
  });

  addBookmark = (newBookmark: Bookmark): Promise<Bookmark[]> => new Promise<Bookmark[]>(resolve => {
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

  updateBookmarks = (bookmarks: Bookmark[]): Promise<Bookmark[]> => new Promise<Bookmark[]>(resolve => {
    if (this.bookmarks.length > 0) {
      this.bookmarks = bookmarks;
      this.saveBookmarks().then((newBookmarkList) => resolve(newBookmarkList));
    } else {
      this.getBookmarks().then(() => {
        this.bookmarks = bookmarks;
        this.saveBookmarks().then((newBookmarkList) => resolve(newBookmarkList));
      });
    }
  });

  saveBookmarks = (): Promise<Bookmark[]> => new Promise<Bookmark[]>(resolve => {
    saveInAFile(JSON.stringify(this.bookmarks, null, 2), pathBookmarkFile);
    resolve(this.bookmarks);
    console.log("> Bookmark saved!");
  });
}