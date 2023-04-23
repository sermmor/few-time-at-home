import { DataToGetInPieces } from "../../core/actions/bookmarks";
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

export const dataToGetInPiecesMock = (): {data: DataToGetInPieces} => ({
  data: {
    data: bookmarksDataModelMock().data,
    pieceIndex: 1,
    totalPieces: 1,
    isFinished: true,
  }
});
