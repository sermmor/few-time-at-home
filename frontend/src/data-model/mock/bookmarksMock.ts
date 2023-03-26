import { BookmarksDataModelFromFetch } from "../bookmarks";

export const bookmarksDataModelMock = (): BookmarksDataModelFromFetch => ({
  data: [
    {
      url: "https://duckduckgo.com/",
      title: "Duck Duck Go",
      path: "/"
    },
    {
      url: "https://nitter.net",
      title: "Nitter",
      path: "/"
    },
    {
      url: "https://nitter.net/el_pais",
      title: "Nitter - el pais",
      path: "/periodicos"
    },
    {
      url: "https://nitter.net/CNNEE",
      title: "Nitter - CNN",
      path: "/periodicos"
    }
  ]
});
