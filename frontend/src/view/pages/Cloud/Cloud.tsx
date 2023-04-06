import React from "react";
import { CloudItem } from "../../../data-model/cloud";
import { GenericTree } from "../../../service/trees/genericTree";
import { CloudActions } from "../../../core/actions/cloud";
import { Box } from "@mui/material";

export const Cloud = () => {
  const [tree, setTree] = React.useState<GenericTree<CloudItem>>();
  const [currentTreeNode, setCurrentTreeNode] = React.useState<GenericTree<CloudItem>>();
  const [fileList, setFileList] = React.useState<{data: CloudItem[]}>();
  const [driveList, setDriveList] = React.useState<string[]>();
  const [currentDrive, setCurrentDrive] = React.useState<string>();

  React.useEffect(() => { CloudActions.getDrivesList().then(({ driveList }) => {
    // For now, I'll choose the first one drive list.
    setDriveList(driveList);
    const defaultDrive = driveList[0];
    setCurrentDrive(defaultDrive);
    CloudActions.getAllItems(defaultDrive).then(data => {
      // console.log(data)
      setTree(data.data);
      setCurrentTreeNode(data.data);
      setFileList({data: data.data.children.map((item, index) => item.node ? item.node : ({ name: item.label, isNotFolder: false, driveName: defaultDrive }))})
    })
  })}, []);

  return (<>
    <Box>
      {
        driveList && driveList.map((drive, index) => <p key={index}>{drive}</p>)
      }
    </Box>
    <Box>
      {
        fileList && fileList.data.map((cloudItem, index) => <p key={index}>{cloudItem.name}, ¿is folder?({!cloudItem.isNotFolder ? 'true' : 'false'})</p>)
      }
    </Box>
  </>);
};
