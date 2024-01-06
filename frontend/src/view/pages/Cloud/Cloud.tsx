import React from "react";
import { useNavigate } from 'react-router-dom';
import { Box, SxProps, Theme } from "@mui/material";
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { CloudItem } from "../../../data-model/cloud";
import { CloudActions } from "../../../core/actions/cloud";
import { TitleAndListWithFolders } from "../../organism/TitleAndListWithFolders/TitleAndListWithFolders";
import { LabelAndTextFieldWithFolder } from "../../molecules/LabelAndTextFieldWithFolder/LabelAndTextFieldWithFolder";
import { LabelAndUrlField } from "../../molecules/LabelAndUrlField/LabelAndUrlField";
import { ActionsProps, addFolderActionItemList, changeDrive, checkToReturnToPath, createBlankFile, deleteItemAction, downloadAndOpenFileInEditor, downloadFile, goBackToParentFolder, nameFileForEmptyFolder, onSearchFileOrFolder, renameCloudFolder, renameCloudItem, setOpenFolder, synchronizeWithCloud, uploadFiles } from "./ActionCloudList";
import { ModalProgressComponent } from "../../molecules/ModalProgressComponent/ModalProgressComponent";
import { CloudState, createCloudState, isShowingDescriptionState } from "./Models/CloudState";

const cloudDriveName = 'cloud';
const trashDriveName = 'trash';

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

let indexNewCloudItemAdded = 0;

export const Cloud = () => {
  const navigate = useNavigate();
  const [currentPathFolder, setCurrentPathFolder] = React.useState<string>('error');
  const [cloudState, setCloudState] = React.useState<CloudState>(createCloudState());
  const [fileList, setFileList] = React.useState<CloudItem[]>([]);
  const [driveList, setDriveList] = React.useState<string[]>();
  const [indexCurrentDrive, setIndexCurrentDrive] = React.useState<number>(0);
  const [currentDrive, setCurrentDrive] = React.useState<string>('');
  const [breadcrumb, setBreadcrumb] = React.useState<CloudItem[]>([]);
  const [selectedNodes, setSelectedNodes] = React.useState<CloudItem[]>([]);
  const [dragIsOver, setDragIsOver] = React.useState(false);
  const [, setFiles] = React.useState<File[]>([]);
  const [openSnackbar, setOpenSnackbar] = React.useState(false);
  const [isErrorSnackbar, setErrorSnackbar] = React.useState(false);
  const [snackBarMessage, setSnackBarMessage] = React.useState<string>('This is fine.');
  const [isMarkToReturnToPath, setMarkToReturnToPath] = React.useState(false);
  const [pathToReturn, setPathToReturn] = React.useState<CloudItem[]>([]);
  const onCloseSnackBar = (event?: React.SyntheticEvent | Event, reason?: string) => reason === 'clickaway' || setOpenSnackbar(false);

  React.useEffect(() => { CloudActions.getDrivesList().then(({ driveList }) => {
    // For now, I'll choose the cloud drive.
    setDriveList(driveList);
    const indexCloudDrive = driveList.indexOf(cloudDriveName);
    setIndexCurrentDrive(indexCloudDrive);
    const defaultDrive = driveList[indexCloudDrive];
    setCurrentDrive(defaultDrive);
    setCurrentPathFolder(defaultDrive);
    CloudActions.getAllFolderItems({ drive: defaultDrive, path: defaultDrive }).then(data => {
      // console.log(data)
      setFileList(data.data);
    });
  })}, [indexCurrentDrive]);

  const action: ActionsProps = { cloudState, setCloudState, currentPathFolder, setCurrentPathFolder, fileList, setFileList, currentDrive,
    breadcrumb, setBreadcrumb, selectedNodes, setSelectedNodes, setOpenSnackbar, setSnackBarMessage, setErrorSnackbar,
    isMarkToReturnToPath, setMarkToReturnToPath, pathToReturn, setPathToReturn, setIndexCurrentDrive, indexCurrentDrive, driveList };
  
    // TODO: Opción de poder mover listado de ficheros de una carpeta a otra (que es usar enpoints de rename file y rename folder, pero...).
    // TODO: Unidad que se sincroniza con Google Drive por medio de su API.

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

  return <ModalProgressComponent show={isShowingDescriptionState(cloudState)} progressMessage={cloudState.description}><Box sx={formStyle}>
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
        path={currentPathFolder}
        onUploadItem={handleUploadButton}
        // // duplicateItem={() => undefined}
        // // onSelectItem={(id, checked) => isSelectedItemList(action, id, checked)}
        // // onOutSelectionMode={() => setSelectedNodes([])}
        // // onMoveItem={(idList) => moveItemListToFolder(action, idList)}
        onSearch={onSearchFileOrFolder(action)}
        createFile={() => {indexNewCloudItemAdded++; createBlankFile(action, `new file ${indexNewCloudItemAdded}.txt`);}}
        // // addAction={() => { indexNewBookmarkAdded++; addActionItemList(action, { url: `new url ${indexNewBookmarkAdded}`, title: `new title ${indexNewBookmarkAdded}`}) } }
        filterFileInEditor={(id) => id.indexOf('.txt') > -1}
        openFileInEditor={(id) => downloadAndOpenFileInEditor(action, id).then(() => navigate('/text-editor'))}
        addFolder={() => { indexNewCloudItemAdded++; addFolderActionItemList(action, {
          driveName: currentDrive || '/',
          isFolder: true,
          name: `new folder ${indexNewCloudItemAdded}`,
          path: `${currentPathFolder}/new folder ${indexNewCloudItemAdded}`,
        })}}
        filterItemPredicate={(id) => id !== nameFileForEmptyFolder}
        deleteAction={(id) => deleteItemAction(action, id)}
        seeCloudDrive={ changeDrive(action, cloudDriveName) }
        seeTrashDrive={ changeDrive(action, trashDriveName) }
        updateContent={() => synchronizeWithCloud(action)}
        goBackToParent={() => goBackToParentFolder(action)}
        list={
          fileList.sort((item1, item2) => item1.name.localeCompare(item2.name)).map((item, index) => ({id:`${item.name}`, isFolder: item.isFolder, item: <>{
            item.isFolder ?
              <LabelAndTextFieldWithFolder
                backgroundColor={(index % 2 === 0) ? '#D3D3D3' : '#FFFFFF'}
                text={item.name}
                path={item.path}
                nameFolder={item.name}
                onChange={renameCloudFolder(action, `${item.path}`)}
                setOpenFolder={(label) => setOpenFolder(action, label)}
                />
            :
              <LabelAndUrlField
                backgroundColor={(index % 2 === 0) ? '#D3D3D3' : '#FFFFFF'}
                textToShow={item.name}
                hideUrl={true}
                textUrl={`${item.path}`}
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
  </Box>
  </ModalProgressComponent>;
};
