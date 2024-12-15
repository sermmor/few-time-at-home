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
