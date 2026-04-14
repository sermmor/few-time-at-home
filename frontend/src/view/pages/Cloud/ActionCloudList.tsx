import { Link } from "@mui/material";
import { CloudActions } from "../../../core/actions/cloud";
import { CloudItem, getNameFileOfFolder, getPathFolderContainer } from "../../../data-model/cloud";
import { CloudState, CloudStateName } from "./Models/CloudState";
import { TemporalData } from "../../../service/temporalData.service";

export interface ActionsProps {
  cloudState: CloudState;
  setCloudState: React.Dispatch<React.SetStateAction<CloudState>>;
  currentPathFolder: string;
  setCurrentPathFolder: React.Dispatch<React.SetStateAction<string>>;
  fileList: CloudItem[];
  setFileList: React.Dispatch<React.SetStateAction<CloudItem[]>>;
  selectedNodes: string[];
  setSelectedNodes: React.Dispatch<React.SetStateAction<string[]>>;
  currentDrive: string;
  setSnackBarMessage: React.Dispatch<React.SetStateAction<string>>;
  setOpenSnackbar: React.Dispatch<React.SetStateAction<boolean>>;
  setErrorSnackbar: React.Dispatch<React.SetStateAction<boolean>>;
  isMarkToReturnToPath: boolean;
  setMarkToReturnToPath: React.Dispatch<React.SetStateAction<boolean>>;
  pathToReturn: CloudItem[];
  setPathToReturn: React.Dispatch<React.SetStateAction<CloudItem[]>>;
  setIndexCurrentDrive: React.Dispatch<React.SetStateAction<number>>;
  indexCurrentDrive: number;
  driveList: string[] | undefined;
}

export const goBackToParentFolder = ({currentPathFolder, setCurrentPathFolder, setFileList, currentDrive}: ActionsProps) => new Promise<string>(resolve =>{
  const parentPathFolder = getPathFolderContainer(currentPathFolder);
  if (parentPathFolder !== '') {
    CloudActions.getAllFolderItems({
      drive: currentDrive,
      folderPath: parentPathFolder,
    }).then(res => {
      setCurrentPathFolder(parentPathFolder);
      setFileList(res.data);
      resolve(parentPathFolder.substring(5));
    });
  }
});

export const setOpenFolder = ({currentPathFolder, currentDrive, setCurrentPathFolder, setFileList}: ActionsProps, labelFolder: string) => new Promise<string>(resolve =>{
  const newPath = `${currentPathFolder}/${labelFolder}`;
  CloudActions.getAllFolderItems({
    drive: currentDrive,
    folderPath: newPath,
  }).then(res => {
    setCurrentPathFolder(newPath);
    setFileList(res.data);
    resolve(newPath.substring(5));
  });
});

export const synchronizeWithCloud = ({currentDrive, currentPathFolder, setCurrentPathFolder, setFileList}: ActionsProps) => {
  CloudActions.getAllFolderItems({
    drive: currentDrive,
    folderPath: currentPathFolder,
  }).then(res => {
    setCurrentPathFolder(currentPathFolder);
    setFileList(res.data);
  });
}

const uploadOnlyOneFile = (
  { currentPathFolder, setSnackBarMessage, setOpenSnackbar, setErrorSnackbar}: ActionsProps,
  file: File
): Promise<FileReader> => new Promise<FileReader> (resolve => {
  const reader = new FileReader();
    
  reader.onloadend = () => {
    CloudActions.uploadFile({
      folderPathToSave: currentPathFolder,
      files: [file],
    }).then(res => {
      console.log(res.message);
      setSnackBarMessage(`File '${file.name}' has uploaded to the cloud.`);
      setErrorSnackbar(false);
      setOpenSnackbar(true);

      resolve(reader);
    });
  };

  reader.onerror = () => {
    console.error('There was an issue reading the file.');
    setSnackBarMessage(`There was an issue reading the file.`);
    setErrorSnackbar(true);
    setOpenSnackbar(true);
  };

  reader.readAsDataURL(file);
});

const uploadListFilesOneToOne = (
  actions: ActionsProps,
  fileListToUpload: File[]
) => {
  const { setSnackBarMessage, setOpenSnackbar, setErrorSnackbar, fileList, setCloudState } = actions;
  if (fileListToUpload.length === 0) {
    setCloudState({ name: CloudStateName.NORMAL, description: '', });
    console.log('All files has uploaded to cloud!');
    setSnackBarMessage(`All files has uploaded to cloud!`);
    setErrorSnackbar(false);
    setOpenSnackbar(true);

    // Reflesh cloud and return to the current folder.
    synchronizeWithCloud(actions);
  } else {
    if (fileList.findIndex(item => item.name === fileListToUpload[0].name) === -1) {
      setCloudState({ name: CloudStateName.UPLOADING, description: `Uploading file '${fileListToUpload[0].name}'`, });
      uploadOnlyOneFile(actions, fileListToUpload[0]).then(() => uploadListFilesOneToOne(actions, fileListToUpload.slice(1)));
    } else {
      // Item already in cloud, not replace!
      console.log(`Already there is a '${fileListToUpload[0].name}' in the cloud.`);
      setSnackBarMessage(`Already there is a '${fileListToUpload[0].name}' in the cloud.`);
      setErrorSnackbar(true);
      setOpenSnackbar(true);
      uploadListFilesOneToOne(actions, fileListToUpload.slice(1));
    }
  }
}

// ─── Recursive folder upload helpers ────────────────────────────────────────

/** Wraps FileSystemFileEntry.file() in a Promise. */
const getFileFromEntry = (entry: FileSystemFileEntry): Promise<File> =>
  new Promise((resolve, reject) => entry.file(resolve, reject));

/**
 * Wraps FileSystemDirectoryReader.readEntries() in a Promise.
 * Note: readEntries() may return results in batches of up to 100; callers
 * must keep reading until an empty array is returned.
 */
const readEntriesBatch = (reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> =>
  new Promise((resolve, reject) => reader.readEntries(resolve, reject));

/**
 * Recursively collects every file reachable from a FileSystemEntry.
 * Returns a flat list of { file, folderPath } where folderPath is the
 * cloud destination directory for that file.
 *
 * @param entry      The FileSystemEntry to traverse (file or directory).
 * @param cloudBase  The cloud path that should receive the entry's contents.
 */
const collectFilesFromEntry = async (
  entry: FileSystemEntry,
  cloudBase: string,
): Promise<{ file: File; folderPath: string }[]> => {
  if (entry.isFile) {
    const file = await getFileFromEntry(entry as FileSystemFileEntry);
    return [{ file, folderPath: cloudBase }];
  }

  if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry;
    // The destination folder for this directory's contents is cloudBase/directoryName
    const dirCloudPath = `${cloudBase}/${entry.name}`;
    const reader = dirEntry.createReader();
    const result: { file: File; folderPath: string }[] = [];

    // readEntries may return batches — keep reading until we get an empty array.
    while (true) {
      const batch = await readEntriesBatch(reader);
      if (batch.length === 0) break;
      for (const subEntry of batch) {
        const subFiles = await collectFilesFromEntry(subEntry, dirCloudPath);
        result.push(...subFiles);
      }
    }
    return result;
  }

  return [];
};

/**
 * Uploads a flat list of { file, folderPath } pairs one by one, preserving
 * the directory structure under the current cloud path.
 */
const uploadRecursiveFilesOneToOne = (
  actions: ActionsProps,
  filePathList: { file: File; folderPath: string }[],
  total: number,
): void => {
  const { setSnackBarMessage, setOpenSnackbar, setErrorSnackbar, setCloudState } = actions;

  if (filePathList.length === 0) {
    setCloudState({ name: CloudStateName.NORMAL, description: '' });
    setSnackBarMessage('All files uploaded to cloud!');
    setErrorSnackbar(false);
    setOpenSnackbar(true);
    synchronizeWithCloud(actions);
    return;
  }

  const { file, folderPath } = filePathList[0];
  const current = total - filePathList.length + 1;
  setCloudState({
    name: CloudStateName.UPLOADING,
    description: `Uploading ${current}/${total}: ${file.name}`,
  });

  CloudActions.uploadFile({ folderPathToSave: folderPath, files: [file] }).then(() => {
    uploadRecursiveFilesOneToOne(actions, filePathList.slice(1), total);
  });
};

// ─────────────────────────────────────────────────────────────────────────────

export const uploadFiles = (
  actions: ActionsProps,
  event?: React.DragEvent<HTMLDivElement>,
  file?: File
) => {
  if (file) {
    // Single file from the upload button — existing behaviour.
    uploadListFilesOneToOne(actions, [file]);
    return;
  }

  if (!event) return;

  // Gather FileSystemEntry objects from the drag event.
  const items = Array.from(event.dataTransfer.items);
  const entries = items
    .map(item => item.webkitGetAsEntry())
    .filter((e): e is FileSystemEntry => e !== null);

  const hasDirectories = entries.some(e => e.isDirectory);

  if (!hasDirectories) {
    // All items are plain files — use the existing path (includes duplicate check).
    uploadListFilesOneToOne(actions, Array.from(event.dataTransfer.files));
    return;
  }

  // At least one folder was dropped — collect all files recursively then upload.
  const { setCloudState, setSnackBarMessage, setErrorSnackbar, setOpenSnackbar } = actions;
  setCloudState({ name: CloudStateName.UPLOADING, description: 'Scanning folder structure…' });

  Promise.all(entries.map(entry => collectFilesFromEntry(entry, actions.currentPathFolder)))
    .then(results => {
      const allFiles = results.flat();
      if (allFiles.length === 0) {
        setCloudState({ name: CloudStateName.NORMAL, description: '' });
        setSnackBarMessage('No files found inside the dropped folder(s).');
        setErrorSnackbar(true);
        setOpenSnackbar(true);
        return;
      }
      uploadRecursiveFilesOneToOne(actions, allFiles, allFiles.length);
    })
    .catch(err => {
      console.error('Error scanning folder structure:', err);
      setCloudState({ name: CloudStateName.NORMAL, description: '' });
      setSnackBarMessage('Error reading folder structure.');
      setErrorSnackbar(true);
      setOpenSnackbar(true);
    });
};

export const downloadFile = (
  { currentDrive, setSnackBarMessage, setOpenSnackbar, setErrorSnackbar, setCloudState}: ActionsProps,
  item: CloudItem,
) => {
  setCloudState({ name: CloudStateName.DOWNLOADING, description: `Downloading file '${item.name}'`, });
  CloudActions.downloadFile({
    drive: currentDrive || '/',
    path: item.path,
  }).then(() => {
    setCloudState({ name: CloudStateName.NORMAL, description: '', });
    console.log('File downloaded!!');
    setSnackBarMessage(`File '${item.name}' has downloaded.`);
    setErrorSnackbar(false);
    setOpenSnackbar(true);
  });
};

export const downloadFileAndGetBlob = (
  { currentDrive }: ActionsProps,
  item: CloudItem,
): Promise<string> => new Promise<string>(resolve => {
  CloudActions.downloadFileAndGetBlob({
    drive: currentDrive || '/',
    path: item.path,
  }).then((blob) => {
    resolve(blob);
  });
});

export const downloadAndOpenFileInEditor = (
  {currentPathFolder, currentDrive, setSnackBarMessage, setOpenSnackbar, setErrorSnackbar, setCloudState}: ActionsProps,
  nameFile: string,
): Promise<void> => new Promise<void>(resolve => {
  setCloudState({ name: CloudStateName.DOWNLOADING, description: `Opening file '${nameFile}'`, });
  CloudActions.openFileContentInEditor({
    drive: currentDrive || '/',
    path: `${currentPathFolder}/${nameFile}`,
  }).then((text) => {
    TemporalData.EditorTextData = text;
    TemporalData.LastPathInTextEditor = `${currentPathFolder}/${nameFile}`;
    setCloudState({ name: CloudStateName.NORMAL, description: '', });
    console.log('File in editor!!');
    setSnackBarMessage(`File '${nameFile}' is in Text Editor.`);
    setErrorSnackbar(false);
    setOpenSnackbar(true);
    resolve();
  });
});;

const isCreatedFile = (actions: ActionsProps, nameFile: string, showSnackbar = true) => {
  const { fileList, setSnackBarMessage, setErrorSnackbar, setOpenSnackbar } = actions;

  if (fileList.findIndex(item => item.name === nameFile) > -1) {
    // Item already in cloud, not replace!
    if (showSnackbar) {
      console.log(`Already there is a '${nameFile}' in the cloud.`);
      setSnackBarMessage(`Already there is a '${nameFile}' in the cloud.`);
      setErrorSnackbar(true);
      setOpenSnackbar(true);
    }
    return true;
  }
  return false;
}

export const renameCloudItem = (
  actions: ActionsProps, 
  item: CloudItem,
  newName: string,
  oldPath: string
) => {
  if (!isCreatedFile(actions, newName)) {
    const newPath = `${item.path.split('/').slice(0, -1).join('/')}/${newName}`;
  
    CloudActions.renameItem({
      oldPath: oldPath,
      newPath: newPath,
    }).then((data) => {
      console.log(data);
      const { fileList, setFileList } = actions;
      const cloneFileList = [...fileList];
      const itemIndex = cloneFileList.findIndex(candidate => candidate.path === oldPath);
      cloneFileList[itemIndex].name = newName || '';
      cloneFileList[itemIndex].path = newPath;
      setFileList(cloneFileList);
    });
  }
};

export const renameCloudFolder = (actions: ActionsProps, completeFolderPath: string) => (fakeNewName: string) => {
  const fakeNewNameSplitted = fakeNewName.split('/');
  const folderPathSplitted = completeFolderPath.split('/');
  folderPathSplitted.pop();
  const newNameWithoutPath = fakeNewNameSplitted.pop();
  const realNewName = `${folderPathSplitted.join('/')}/${newNameWithoutPath}`;

  if (!isCreatedFile(actions, newNameWithoutPath || '')) {
    CloudActions.renameItem({
      oldPath: completeFolderPath,
      newPath: realNewName,
    }).then((data) => {
      console.log(data);
      const { fileList, setFileList } = actions;
      const cloneFileList = [...fileList];
      const itemIndex = cloneFileList.findIndex(candidate => candidate.path === completeFolderPath);
      cloneFileList[itemIndex].name = newNameWithoutPath || '';
      cloneFileList[itemIndex].path = realNewName;
      setFileList(cloneFileList);
    });
  }
}

export const addFolderActionItemList = (actions: ActionsProps, folderToAdd: CloudItem) => {  
  if (!isCreatedFile(actions, folderToAdd.name)) {
    CloudActions.createFolder(folderToAdd.path).then(() => {
      console.log(`Created folder '${folderToAdd.path}'.`);
      const { fileList, setFileList } = actions;
      const cloneFileList = [...fileList];
      cloneFileList.push(folderToAdd);
      setFileList(cloneFileList);
    });
  }
};

export const createBlankFile = (actions: ActionsProps, nameFile: string) => {
  const {currentDrive, currentPathFolder, fileList, setFileList, } = actions;

  const newEmptyFile: CloudItem = {
    driveName: currentDrive || '/',
    isFolder: false,
    name: nameFile,
    path: `${currentPathFolder}/${nameFile}`,
  };

  console.log(newEmptyFile)
  
  CloudActions.createBlankFile(newEmptyFile.path).then(() => {
    console.log(`Created file '${newEmptyFile.path}'`);
    const cloneFileList = [...fileList];
    cloneFileList.push(newEmptyFile);
    setFileList(cloneFileList);
  });
}

export const onSearchFileOrFolder = (actions: ActionsProps) => (textToSearch: string) => new Promise<(string | JSX.Element)[]>(resolve => {
  const { currentDrive, currentPathFolder } = actions;
  CloudActions.searchAllItemsInFolder({
    nameDrive: currentDrive,
    folderPath: currentPathFolder,
    searchTokken: textToSearch,
  }).then(allFilesAndFolderGetted => {
    resolve(allFilesAndFolderGetted.search.map(({ path }, index) => 
      <p><Link target='_blank' key={`link_search_${index}`} rel='noreferrer' sx={{ marginLeft: {xs: 'none', sm:'auto'}, cursor: 'pointer'}} onClick={downloadFileOnlyWithPath(actions, `${path}`)}>
          {path}
        </Link></p>
    ));
  });
});

const downloadFileOnlyWithPath = (
  {currentDrive, setSnackBarMessage, setOpenSnackbar, setErrorSnackbar, setCloudState}: ActionsProps,
  path: string,
) => () => {
  setCloudState({ name: CloudStateName.DOWNLOADING, description: `Downloading file '${path}'`, });
  CloudActions.downloadFile({
    drive: currentDrive || '/',
    path,
  }).then(() => {
    setCloudState({ name: CloudStateName.NORMAL, description: '', });
    console.log('File downloaded!!');
    setSnackBarMessage(`File '${path}' has downloaded.`);
    setErrorSnackbar(false);
    setOpenSnackbar(true);
  });
};

export const changeDrive = ({currentDrive, driveList, indexCurrentDrive, setIndexCurrentDrive, setCurrentPathFolder}: ActionsProps, driveNameToChange: string) => new Promise<string>(resolve =>{
  if (currentDrive !== driveNameToChange && driveList) {
    const driveIndex = driveList.indexOf(driveNameToChange);
    if (driveIndex > -1 && indexCurrentDrive !== driveIndex) {
      setIndexCurrentDrive(driveIndex);
      setCurrentPathFolder(currentDrive);
      resolve('');
    }
  }
});

export const deleteItemAction = (actions: ActionsProps, nameFile: string) => {
  const {currentPathFolder, currentDrive, setSnackBarMessage, setErrorSnackbar, setOpenSnackbar, fileList, setFileList} = actions;
  const pathFile = `${currentPathFolder}/${nameFile}`;

  if (isCreatedFile(actions, nameFile, false)) {
    CloudActions.deleteFileOrFolder({
      drive: currentDrive,
      path: pathFile,
    }).then(({message}) => {
        console.log(message);
        if (message !== 'ok') {
          setSnackBarMessage(message);
          setErrorSnackbar(true);
          setOpenSnackbar(true);
        }
        const indexToDelete = fileList.findIndex(item => item.name === nameFile);
        if (indexToDelete > -1) {
          const cloneFileList = [...fileList];
          cloneFileList.splice(indexToDelete, 1);
          setFileList(cloneFileList);
        }
      });
  }
}

export const putInSelectedItemList = ({setSelectedNodes, selectedNodes, fileList}: ActionsProps, nameFile: string, isSelected: boolean) => {
  const cloneSelectedFileList = [...selectedNodes];
  if (isSelected) {
    const indexItem = fileList.findIndex(item => item.name === nameFile);
    cloneSelectedFileList.push(fileList[indexItem].path);
  } else {
    const indexItem = cloneSelectedFileList.findIndex(itemPath => itemPath.includes(nameFile));
    cloneSelectedFileList.splice(indexItem, 1);
  }
  console.log(cloneSelectedFileList)
  setSelectedNodes(cloneSelectedFileList);
}

export const moveItemListToFolder = (actions: ActionsProps) => {
  const {setSelectedNodes, selectedNodes, currentPathFolder, setSnackBarMessage, setErrorSnackbar, setOpenSnackbar } = actions;
  if (selectedNodes && selectedNodes.length > 0) {
    const newPathList = selectedNodes.map(nameFile => `${currentPathFolder}/${getNameFileOfFolder(nameFile)}`);
  
    CloudActions.moveItem({
      oldPathList: selectedNodes,
      newPathList,
    }).then(({message}) => {
      setSnackBarMessage(message);
      setErrorSnackbar(false);
      setOpenSnackbar(true);

      synchronizeWithCloud(actions);
      setSelectedNodes([]);
    })
  }
}

export const zipFolder = (actions: ActionsProps, nameFolder: string) => {
  const {currentPathFolder, setSnackBarMessage, setErrorSnackbar, setOpenSnackbar} = actions;
  const relativePathToZip = `${currentPathFolder}/${nameFolder}`;

  setSnackBarMessage('Creating zip file...');
  setErrorSnackbar(false);
  setOpenSnackbar(true);

  CloudActions.zipFolder({
    relativePathToZip,
    compression: 0
  }).then(({message}) => {
    console.log(message);
    setSnackBarMessage(message);
    setErrorSnackbar(false);
    setOpenSnackbar(true);

    synchronizeWithCloud(actions);
  });
};
