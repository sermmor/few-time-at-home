import { readJSONFile, saveInAFile } from "../utils";
import { getUnfurl } from '../unfurl/unfurl';

const pathBookmarkFile = 'data/bookmark.json';

export interface Bookmark {
  url: string;
  title: string;
  path: string;
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
      readJSONFile(pathBookmarkFile, '[]').then(dataJson => {
        this.bookmarks = dataJson;
        resolve(this.bookmarks);
      });
    }
  });

  searchInBookmark = (wordlist: string): Bookmark[] => {
    // The bookmarks had 1 or more words.
    const words = wordlist.toLowerCase().split(' ').filter(value => value !== '');
    return this.bookmarks.filter(bm => words.filter(w => bm.title.toLowerCase().indexOf(w) >= 0 || bm.url.toLowerCase().indexOf(w) >= 0).length > 0);
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