export type ReadLaterMessage = {id: number; message: string};

export interface ReadLaterGetMessagesRequest {
  amount: number;
}

export interface ReadLaterGetMessagesResponse {
  data: ReadLaterMessage[];
}

export interface ReadLaterAddMessagesRequest {
  message: string;
}

export interface ReadLaterAddMessagesResponse {
  data: ReadLaterMessage;
}

export interface ReadLaterRemoveMessagesRequest {
  id: number;
}

export interface ReadLaterRemoveMessagesResponse {
  response: string;
}

export interface ReadLaterSearchMessagesRequest {
  query: string;
  amount: number;
}

export interface ReadLaterSearchMessagesResponse {
  data: ReadLaterMessage[];
}

export interface ReadLaterGetAllRequest {
  page:     number;
  pageSize: number;
}

export interface ReadLaterGetAllResponse {
  data:  ReadLaterMessage[];
  total: number;
}

export interface ReadLaterUpdateMessageRequest {
  id:      number;
  message: string;
}

export interface ReadLaterUpdateMessageResponse {
  response: string;
}
