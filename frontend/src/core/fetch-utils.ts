import { ConfigurationService } from "../service/configuration/configuration.service";

export const fetchJsonReceive = <T>(url: string, mock: T): Promise<T> => new Promise<T>(resolve => {
  if (ConfigurationService.Instance.isUsingMocks) {
    resolve(mock);
  } else {
    fetch(url)
      .then(res => res.json())
      .then(json => resolve({...json}));
  }
});

export const fetchJsonSendAndReceive = <T>(url: string, data: any, mock: T): Promise<T> => new Promise<T>(resolve => {
  if (ConfigurationService.Instance.isUsingMocks) {
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

export const fetchReceiveText = (url: string): Promise<string> => new Promise<string>(resolve => {
  fetch(url).then(res => res.text())
    .then(text => resolve(text));
});
