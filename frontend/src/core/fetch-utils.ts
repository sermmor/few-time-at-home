import { IS_USING_MOCKS } from "./urls-and-end-points";

export const fetchJson = <T>(url: string, mock: T): Promise<T> => new Promise<T>(resolve => {
  if (IS_USING_MOCKS) {
    resolve(mock);
  } else {
    fetch(url)
      .then(res => res.json())
      .then(json => resolve({...json}));
  }
});
