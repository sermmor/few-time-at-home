import { CloudActions } from "../../../core/actions/cloud";
import { CloudItem, urlFolder } from "../../../data-model/cloud";
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
  setErrorSnackbar: React.Dispatch<React.SetStateAction<boolean>>
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

const refleshCloudView = ({ setTree, setCurrentTreeNode, currentDrive, setFileList, breadcrumb, setBreadcrumb, currentTreeNode }: ActionsProps) => {
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

    // TODO: Return to the last folder, not root.
    setBreadcrumb([]);
    setTimeout(
      () => {
        // TODO: Lo siguiente no funciona, así que hay que pensar una forma de cómo hacerlo sin usar el setOpenFolder.
        // let bc;
        // for (let i = 0; i < breadcrumbCopy.length; i++) {
        //   bc = breadcrumbCopy[i];
        //   setOpenFolder(actions, bc.label);
        //   console.log(bc.label);
        // }
      }, 0
    )
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

export const renameCloudItem = (item: CloudItem, newTextToShow: string) => {
  CloudActions.renameItem({
    drive: item.driveName,
    oldPath: item.path,
    newPath: `${item.path.split('/').slice(0, -1).join('/')}/${newTextToShow}`}
  ).then((data) => {
    console.log(data)
    // TODO: Show data.message in the app.
    // TODO: REFLESH ALL THE TREE AND DATA!!!
  });
};
