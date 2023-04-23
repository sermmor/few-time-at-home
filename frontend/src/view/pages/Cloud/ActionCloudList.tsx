import { CloudActions } from "../../../core/actions/cloud";
import { CloudItem, urlFolder } from "../../../data-model/cloud";
import { GenericTree } from "../../../service/trees/genericTree";

export interface ActionsProps {
  tree: GenericTree<CloudItem>;
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