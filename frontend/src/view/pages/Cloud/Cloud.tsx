import React from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, SxProps, Theme } from "@mui/material";
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { CloudItem } from "../../../data-model/cloud";
import { CloudActions } from "../../../core/actions/cloud";
import { TitleAndListWithFolders } from "../../organism/TitleAndListWithFolders/TitleAndListWithFolders";
import { LabelAndTextFieldWithFolder } from "../../molecules/LabelAndTextFieldWithFolder/LabelAndTextFieldWithFolder";
import { LabelAndUrlField } from "../../molecules/LabelAndUrlField/LabelAndUrlField";
import { ActionsProps, addFolderActionItemList, changeDrive, createBlankFile, deleteItemAction, downloadAndOpenFileInEditor,
  downloadFile, downloadFileAndGetBlob, goBackToParentFolder, moveItemListToFolder, onSearchFileOrFolder, putInSelectedItemList, renameCloudFolder, 
  renameCloudItem, setOpenFolder, synchronizeWithCloud, uploadFiles, zipFolder } from "./ActionCloudList";
import { ModalProgressComponent } from "../../molecules/ModalProgressComponent/ModalProgressComponent";
import { CloudState, createCloudState, isShowingDescriptionState } from "./Models/CloudState";
import { imageFileExtensions, ModalPhotoLibrary } from "../../molecules/ModalPhotoLibrary/ModalPhotoLibrary";
import { ModalNewName } from "../../molecules/ModalNewName/ModalNewName";
import { cloudFilesName, routesFTAH } from "../../Routes";

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

const compareByName = (item1: CloudItem, item2: CloudItem) => item1.name.localeCompare(item2.name);
const compareByType = (item1: CloudItem, item2: CloudItem) => {
  if (item1.isFolder === item2.isFolder) {
    return 0;
  } else if (item1.isFolder) {
    return -1;
  }
  return 1;
};
const sortFileList = (fileList: CloudItem[]) => fileList.sort(compareByName).sort(compareByType);

let indexNewCloudItemAdded = 0;

export const Cloud = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const decodedPathname = decodeURIComponent(pathname);
  const cloudRootPath = routesFTAH.find(({name}) => name === cloudFilesName)?.path || '';
  const [, setCurrentCloudPath] = React.useState<string>(`cloud${decodedPathname.split(cloudRootPath)[1]}`);

  const [isOpenPhotoLibraryDialog, setOpenPhotoLibraryDialog] = React.useState(false);
  const [isOpenNameFileDialog, setOpenNameFileDialog] = React.useState(false);
  const [isOpenNameFolderDialog, setOpenNameFolderDialog] = React.useState(false);
  const [nameImageInPhotoLibrary, setNameImageInPhotoLibrary] = React.useState<string | undefined>();
  const [currentPathFolder, setCurrentPathFolder] = React.useState<string>('error');
  const [cloudState, setCloudState] = React.useState<CloudState>(createCloudState());
  const [fileList, setFileList] = React.useState<CloudItem[]>([]);
  const [driveList, setDriveList] = React.useState<string[]>();
  const [indexCurrentDrive, setIndexCurrentDrive] = React.useState<number>(-1);
  const [currentDrive, setCurrentDrive] = React.useState<string>('');
  const [selectedNodes, setSelectedNodes] = React.useState<string[]>([]);
  const [dragIsOver, setDragIsOver] = React.useState(false);
  const [openSnackbar, setOpenSnackbar] = React.useState(false);
  const [isErrorSnackbar, setErrorSnackbar] = React.useState(false);
  const [snackBarMessage, setSnackBarMessage] = React.useState<string>('This is fine.');
  const [isMarkToReturnToPath, setMarkToReturnToPath] = React.useState(false);
  const [pathToReturn, setPathToReturn] = React.useState<CloudItem[]>([]);
  const onCloseSnackBar = (event?: React.SyntheticEvent | Event, reason?: string) => reason === 'clickaway' || setOpenSnackbar(false);

  React.useEffect(() => { CloudActions.getDrivesList().then(({ driveList }) => {
    // For now, I'll choose the cloud drive.
    setDriveList(driveList);
    const indexCloudDrive = (indexCurrentDrive === -1) ? driveList.indexOf(cloudDriveName) : indexCurrentDrive;
    setIndexCurrentDrive(indexCloudDrive);
    const defaultDrive = driveList[indexCloudDrive];
    setCurrentDrive(defaultDrive);
    
    const nextCloudPathUpdated = `${defaultDrive}${decodedPathname.split(cloudRootPath)[1]}`;
    setCurrentCloudPath(nextCloudPathUpdated)
    setCurrentPathFolder(nextCloudPathUpdated);
    CloudActions.getAllFolderItems({ drive: defaultDrive, folderPath: nextCloudPathUpdated }).then(data => {
      setFileList(data.data);
    });
  })}, [indexCurrentDrive, setCurrentCloudPath, decodedPathname, cloudRootPath]);

  const action: ActionsProps = { cloudState, setCloudState, currentPathFolder, setCurrentPathFolder, fileList, setFileList, currentDrive, selectedNodes,
    setSelectedNodes, setOpenSnackbar, setSnackBarMessage, setErrorSnackbar, isMarkToReturnToPath, setMarkToReturnToPath, pathToReturn, setPathToReturn,
    setIndexCurrentDrive, indexCurrentDrive, driveList };
  
    // TODO: Unidad que se sincroniza con Google Drive por medio de su API.

  const handleClickOpenPhotoLibraryDialog = () => {
    setNameImageInPhotoLibrary(undefined);
    setOpenPhotoLibraryDialog(true);
  };
  
  const handleClosePhotoLibraryDialog = () => {
    setNameImageInPhotoLibrary(undefined);
    setOpenPhotoLibraryDialog(false);
  };

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
    uploadFiles(action, event);
  };

  const handleUploadButton = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    if (event.target.files && event.target.files.length > 0) {
      uploadFiles(action, undefined, event.target.files[0]);
    }
  };

  const getUrlCloudFile = (item: CloudItem) => downloadFileAndGetBlob(action, item);
  const downloadCloudFile = (item: CloudItem) => downloadFile(action, item);

  const isAnImageFile = (name: string) => imageFileExtensions.filter(extension => name.toLowerCase().indexOf(extension) > -1).length > 0;

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
        helpSearchLabel='Search cloud'
        path={currentPathFolder}
        onUploadItem={handleUploadButton}
        // duplicateItem={() => undefined}
        onSelectItem={(id, checked) => putInSelectedItemList(action, id, checked)}
        onOutSelectionMode={() => setSelectedNodes([])}
        onMoveItem={() => moveItemListToFolder(action)}
        onSearch={onSearchFileOrFolder(action)}
        createFile={() => setOpenNameFileDialog(true)}
        filterFileInEditor={(id) => id.indexOf('.txt') > -1 || isAnImageFile(id)}
        openFileInEditor={(id) => {
          if (id.indexOf('.txt') > -1) {
            downloadAndOpenFileInEditor(action, id).then(() => navigate('/cloud/text-editor'));
          } else {
            setNameImageInPhotoLibrary(id);
            setOpenPhotoLibraryDialog(true);
          }
        }} 
        addFolder={() => setOpenNameFolderDialog(true)}
        // filterItemPredicate={(id) => id !== nameFileForEmptyFolder}
        deleteAction={(id) => deleteItemAction(action, id)}
        seeCloudDrive={ () => changeDrive(action, cloudDriveName).then(res => navigate('')) }
        seeTrashDrive={ () => changeDrive(action, trashDriveName).then(res => navigate('')) }
        updateContent={() => synchronizeWithCloud(action)}
        goBackToParent={() => goBackToParentFolder(action).then(res => navigate(`${cloudRootPath}${res}`))}
        showPhotoLibrary={() => handleClickOpenPhotoLibraryDialog()}
        list={
          sortFileList(fileList).map((item, index) => ({id:`${item.name}`, isFolder: item.isFolder, item: <>{
            item.isFolder ?
              <LabelAndTextFieldWithFolder
                backgroundColor={(index % 2 === 0) ? '#D3D3D3' : '#FFFFFF'}
                text={item.name}
                path={item.path}
                nameFolder={item.name}
                zipInFolder={(label) => zipFolder(action, label)}
                onChange={renameCloudFolder(action, `${item.path}`)}
                setOpenFolder={(label) => setOpenFolder(action, label).then(res => navigate(`${cloudRootPath}${res}`))}
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
    <ModalPhotoLibrary
      handleClosePhotoLibraryDialog={handleClosePhotoLibraryDialog}
      isOpenPhotoLibraryDialog={isOpenPhotoLibraryDialog}
      nameFirstPhoto={nameImageInPhotoLibrary}
      fileList={fileList}
      getUrlCloudFile={getUrlCloudFile}
      downloadCloudFile={downloadCloudFile}
    />
    <ModalNewName
      handleCloseDialog={() => setOpenNameFileDialog(false)}
      isOpenDialog={isOpenNameFileDialog}
      title='New File'
      description='Write new file name'
      defaultName={`new file ${indexNewCloudItemAdded}.txt`}
      onAcceptNewName={(newName) => {indexNewCloudItemAdded++; createBlankFile(action, newName);}}
    />
    <ModalNewName
      handleCloseDialog={() => setOpenNameFolderDialog(false)}
      isOpenDialog={isOpenNameFolderDialog}
      title='New Folder'
      description='Write new folder name'
      defaultName={`new folder ${indexNewCloudItemAdded}`}
      onAcceptNewName={(newName) => { indexNewCloudItemAdded++; addFolderActionItemList(action, {
        driveName: currentDrive || '/',
        isFolder: true,
        name: newName,
        path: `${currentPathFolder}/${newName}`,
      })}}
    />
  </Box>
  </ModalProgressComponent>;
};
