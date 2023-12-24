import React from "react";
import { CloudItem, urlFolder } from "../../../data-model/cloud";
import { GenericTree } from "../../../service/trees/genericTree";
import { CloudActions } from "../../../core/actions/cloud";
import { Box, Button, SxProps, Theme } from "@mui/material";
import { TitleAndListWithFolders } from "../../organism/TitleAndListWithFolders/TitleAndListWithFolders";
import { LabelAndTextFieldWithFolder } from "../../molecules/LabelAndTextFieldWithFolder/LabelAndTextFieldWithFolder";
import { LabelAndUrlField } from "../../molecules/LabelAndUrlField/LabelAndUrlField";
import { ActionsProps, goBackToParentFolder, renameCloudItem, setOpenFolder } from "./ActionCloudList";

const formStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
};

// const SaveNotesComponent = ({ tree, }: { tree: GenericTree<CloudItem>, }) => {
//   const [isSave, setSave] = React.useState<boolean>(false);
//   const setConfiguration = () => {
    // console.log(GenericTree.toString(tree, current => `{${current.title} | ${current.url}}`))
    
    // BookmarksActions.sendBookmarks({data: tree}).then(() => {
    //   setSave(true);
    //   setTimeout(() => setSave(false), 500);
    // });
//   }
//   return <Box
//     sx={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingRight: { xs: '0rem', sm: '3rem'}, paddingBottom: '3rem'}}
//     >
//       <Button
//         variant='contained'
//         sx={{minWidth: '15.5rem'}}
//         onClick={() => setConfiguration()}
//         >
//         Save
//         </Button>
//         {isSave && <Box sx={{paddingLeft: '1rem'}}>Saved!</Box>}
//     </Box>
// };

let indexNewCloudItemAdded = 0;

const cleanLabelFolder = (label: string): string => label.split('//').join('/');

const getPathParentFolder = (completePath: string): string => {
  const textSplited = completePath.split('/');
  return textSplited.slice(0, textSplited.length - 1).join('/');
}

const getNameFolder = (completePath: string): string => {
  const textSplited = completePath.split('/');
  return textSplited[textSplited.length - 1];
}

export const Cloud = () => {
  const [tree, setTree] = React.useState<GenericTree<CloudItem>>();
  const [currentTreeNode, setCurrentTreeNode] = React.useState<GenericTree<CloudItem>>();
  const [fileList, setFileList] = React.useState<{data: CloudItem[]}>();
  const [driveList, setDriveList] = React.useState<string[]>();
  const [currentDrive, setCurrentDrive] = React.useState<string>();
  const [breadcrumb, setBreadcrumb] = React.useState<GenericTree<CloudItem>[]>([]);
  const [selectedNodes, setSelectedNodes] = React.useState<GenericTree<CloudItem>[]>([]);

  React.useEffect(() => { CloudActions.getDrivesList().then(({ driveList }) => {
    // For now, I'll choose the first one drive list.
    setDriveList(driveList);
    const defaultDrive = driveList[0];
    setCurrentDrive(defaultDrive);
    CloudActions.getAllItems(defaultDrive).then(data => {
      // console.log(data)
      setTree(data.data);
      setCurrentTreeNode(data.data);
      setFileList({data: data.data.children.map((item, index) => item.node ? item.node : ({ name: item.label, isNotFolder: false, driveName: defaultDrive, path: `${urlFolder}_${index}` }))})
    })
  })}, []);

  const action: ActionsProps = { tree: tree!, fileList: fileList!, currentDrive: currentDrive!, setFileList, currentTreeNode: currentTreeNode!, setCurrentTreeNode, breadcrumb, setBreadcrumb, selectedNodes, setSelectedNodes};
  
  // TODO: Searcher field!!!
  // TODO: En la cloud no se borra nada. Se borran las cosas en el gestor de ficheros. Así evitamos pérdidas de ficheros o carpetas por error.
  // TODO: Las carpetas no se crean en la cloud hasta que algo esté dentro de ellas.
  // TODO: Cada acción que modifique el árbol conlleva un guardado del árbol en la nube, es decir hay un guardado automático.

  return <Box sx={formStyle}>
    {fileList && <>
      <TitleAndListWithFolders
        title='Bookmarks'
        id='Bookmarks_0'
        path={`${currentTreeNode?.label}`}
        // duplicateItem={() => undefined}
        // onSelectItem={(id, checked) => isSelectedItemList(action, id, checked)}
        // onOutSelectionMode={() => setSelectedNodes([])}
        // onMoveItem={(idList) => moveItemListToFolder(action, idList)}
        // onRenameAction={(id) => renameActionList(action, id)}
        // onSearch={onSearchItem}
        // createFile={(nameFile) => undefined}
        // addAction={() => { indexNewBookmarkAdded++; addActionItemList(action, { url: `new url ${indexNewBookmarkAdded}`, title: `new title ${indexNewBookmarkAdded}`}) } }
        // addFolder={() => { indexNewBookmarkAdded++; addFolderActionItemList(action, {
        //   title: cleanLabelFolder(`${currentTreeNode!.label}/new folder ${indexNewBookmarkAdded}`),
        //   url: `${urlFolder}_${indexNewBookmarkAdded}`
        // }) }}
        goBackToParent={() => goBackToParentFolder(action)}
        list={
          fileList.data.map((item, index) => ({id:`${item.name}`, isFolder: !item.isNotFolder, item: <>{
            !item.isNotFolder ?
              <LabelAndTextFieldWithFolder
                backgroundColor={(index % 2 === 0) ? '#D3D3D3' : '#FFFFFF'}
                text={item.name}
                path={getPathParentFolder(item.path)}
                nameFolder={getNameFolder(item.path)}
                onChange={() => undefined}
                // path={getPathParentFolder(item.title)}
                // nameFolder={getNameFolder(item.title)}
                // onChange={editFolderActionList(action, `${item.url}`)}
                setOpenFolder={(label) => setOpenFolder(action, label)}
                />
            :
              <LabelAndUrlField
                backgroundColor={(index % 2 === 0) ? '#D3D3D3' : '#FFFFFF'}
                textToShow={item.name}
                hideUrl={true}
                textUrl={item.name}
                onChange={(newTextToShow, newTextUrl) => renameCloudItem(item, newTextToShow)}
                />
              }
            </>
          }))

        }
      />
    </>
    }
  </Box>;
};
