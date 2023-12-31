import { Link } from "@mui/material";
import { CloudActions } from "../../../core/actions/cloud";
import { CloudItem, addPrefixUrlFolder, urlFolder } from "../../../data-model/cloud";
import { GenericTree } from "../../../service/trees/genericTree";
import { CloudState, CloudStateName } from "./Models/CloudState";

export interface ActionsProps {
  cloudState: CloudState;
  setCloudState: React.Dispatch<React.SetStateAction<CloudState>>;
  tree: GenericTree<CloudItem>;
  setTree: React.Dispatch<React.SetStateAction<GenericTree<CloudItem> | undefined>>;
  fileList: {data: CloudItem[]};
  setFileList: React.Dispatch<React.SetStateAction<{ data: CloudItem[]; } | undefined>>;
  currentTreeNode: GenericTree<CloudItem>;
  setCurrentTreeNode: React.Dispatch<React.SetStateAction<GenericTree<CloudItem> | undefined>>;
  breadcrumb: GenericTree<CloudItem>[];
  setBreadcrumb: React.Dispatch<React.SetStateAction<GenericTree<CloudItem>[]>>;
  selectedNodes: GenericTree<CloudItem>[];
  setSelectedNodes: React.Dispatch<React.SetStateAction<GenericTree<CloudItem>[]>>;
  currentDrive: string;
  setSnackBarMessage: React.Dispatch<React.SetStateAction<string>>;
  setOpenSnackbar: React.Dispatch<React.SetStateAction<boolean>>;
  setErrorSnackbar: React.Dispatch<React.SetStateAction<boolean>>;
  isMarkToReturnToPath: boolean;
  setMarkToReturnToPath: React.Dispatch<React.SetStateAction<boolean>>;
  pathToReturn: GenericTree<CloudItem>[];
  setPathToReturn: React.Dispatch<React.SetStateAction<GenericTree<CloudItem>[]>>;
  setIndexCurrentDrive: React.Dispatch<React.SetStateAction<number>>;
  indexCurrentDrive: number;
  driveList: string[] | undefined;
}

export const goBackToParentFolder = ({setFileList, setCurrentTreeNode, breadcrumb, setBreadcrumb, currentDrive}: ActionsProps) => {
  const cloneBreadcrumb = [...breadcrumb];
  const parentTreeNode = cloneBreadcrumb.pop();

  if (parentTreeNode) {
    const newFileList = {data: parentTreeNode.children.map((item, index) => 
      item.node ? item.node : ({ name: item.label, isNotFolder: false, driveName: currentDrive, path: `${urlFolder}_${index}` }))};
  
    setBreadcrumb(cloneBreadcrumb);
    setFileList(newFileList);
    setCurrentTreeNode(parentTreeNode);
  }
}

export const setOpenFolder = ({setFileList, currentTreeNode, setCurrentTreeNode, breadcrumb, setBreadcrumb, currentDrive}: ActionsProps, labelFolder: string) => {
  if (currentTreeNode) {
    const childIndex = currentTreeNode.searchLabelInChild(labelFolder);
    const newCurrentTreeNode = currentTreeNode.children[childIndex];

    const newFileList = {data: newCurrentTreeNode.children.map((item, index) => 
      item.node ? item.node : ({ name: item.label, isNotFolder: false, driveName: currentDrive, path: `${urlFolder}_${index}` }))};
    
    const cloneBreadcrumb = [...breadcrumb];
    cloneBreadcrumb.push(currentTreeNode);

    setBreadcrumb(cloneBreadcrumb);
    setFileList(newFileList);
    setCurrentTreeNode(newCurrentTreeNode);
  }
}

let renderCounter = 0;

export const checkToReturnToPath = ({ currentTreeNode, currentDrive, setCurrentTreeNode, breadcrumb, setBreadcrumb, setFileList,
  isMarkToReturnToPath, setMarkToReturnToPath, pathToReturn, setPathToReturn, setSnackBarMessage, setErrorSnackbar, setOpenSnackbar }: ActionsProps
) => {
  if (isMarkToReturnToPath) {
    // Prevent for multiple render using a setTimeout and a checking counter var.
    renderCounter++;
    if (renderCounter === 1) {
      setTimeout(() => {
        try {
          const cloneBreadcrumb = [...breadcrumb];
  
          let labelFolder, childIndex, newCurrentTreeNode, newFileList;
          newCurrentTreeNode = currentTreeNode;
  
          cloneBreadcrumb.push(newCurrentTreeNode);
  
          for (let i = 1; i < pathToReturn.length; i++) {
            labelFolder = pathToReturn[i].label;
            childIndex = newCurrentTreeNode.searchLabelInChild(labelFolder);
            newCurrentTreeNode = newCurrentTreeNode.children[childIndex];
  
            newFileList = {data: newCurrentTreeNode.children.map((item, index) => 
              item.node ? item.node : ({ name: item.label, isNotFolder: false, driveName: currentDrive, path: `${urlFolder}_${index}` }))};
    
            cloneBreadcrumb.push(newCurrentTreeNode);
          }
  
          cloneBreadcrumb.pop(); // The 2 last ones are the same node.
  
          setBreadcrumb(cloneBreadcrumb);
          setFileList(newFileList);
          setCurrentTreeNode(newCurrentTreeNode);
  
          setMarkToReturnToPath(false);
          setPathToReturn([]);
          renderCounter = 0;
        } catch (e) {
          console.log('Error to auto-reflesh cloud view, reflesh manually.');
          setSnackBarMessage('Error to auto-reflesh cloud view, reflesh manually.');
          setErrorSnackbar(true);
          setOpenSnackbar(true);
          
          setBreadcrumb([]);
          setMarkToReturnToPath(true);
          setPathToReturn(pathToReturn);
        }
      }, 100);
    }
  }
};

const refleshCloudView = ({ setTree, setCurrentTreeNode, currentDrive, setFileList, breadcrumb, setBreadcrumb, currentTreeNode, setMarkToReturnToPath, setPathToReturn }: ActionsProps) => {
  const breadcrumbCopy = [...breadcrumb];
  breadcrumbCopy.push(currentTreeNode);

  CloudActions.getAllItems(currentDrive || '/').then(data => {
    setTree(data.data);
    setCurrentTreeNode(data.data);

    setFileList({data: data.data.children.map((item, index) => item.node ? item.node : ({
      name: item.label,
      isNotFolder: false,
      driveName: currentDrive,
      path: `${urlFolder}_${index}`
    } as CloudItem))});

    setBreadcrumb([]);
    setMarkToReturnToPath(true);
    setPathToReturn(breadcrumbCopy);
  });
};

export const synchronizeWithCloud = (actions: ActionsProps) => {
  const { currentDrive } = actions;

  CloudActions.updateIndexing({drive: currentDrive}).then(() => {
    console.log("UPDATED CLOUD");
    refleshCloudView(actions);
  });

}

const uploadOnlyOneFile = (
  { currentTreeNode, currentDrive, setSnackBarMessage, setOpenSnackbar, setErrorSnackbar}: ActionsProps,
  file: File
): Promise<FileReader> => new Promise<FileReader> (resolve => {
  const reader = new FileReader();
    
  reader.onloadend = () => {
    CloudActions.uploadFile({
      drive: currentDrive || '/',
      files: [file],
      numberOfFiles: 1,
      pathToSave: `${currentTreeNode?.label}`,
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

const getFolderName = (label: string): string => {
  const labelSplitted = label.split('/');
  return labelSplitted[labelSplitted.length - 1];
};

const uploadListFilesOneToOne = (
  actions: ActionsProps,
  fileList: File[]
) => {
  const { setSnackBarMessage, setOpenSnackbar, setErrorSnackbar, currentTreeNode, setCloudState } = actions;
  if (fileList.length === 0) {
    setCloudState({ name: CloudStateName.NORMAL, description: '', });
    console.log('All files has uploaded to cloud!');
    setSnackBarMessage(`All files has uploaded to cloud!`);
    setErrorSnackbar(false);
    setOpenSnackbar(true);

    // Reflesh cloud and return to the current folder.
    refleshCloudView(actions);
  } else {
    const nameFileAndFolderList = currentTreeNode.children.map(child => child.node ? child.node.name : getFolderName(child.label));

    if (nameFileAndFolderList.indexOf(fileList[0].name) < 0) {
      setCloudState({ name: CloudStateName.UPLOADING, description: `Uploading file '${fileList[0].name}'`, });
      uploadOnlyOneFile(actions, fileList[0]).then(() => uploadListFilesOneToOne(actions, fileList.slice(1)));
    } else {
      // Item already in cloud, not replace!
      console.log(`Already there is a '${fileList[0].name}' in the cloud.`);
      setSnackBarMessage(`Already there is a '${fileList[0].name}' in the cloud.`);
      setErrorSnackbar(true);
      setOpenSnackbar(true);
      uploadListFilesOneToOne(actions, fileList.slice(1));
    }
  }
}

export const uploadFiles = (
  actions: ActionsProps,
  event?: React.DragEvent<HTMLDivElement>,
  setFiles?: React.Dispatch<React.SetStateAction<File[]>>,
  file?: File
) => {
  const { currentTreeNode, setSnackBarMessage, setOpenSnackbar, setErrorSnackbar} = actions;
  if (`${currentTreeNode?.label}` === '/') {
    console.error('It\'s the root path, here don\'t upload anything!!!');
    setSnackBarMessage(`It's the root path, here don't upload anything!!!`);
    setErrorSnackbar(true);
    setOpenSnackbar(true);
    return;
  }

  // Fetch the files
  let droppedFiles;
  if (!file && event && setFiles) {
    droppedFiles = Array.from(event.dataTransfer.files);
    setFiles(droppedFiles);
  } else if (file) {
    droppedFiles = [file];
  }
  if (droppedFiles) {
    uploadListFilesOneToOne(actions, droppedFiles);
  }
};

export const downloadFile = (
  {currentTreeNode, currentDrive, setSnackBarMessage, setOpenSnackbar, setErrorSnackbar, setCloudState}: ActionsProps,
  item: CloudItem,
) => {
  // console.log(item)
  setCloudState({ name: CloudStateName.DOWNLOADING, description: `Downloading file '${item.name}'`, });
  CloudActions.downloadFile({
    drive: currentDrive || '/',
    path: `${currentTreeNode?.label}/${item.name}`,
  }).then(() => {
    setCloudState({ name: CloudStateName.NORMAL, description: '', });
    console.log('File downloaded!!');
    setSnackBarMessage(`File '${item.name}' has downloaded.`);
    setErrorSnackbar(false);
    setOpenSnackbar(true);
  });
};

const isCreatedFile = (actions: ActionsProps, nameFile: string) => {
  const { currentTreeNode, setSnackBarMessage, setErrorSnackbar, setOpenSnackbar } = actions;
  const nameFileAndFolderList = currentTreeNode.children.map(child => child.node ? child.node.name : getFolderName(child.label));

  if (nameFileAndFolderList.indexOf(nameFile) > -1) {
    // Item already in cloud, not replace!
    console.log(`Already there is a '${nameFile}' in the cloud.`);
    setSnackBarMessage(`Already there is a '${nameFile}' in the cloud.`);
    setErrorSnackbar(true);
    setOpenSnackbar(true);
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
  if (isCreatedFile(actions, newName)) {
    return;
  }
  const {fileList, setFileList, currentTreeNode, setCurrentTreeNode} = actions;
  const newPath = `/${item.path.split('/').slice(0, -1).join('/')}/${newName}`;

  const cloneList = [...fileList.data];
  const index = cloneList.findIndex(itemCanditate => itemCanditate.path === item.path);
  const elementToEdit = {...cloneList[index]};
  cloneList[index] = {
    ...cloneList[index],
    path: newPath,
    name: newName,
  };

  setFileList({data: [...cloneList]});

  if (currentTreeNode) {
    const childIndex = currentTreeNode.searchNodeLeafInChild(elementToEdit, (item1, item2) => item1.path === item2.path);
    currentTreeNode.children[childIndex].node!.name = newName;
    currentTreeNode.children[childIndex].node!.path = newPath;
    
    setCurrentTreeNode(currentTreeNode);
  }
  
  CloudActions.renameItem({
    drive: item.driveName,
    oldPath: oldPath.substring(1),
    newPath: newPath.substring(1),
  }).then((data) => {
    console.log(data);
  });
};

const isCreatedFolder = ({ currentTreeNode, setSnackBarMessage, setErrorSnackbar, setOpenSnackbar}: ActionsProps, folderToAdd?: CloudItem, folderPath?: string): boolean => {
  const folderName = getFolderName(folderToAdd ? folderToAdd.path : folderPath || '');
  const nameFileAndFolderList = currentTreeNode.children.map(child => child.node ? child.node.name : getFolderName(child.label));

  console.log(folderName, nameFileAndFolderList, nameFileAndFolderList.indexOf(folderName))

  if (nameFileAndFolderList.indexOf(folderName) > -1) {
    console.log(`Already there is a '${folderName}' in the cloud.`);
    setSnackBarMessage(`Already there is a '${folderName}' in the cloud.`);
    setErrorSnackbar(true);
    setOpenSnackbar(true);
    return true;
  }
  return false;
}

export const renameCloudFolder = (actions: ActionsProps, id: string) => (newName: string) => {
  const {fileList, setFileList, currentTreeNode, setCurrentTreeNode, setSnackBarMessage, setErrorSnackbar, setOpenSnackbar} = actions;
  if (currentTreeNode.label === '/') {
    console.log(`You can't change a root folder name.`);
    setSnackBarMessage(`You can't change a root folder name.`);
    setErrorSnackbar(true);
    setOpenSnackbar(true);
    return;
  }

  if (isCreatedFolder(actions, undefined, newName)) {
    return;
  }
  
  const pathSplitted = newName.split('/');
  const newPath = addPrefixUrlFolder(pathSplitted.pop());

  const cloneList = [...fileList.data];
  const index = cloneList.findIndex(item => item.path === id);
  const elementToEdit = {...cloneList[index]};

  cloneList[index] = {
    ...cloneList[index],
    name: newName,
    path: newPath,
  };

  setFileList({data: [...cloneList]});

  if (currentTreeNode) {
    const childIndex = currentTreeNode.searchLabelInChild(elementToEdit.name);
    const splitNameFolder = newName.split('/');
    currentTreeNode.children[childIndex].renameLabelNode(splitNameFolder[splitNameFolder.length - 1]);

    setCurrentTreeNode(currentTreeNode);
    
    CloudActions.renameItem({
      drive: elementToEdit.driveName,
      oldPath: elementToEdit.name.substring(1),
      newPath: newName.substring(1),
    }).then((data) => {
      console.log(data);
    });
  }
}

export const nameFileForEmptyFolder = `emptyfile.txt`;

export const addFolderActionItemList = (actions: ActionsProps, folderToAdd: CloudItem) => {
  const {currentDrive, currentTreeNode, setSnackBarMessage, setErrorSnackbar, setOpenSnackbar} = actions;
  if (`${currentTreeNode?.label}` === '/') {
    console.error('It\'s the root path, here don\'t upload anything!!!');
    setSnackBarMessage(`It's the root path, here don't upload anything!!!`);
    setErrorSnackbar(true);
    setOpenSnackbar(true);
    return;
  }

  if (isCreatedFolder(actions, folderToAdd)) {
    return;
  }
  
  const newEmptyFile: CloudItem = {
    driveName: currentDrive || '/',
    isNotFolder: true,
    name: nameFileForEmptyFolder,
    path: `${folderToAdd!.path}/${nameFileForEmptyFolder}`.split('//').join('/'),
  };

  CloudActions.createFolder({
    drive: folderToAdd.driveName,
    path: folderToAdd.path,
  }).then(() => {
      CloudActions.createBlankFile({
        drive: newEmptyFile.driveName,
        path: newEmptyFile.path,
      }).then(() => {
        console.log(`Created folder '${folderToAdd.path}' with file '${newEmptyFile.name}'`);
        refleshCloudView(actions);
      });
    }
  );
};

export const onSearchFileOrFolder = (actions: ActionsProps) => (textToSearch: string) => new Promise<(string | JSX.Element)[]>(resolve => {
  const { currentDrive } = actions;
  CloudActions.searchAllItems({
    nameDrive: currentDrive,
    searchTokken: textToSearch,
  }).then(allFilesAndFolderGetted => {
    resolve(allFilesAndFolderGetted.search.map(({ path }) => 
      <p><Link target='_blank' rel='noreferrer' sx={{ marginLeft: {xs: 'none', sm:'auto'}, cursor: 'pointer'}} onClick={downloadFileOnlyWithPath(actions, `/${path}`)}>
         {path}
       </Link></p>
    ));
})});

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

export const changeDrive = ({currentDrive, driveList, indexCurrentDrive, setIndexCurrentDrive, setBreadcrumb}: ActionsProps, driveNameToChange: string) => () => {
  if (currentDrive !== driveNameToChange && driveList) {
    const driveIndex = driveList.indexOf(driveNameToChange);
    if (driveIndex > -1 && indexCurrentDrive !== driveIndex) {
      setBreadcrumb([]);
      setIndexCurrentDrive(driveIndex);
    }
  }
}

const getItemIndexFromTreeNode = (currentTreeNode: GenericTree<CloudItem>, nameFile: string): number => currentTreeNode.children.findIndex(child => child.node?.name === nameFile);

export const deleteItemAction = (actions: ActionsProps, id: string) => {
  const {currentTreeNode, currentDrive, setSnackBarMessage, setErrorSnackbar, setOpenSnackbar} = actions;
  if (currentTreeNode.label === '/') {
    return;
  }
  // ¿Es fichero o folder?
  let itemIndexInList = currentTreeNode.searchLabelInChild(id);
  let path = '';
  if (itemIndexInList === -1) {
    // Is a item, search!!
    itemIndexInList = getItemIndexFromTreeNode(currentTreeNode, id);
    path = currentTreeNode.children[itemIndexInList].node?.path || '';
  } else {
    path = id.substring(1);
  }
  
  CloudActions.deleteFileOrFolder({
    drive: currentDrive || '/',
    path,
  }).then(({message}) => {
    console.log(message);
    if (message !== 'ok') {
      setSnackBarMessage(message);
      setErrorSnackbar(true);
      setOpenSnackbar(true);
    }
    refleshCloudView(actions);
    // TODO: Actualizar arbol visualmente si no se ha actualizado solo (en teoría debería)
  });
}
