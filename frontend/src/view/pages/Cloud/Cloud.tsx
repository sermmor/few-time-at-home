import React from "react";
import { Box, SxProps, Theme } from "@mui/material";
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { CloudItem, urlFolder } from "../../../data-model/cloud";
import { GenericTree } from "../../../service/trees/genericTree";
import { CloudActions } from "../../../core/actions/cloud";
import { TitleAndListWithFolders } from "../../organism/TitleAndListWithFolders/TitleAndListWithFolders";
import { LabelAndTextFieldWithFolder } from "../../molecules/LabelAndTextFieldWithFolder/LabelAndTextFieldWithFolder";
import { LabelAndUrlField } from "../../molecules/LabelAndUrlField/LabelAndUrlField";
import { ActionsProps, addFolderActionItemList, checkToReturnToPath, downloadFile, goBackToParentFolder, onSearchFileOrFolder, renameCloudFolder, renameCloudItem, setOpenFolder, uploadFiles } from "./ActionCloudList";

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref,
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

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

const removeRootFromPath = (path: string): string => path.substring(1);

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
  const [dragIsOver, setDragIsOver] = React.useState(false);
  const [files, setFiles] = React.useState<File[]>([]);
  const [openSnackbar, setOpenSnackbar] = React.useState(false);
  const [isErrorSnackbar, setErrorSnackbar] = React.useState(false);
  const [snackBarMessage, setSnackBarMessage] = React.useState<string>('This is fine.');
  const [isMarkToReturnToPath, setMarkToReturnToPath] = React.useState(false);
  const [pathToReturn, setPathToReturn] = React.useState<GenericTree<CloudItem>[]>([]);
  const onCloseSnackBar = (event?: React.SyntheticEvent | Event, reason?: string) => reason === 'clickaway' || setOpenSnackbar(false);

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
    });
  })}, []);

  const action: ActionsProps = { tree: tree!, setTree, fileList: fileList!, currentDrive: currentDrive!, setFileList, currentTreeNode: currentTreeNode!,
    setCurrentTreeNode, breadcrumb, setBreadcrumb, selectedNodes, setSelectedNodes, setOpenSnackbar, setSnackBarMessage, setErrorSnackbar,
    isMarkToReturnToPath, setMarkToReturnToPath, pathToReturn, setPathToReturn };
  
  // TODO: Crear opción de borrar con diálogo de aviso y CARPETA PAPELERA. Que se oculten los ficheros 'emptyfile.txt' y se borren automáticamente en cuanto tengamos algo en la carpeta.
  // TODO: El endpoint de crear fichero vacío existe ya y se está usando cuando se crea nueva carpeta. La idea es poder crear estos ficheros y editarlos en la cloud con un editor.
  // TODO: La cloud se lía un poco parda cuando voy a reemplazar un fichero por otro con el mismo nombre. Esto hay que arreglarlo, porque se debe poder reemplazar ficheros sin problemas.
  // TODO: Opción de poder mover listado de ficheros de una carpeta a otra (que es usar enpoints de rename file y rename folder, pero...).

  // Define the event handlers
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragIsOver(true);
  };
 
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragIsOver(false);
  };
 
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragIsOver(false);
    uploadFiles(action, event, setFiles);
  };

  const handleUploadButton = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    if (event.target.files && event.target.files.length > 0) {
      uploadFiles(action, undefined, undefined, event.target.files[0]);
    }
  }

  checkToReturnToPath(action);

  return <Box sx={formStyle}>
    {fileList && <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          backgroundColor: dragIsOver ? 'Highlight' : 'white',
        }}
      >
      <TitleAndListWithFolders
        title='Cloud'
        id='cloud_0'
        path={`${currentTreeNode?.label}`}
        onUploadItem={handleUploadButton}
        // duplicateItem={() => undefined}
        // onSelectItem={(id, checked) => isSelectedItemList(action, id, checked)}
        // onOutSelectionMode={() => setSelectedNodes([])}
        // onMoveItem={(idList) => moveItemListToFolder(action, idList)}
        onSearch={onSearchFileOrFolder(action)}
        // createFile={(nameFile) => undefined}
        // addAction={() => { indexNewBookmarkAdded++; addActionItemList(action, { url: `new url ${indexNewBookmarkAdded}`, title: `new title ${indexNewBookmarkAdded}`}) } }
        addFolder={() => { indexNewCloudItemAdded++; addFolderActionItemList(action, {
          driveName: currentDrive || '/',
          isNotFolder: false,
          name: `new folder ${indexNewCloudItemAdded}`,
          path: removeRootFromPath(cleanLabelFolder(`${currentTreeNode!.label}/new folder ${indexNewCloudItemAdded}`)),
        })}}
        goBackToParent={() => goBackToParentFolder(action)}
        list={
          fileList.data.map((item, index) => ({id:`${item.name}`, isFolder: !item.isNotFolder, item: <>{
            !item.isNotFolder ?
              <LabelAndTextFieldWithFolder
                backgroundColor={(index % 2 === 0) ? '#D3D3D3' : '#FFFFFF'}
                text={item.name}
                path={getPathParentFolder(item.name)}
                nameFolder={getNameFolder(item.name)}
                // path={getPathParentFolder(item.title)}
                // nameFolder={getNameFolder(item.title)}
                onChange={renameCloudFolder(action, `${item.path}`)}
                setOpenFolder={(label) => setOpenFolder(action, label)}
                />
            :
              <LabelAndUrlField
                backgroundColor={(index % 2 === 0) ? '#D3D3D3' : '#FFFFFF'}
                textToShow={item.name}
                hideUrl={true}
                textUrl={`${currentTreeNode?.label}/${item.name}`}
                onClickUrl={() => downloadFile(action, item)}
                onChange={(newTextToShow, newTextUrl) => renameCloudItem(action, item, newTextToShow, newTextUrl)}
                />
              }
            </>
          }))

        }
      />
    </div>
    }
  <Snackbar anchorOrigin={{ vertical: 'top', horizontal: 'center' }} open={openSnackbar} autoHideDuration={3000} onClose={onCloseSnackBar} key={'topcenter'}>
    <Alert onClose={onCloseSnackBar} severity={isErrorSnackbar ? 'error' : 'success'} sx={{ width: '100%' }}>
      {snackBarMessage}
    </Alert>
  </Snackbar>
  </Box>;
};
