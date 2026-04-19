import { ReadLaterAddMessagesRequest, ReadLaterAddMessagesResponse, ReadLaterGetMessagesRequest, ReadLaterGetMessagesResponse, ReadLaterRemoveMessagesRequest, ReadLaterRemoveMessagesResponse, ReadLaterSearchMessagesRequest, ReadLaterSearchMessagesResponse } from "../readLaterRss";

export const readLaterGetMessagesRequestMock = (): ReadLaterGetMessagesRequest  => ({
  amount: 20,
});

export const readLaterGetMessagesResponseMock = (): ReadLaterGetMessagesResponse  => ({
  data: [
    {
      id: 0,
      message: 'blablabla'
    },
    {
      id: 2,
      message: 'blebleble'
    },
  ],
});

export const readLaterAddMessagesRequestMock = (): ReadLaterAddMessagesRequest  => ({
  message: 'blablabla',
});

export const readLaterAddMessagesResponseMock = (): ReadLaterAddMessagesResponse  => ({
  data: {
    id: 0,
    message: 'blablabla'
  },
});

export const readLaterRemoveMessagesRequestMock = (): ReadLaterRemoveMessagesRequest  => ({
  id: 2
});

export const readLaterRemoveMessagesResponseMock = (): ReadLaterRemoveMessagesResponse  => ({
  response: 'OK'
});

export const readLaterSearchMessagesRequestMock = (): ReadLaterSearchMessagesRequest => ({
  query: 'test',
  amount: 20,
});

export const readLaterSearchMessagesResponseMock = (): ReadLaterSearchMessagesResponse => ({
  data: [
    { id: 0, message: 'blablabla' },
  ],
});
