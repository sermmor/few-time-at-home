import { CloudActions } from "../../../core/actions/cloud";
import { CloudItem, addPrefixUrlFolder, urlFolder } from "../../../data-model/cloud";
import { GenericTree } from "../../../service/trees/genericTree";

export interface ActionsProps {
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

export const checkToReturnToPath = ({ currentTreeNode, currentDrive, setCurrentTreeNode, breadcrumb, setBreadcrumb, setFileList, isMarkToReturnToPath, setMarkToReturnToPath, pathToReturn, setPathToReturn }: ActionsProps) => {
  if (isMarkToReturnToPath) {
    // Prevent for multiple render using a setTimeout and a checking counter var.
    renderCounter++;
    if (renderCounter === 1) {
      setTimeout(() => {
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
      }, 0);
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

const uploadListFilesOneToOne = (
  actions: ActionsProps,
  fileList: File[]
) => {
  const { setSnackBarMessage, setOpenSnackbar, setErrorSnackbar } = actions;
  if (fileList.length === 0) {
    console.log('All files has uploaded to cloud!');
    setSnackBarMessage(`All files has uploaded to cloud!`);
    setErrorSnackbar(false);
    setOpenSnackbar(true);

    // Reflesh cloud and return to the current folder.
    refleshCloudView(actions);
  } else {
    uploadOnlyOneFile(actions, fileList[0]).then(() => uploadListFilesOneToOne(actions, fileList.slice(1)));
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
  {currentTreeNode, currentDrive, setSnackBarMessage, setOpenSnackbar, setErrorSnackbar}: ActionsProps,
  item: CloudItem,
) => {
  // console.log(item)
  CloudActions.downloadFile({
    drive: currentDrive || '/',
    path: `${currentTreeNode?.label}/${item.name}`,
  }).then(() => {
    console.log('File downloaded!!');
    setSnackBarMessage(`File '${item.name}' has downloaded.`);
    setErrorSnackbar(false);
    setOpenSnackbar(true);
  });
};

export const renameCloudItem = (
  {fileList, setFileList, currentTreeNode, setCurrentTreeNode}: ActionsProps, 
  item: CloudItem,
  newName: string,
  oldPath: string
) => {
  const newPath = `/${item.path.split('/').slice(0, -1).join('/')}/${newName}`;

  const cloneList = [...fileList.data];
  const index = cloneList.findIndex(itemCanditate => itemCanditate.path === item.path);
  const elementToEdit = {...cloneList[index]};
  cloneList[index] = {
    ...cloneList[index],
    path: newPath,
    name: newName,
  };

  console.log(elementToEdit)
  console.log(cloneList[index])

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

export const renameCloudFolder = ({fileList, setFileList, currentTreeNode, setCurrentTreeNode}: ActionsProps, id: string) => (newName: string) => {
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

    console.log(currentTreeNode)

    setCurrentTreeNode(currentTreeNode);

    // TODO: Change name folder in server.
  }
}

export const addFolderActionItemList = (actions: ActionsProps, folderToAdd: CloudItem) => {
  const {currentDrive, currentTreeNode, setSnackBarMessage, setErrorSnackbar, setOpenSnackbar} = actions;
  if (`${currentTreeNode?.label}` === '/') {
    console.error('It\'s the root path, here don\'t upload anything!!!');
    setSnackBarMessage(`It's the root path, here don't upload anything!!!`);
    setErrorSnackbar(true);
    setOpenSnackbar(true);
    return;
  }
  
  const newEmptyFile: CloudItem = {
    driveName: currentDrive || '/',
    isNotFolder: true,
    name: `emptyfile.txt`,
    path: `${folderToAdd!.path}/emptyfile.txt`.split('//').join('/'),
  };
  console.log(folderToAdd)
  console.log(folderToAdd.path)
  console.log(newEmptyFile)

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

