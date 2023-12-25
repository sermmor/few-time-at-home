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
}

export const uploadFile = (
  {setFileList, currentTreeNode, setCurrentTreeNode, breadcrumb, setBreadcrumb, currentDrive, setTree}: ActionsProps,
  event: React.DragEvent<HTMLDivElement>,
  setFiles: React.Dispatch<React.SetStateAction<File[]>>
) => {
  if (`${currentTreeNode?.label}` === '/') {
    console.log('It\'s the root path, here don\'t upload anything!!!');
    return;
  }

  // Fetch the files
  const droppedFiles = Array.from(event.dataTransfer.files);
  setFiles(droppedFiles);
  
  droppedFiles.forEach((file) => {
    const reader = new FileReader();
    
    reader.onloadend = () => {
      // TODO: Don't upload files until all is readed.
      CloudActions.uploadFile({
        drive: currentDrive || '/',
        files: [file],
        numberOfFiles: 1, // TODO: Upload more than one file.
        pathToSave: `${currentTreeNode?.label}`,
      }).then(message => {
        // TODO: Show message in a user friendly way like a green notification at the top.
        console.log(message);
        CloudActions.getAllItems(currentDrive || '/').then(data => {
          // console.log(data)
          setTree(data.data);
          setCurrentTreeNode(data.data);
          setFileList({data: data.data.children.map((item, index) => item.node ? item.node : ({
            name: item.label,
            isNotFolder: false,
            driveName: currentDrive,
            path: `${urlFolder}_${index}`
          } as CloudItem))});
          // TODO: Return to the last folder, not root.
        });
      });
    };

    reader.onerror = () => {
      console.error('There was an issue reading the file.');
    };

    reader.readAsDataURL(file);
    return reader;
  });
};

export const downloadFile = (
  {currentTreeNode, currentDrive}: ActionsProps,
  item: CloudItem,
) => {
  CloudActions.downloadFile({
    drive: currentDrive || '/',
    path: `${currentTreeNode?.label}/${item.name}`,
  }).then(() => {
    // TODO: Show message in a user friendly way like a green notification at the top.
    console.log('File downloaded!!');
  });
};
