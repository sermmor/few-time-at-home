import { DownloadFile, UploadFiles } from "../data-model/commons";
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

export const fetchJsonGetSendAndReceive = <T>(url: string, data: any, mock: T): Promise<T> => new Promise<T>(resolve => {
  if (ConfigurationService.Instance.isUsingMocks) {
    resolve(mock);
  } else {
    fetch(url, {
      method: 'GET',
      headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
      },
      body: JSON.stringify(data, null, 2)
    }).then(res => res.json())
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

export const fetchJsonSendAndTextReceive = <T>(url: string, data: any, mock: T): Promise<string> => new Promise<string>(resolve => {
  if (ConfigurationService.Instance.isUsingMocks) {
    resolve(JSON.stringify(mock, undefined, 2));
  } else {
    fetch(url, {
      method: 'POST',
      headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
      },
      body: JSON.stringify(data, null, 2)
    }).then(res => res.text())
      .then(text => resolve(text));
  }
});

export const fetchSendFileAndReceiveConfirmation = <T>(url: string, data: UploadFiles, mock: T): Promise<T> => new Promise<T>(resolve => {
  if (ConfigurationService.Instance.isUsingMocks) {
    resolve(mock);
  } else {
    // https://developer.mozilla.org/es/docs/Web/API/Fetch_API/Using_Fetch
    const formData = new FormData();
    formData.append('folderPathToSave', data.folderPathToSave);
    formData.append('file', data.files[0]);

    fetch(url, {
      method: 'POST',
      body: formData,
    }).then(res => res.json())
      .then(json => resolve({...json}));
  }
});

const fileTypesToShowInNewTab = ['pdf', 'jpg', 'jpeg', 'gif', 'png'];

const isTypeFileToShowInNewTab = (fileName: string): boolean => {
  const fileNameSplitted = fileName.split('.');
  return fileTypesToShowInNewTab.findIndex(fileType => fileType === fileNameSplitted[fileNameSplitted.length - 1].toLowerCase()) !== -1;
};

export const fetchDownloadFile = (url: string, data: DownloadFile): Promise<void> => new Promise<void>(resolve => {
  const fileNamePathSplitted = data.path.split('/');
  const fileName = fileNamePathSplitted[fileNamePathSplitted.length - 1];
  const isAndroidOS = navigator.appVersion.toLowerCase().indexOf('android') !== -1;
  const isTabletScreenSize = window.innerWidth < 1400; // If we are in iOS is imposible know if it's a Mac or a iPad, so we use the screen width.

  if (!isAndroidOS && !isTabletScreenSize && isTypeFileToShowInNewTab(fileName)) {
    // Show viewable files (PDF, images) inline in a new tab — keep blob approach so they render directly.
    fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data, null, 2)
    }).then(res => res.blob())
    .then(blob => {
      window.open(URL.createObjectURL(blob));
      resolve();
    });
  } else {
    // Native browser download via GET — the browser manages the transfer itself, so
    // real-time progress appears in the browser's Downloads panel straight away.
    // Content-Disposition: attachment (set server-side) prevents page navigation.
    const nativeUrl = `${url}?drive=${encodeURIComponent(data.drive)}&path=${encodeURIComponent(data.path)}`;
    window.location.href = nativeUrl;
    resolve();
  }
});

export const fetchDownloadFileAndGetBlob = (url: string, data: DownloadFile): Promise<string> => new Promise<string>(resolve => {
  fetch(url, {
    method: 'POST',
    headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
    },
    body: JSON.stringify(data, null, 2)
  }).then(res => res.blob())
  .then( blob => { 
    resolve(URL.createObjectURL(blob));
  });
});

export const fetchGetTextDownloadFile = (url: string, data: DownloadFile): Promise<string> => new Promise<string>(resolve => {
  fetch(url, {
    method: 'POST',
    headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
    },
    body: JSON.stringify(data, null, 2)
  }).then(res => res.text())
    .then(text => resolve(text));
});

export const fetchBackgroundImage = (url: string): Promise<string | null> => new Promise<string | null>(resolve => {
  if (ConfigurationService.Instance.isUsingMocks) {
    resolve(null);
  } else {
    fetch(url)
      .then(res => {
        if (!res.ok) {
          resolve(null);
        } else {
          return res.blob();
        }
      })
      .then(blob => {
        if (blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          resolve(null);
        }
      })
      .catch(() => resolve(null));
  }
});
