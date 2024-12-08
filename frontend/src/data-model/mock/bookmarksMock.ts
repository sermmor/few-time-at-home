import { GetAddBookmarkResponse, GetAddFolderResponse, GetPathResponse, GetTrashListResponse } from "../bookmarks";

export const getBookmarkAndFolderListModelMock = (): GetPathResponse => ({
  data: [
    {
      nameFile: "blablabla/file.json",
      pathInBookmark: "Imagenes",
    },
    {
      url: "https://duckduckgo.com/",
      title: "Duck Duck Go"
    },
    {
      url: "https://nitter.net",
      title: "Nitter"
    },
    {
      url: "https://nitter.net/el_pais",
      title: "Nitter - el pais"
    },
    {
      url: "https://nitter.net/CNNEE",
      title: "Nitter - CNN"
    }
  ]
});

export const getBookmarkListModelMock = (): GetTrashListResponse => ({
  data: [
    {
      url: "https://duckduckgo.com/",
      title: "Duck Duck Go"
    },
    {
      url: "https://nitter.net",
      title: "Nitter"
    },
    {
      url: "https://nitter.net/el_pais",
      title: "Nitter - el pais"
    },
    {
      url: "https://nitter.net/CNNEE",
      title: "Nitter - CNN"
    }
  ]
});

export const getOnlyABookmarkDataModelMock = (): GetAddBookmarkResponse => ({
  data: {
    url: "https://duckduckgo.com/",
    title: "Duck Duck Go"
  },
});

export const getOnlyAFolderDataModelMock = (): GetAddFolderResponse => ({
  data: {
    nameFile: "blablabla/file.json",
    pathInBookmark: "Imagenes",
  },
});
