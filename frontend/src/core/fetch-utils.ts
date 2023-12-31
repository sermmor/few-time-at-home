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

export const fetchSendFileAndReceiveConfirmation = <T>(url: string, data: UploadFiles, mock: T): Promise<T> => new Promise<T>(resolve => {
  if (ConfigurationService.Instance.isUsingMocks) {
    resolve(mock);
  } else {
    // https://developer.mozilla.org/es/docs/Web/API/Fetch_API/Using_Fetch
    const formData = new FormData();
    formData.append('drive', data.drive);
    formData.append('pathToSave', data.pathToSave);
    formData.append('numberOfFiles', `${data.numberOfFiles}`);
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
  fetch(url, {
    method: 'POST',
    headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
    },
    body: JSON.stringify(data, null, 2)
  }).then(res => res.blob())
  .then( blob => {
    const url = window.URL.createObjectURL(blob);
    const isAndroidOS = navigator.appVersion.toLowerCase().indexOf('android') !== -1;
    const isTabletScreenSize = window.innerWidth < 1400; // If we are in iOS is imposible know if it's a Mac or a iPad, so we use the screen width.
    if (!isAndroidOS && !isTabletScreenSize && isTypeFileToShowInNewTab(fileName)) {
      // Show in new tab.
      window.open(URL.createObjectURL(blob));
      resolve();
    } else {
      // Download file.
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a); // we need to append the element to the dom -> otherwise it will not work in firefox
      a.click();    
      a.remove();  //afterwards we remove the element again 
      resolve();
    }
  });;
});
