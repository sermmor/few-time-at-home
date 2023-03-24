export interface BookmarkItem {
  url: string;
  title: string;
  path: string;
}

export interface BookmarksDataModel {
  data: BookmarkItem[];
}