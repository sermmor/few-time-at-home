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
    const maxResults = 100;
    const result = this.bookmarks.filter(bm => words.filter(w =>
      bm.title.toLowerCase().indexOf(w) >= 0
      || bm.url.toLowerCase().indexOf(w) >= 0
      || bm.path.toLowerCase().indexOf(w) >= 0
      ).length > 0);
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
}