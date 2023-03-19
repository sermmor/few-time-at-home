import { IS_USING_MOCKS } from "./urls-and-end-points";

export const fetchJsonReceive = <T>(url: string, mock: T): Promise<T> => new Promise<T>(resolve => {
  if (IS_USING_MOCKS) {
    resolve(mock);
  } else {
    fetch(url)
      .then(res => res.json())
      .then(json => resolve({...json}));
  }
});

export const fetchJsonSendAndReceive = <T>(url: string, data: T, mock: T): Promise<T> => new Promise<T>(resolve => {
  if (IS_USING_MOCKS) {
    resolve(mock);
  } else {
    fetch(url, {
      method: 'POST',
      headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
      },
      body: JSON.stringify(data, null, 2)
    }).then(res => res.json())
      .then(json => resolve({...json}));
  }
});
