import { Link } from "@mui/material";
import { CloudActions } from "../../../core/actions/cloud";
import { CloudItem, getPathFolderContainer } from "../../../data-model/cloud";
import { GenericTree } from "../../../service/trees/genericTree";
import { CloudState, CloudStateName } from "./Models/CloudState";
import { TemporalData } from "../../../service/temporalData.service";

export interface ActionsProps {
  cloudState: CloudState;
  setCloudState: React.Dispatch<React.SetStateAction<CloudState>>;
  currentPathFolder: string;
  setCurrentPathFolder: React.Dispatch<React.SetStateAction<string>>;
  fileList: CloudItem[];
  setFileList: React.Dispatch<React.SetStateAction<CloudItem[]>>;
  selectedNodes: CloudItem[];
  setSelectedNodes: React.Dispatch<React.SetStateAction<CloudItem[]>>;
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

export const goBackToParentFolder = ({currentPathFolder, setCurrentPathFolder, setFileList, currentDrive}: ActionsProps) => {
  const parentPathFolder = getPathFolderContainer(currentPathFolder);
  if (parentPathFolder !== '') {
    CloudActions.getAllFolderItems({
      drive: currentDrive,
      folderPath: parentPathFolder,
    }).then(res => {
      setCurrentPathFolder(parentPathFolder);
      setFileList(res.data);
    });
  }
}

export const setOpenFolder = ({currentPathFolder, currentDrive, setCurrentPathFolder, setFileList}: ActionsProps, labelFolder: string) => {
  const newPath = `${currentPathFolder}/${labelFolder}`;
  CloudActions.getAllFolderItems({
    drive: currentDrive,
    folderPath: newPath,
  }).then(res => {
    setCurrentPathFolder(newPath);
    setFileList(res.data);
  });
}

let renderCounter = 0;

// TODO: CANDIDATO A BORRAR
export const checkToReturnToPath = ({ currentDrive, setFileList,
  isMarkToReturnToPath, setMarkToReturnToPath, pathToReturn, setPathToReturn, setSnackBarMessage, setErrorSnackbar, setOpenSnackbar }: ActionsProps
) => {
  // if (isMarkToReturnToPath) {
  //   // Prevent for multiple render using a setTimeout and a checking counter var.
  //   renderCounter++;
  //   if (renderCounter === 1) {
  //     setTimeout(() => {
  //       try {
  //         const cloneBreadcrumb = [...breadcrumb];
  
  //         let labelFolder, childIndex, newCurrentTreeNode, newFileList;
  //         newCurrentTreeNode = currentTreeNode;
  
  //         cloneBreadcrumb.push(newCurrentTreeNode);
  
  //         for (let i = 1; i < pathToReturn.length; i++) {
  //           labelFolder = pathToReturn[i].label;
  //           childIndex = newCurrentTreeNode.searchLabelInChild(labelFolder);
  //           newCurrentTreeNode = newCurrentTreeNode.children[childIndex];
  
  //           newFileList = {data: newCurrentTreeNode.children.map((item, index) => 
  //             item.node ? item.node : ({ name: item.label, isNotFolder: false, driveName: currentDrive, path: `${urlFolder}_${index}` }))};
    
  //           cloneBreadcrumb.push(newCurrentTreeNode);
  //         }
  
  //         cloneBreadcrumb.pop(); // The 2 last ones are the same node.
  
  //         setBreadcrumb(cloneBreadcrumb);
  //         setFileList(newFileList);
  //         setCurrentTreeNode(newCurrentTreeNode);
  
  //         setMarkToReturnToPath(false);
  //         setPathToReturn([]);
  //         renderCounter = 0;
  //       } catch (e) {
  //         console.log('Error to auto-reflesh cloud view, reflesh manually.');
  //         setSnackBarMessage('Error to auto-reflesh cloud view, reflesh manually.');
  //         setErrorSnackbar(true);
  //         setOpenSnackbar(true);
          
  //         setBreadcrumb([]);
  //         setMarkToReturnToPath(true);
  //         setPathToReturn(pathToReturn);
  //       }
  //     }, 100);
  //   }
  // }
};

const refleshCloudView = ({ currentDrive, setFileList, setMarkToReturnToPath, setPathToReturn }: ActionsProps) => {
  // const breadcrumbCopy = [...breadcrumb];
  // breadcrumbCopy.push(currentTreeNode);

  // CloudActions.getAllItems(currentDrive || '/').then(data => {
  //   setTree(data.data);
  //   setCurrentTreeNode(data.data);

  //   setFileList({data: data.data.children.map((item, index) => item.node ? item.node : ({
  //     name: item.label,
  //     isNotFolder: false,
  //     driveName: currentDrive,
  //     path: `${urlFolder}_${index}`
  //   } as CloudItem))});

  //   setBreadcrumb([]);
  //   setMarkToReturnToPath(true);
  //   setPathToReturn(breadcrumbCopy);
  // });
};

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

export const uploadFiles = (
  actions: ActionsProps,
  event?: React.DragEvent<HTMLDivElement>,
  file?: File
) => {
  // Fetch the files
  let droppedFiles;
  if (!file && event) {
    droppedFiles = Array.from(event.dataTransfer.files);
  } else if (file) {
    droppedFiles = [file];
  }
  if (droppedFiles) {
    uploadListFilesOneToOne(actions, droppedFiles);
  }
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

export const changeDrive = ({currentDrive, driveList, indexCurrentDrive, setIndexCurrentDrive}: ActionsProps, driveNameToChange: string) => () => {
  if (currentDrive !== driveNameToChange && driveList) {
    // console.log(driveList, currentDrive, driveNameToChange)
    const driveIndex = driveList.indexOf(driveNameToChange);
    if (driveIndex > -1 && indexCurrentDrive !== driveIndex) {
      setIndexCurrentDrive(driveIndex);
    }
  }
}

const getItemIndexFromTreeNode = (currentTreeNode: GenericTree<CloudItem>, nameFile: string): number => currentTreeNode.children.findIndex(child => child.node?.name === nameFile);

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
