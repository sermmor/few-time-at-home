import { BookmarksDataModel } from "../bookmarks";

export const bookmarksDataModelMock = (): BookmarksDataModel => ({
  data: [
    {
      url: "https://duckduckgo.com/",
      title: "Duck Duck Go"
    },
    {
      url: "https://nitter.net",
      title: "Nitter"
    },
  ]
});
