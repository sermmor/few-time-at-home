import { UnfurlDataModel, UnfurlYoutubeImageModel } from '../unfurl';

export const unfurlDataModelMock = (): {data: UnfurlDataModel[]} => ({
  data: [
    {
      title: 'Title unfurl link',
      urlImage: 'https://i.ytimg.com/vi/IBLruNfUqUs/maxresdefault.jpg',
      description: 'Description unfurl link',
    }
  ]
});

export const UnfurlYoutubeImageModelMock = (): UnfurlYoutubeImageModel => ({
  imageBuffer: undefined,
});
