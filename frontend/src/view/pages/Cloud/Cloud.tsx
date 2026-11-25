import React from "react";
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, SxProps, Theme, useMediaQuery } from "@mui/material";
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { CloudItem, isPlaylistFileName } from "../../../data-model/cloud";
import { CloudActions } from "../../../core/actions/cloud";
import { TitleAndListWithFolders } from "../../organism/TitleAndListWithFolders/TitleAndListWithFolders";
import { LabelAndTextFieldWithFolder } from "../../molecules/LabelAndTextFieldWithFolder/LabelAndTextFieldWithFolder";
import { LabelAndUrlField } from "../../molecules/LabelAndUrlField/LabelAndUrlField";
import { ActionsProps, addFolderActionItemList, changeDrive, createBlankFile, deleteItemAction, downloadAndOpenFileInEditor,
  downloadFile, downloadFileAndGetBlob, goBackToParentFolder, moveItemListToFolder, onSearchFileOrFolder, putInSelectedItemList, renameCloudFolder,
  renameCloudItem, setOpenFolder, synchronizeWithCloud, uploadFiles, zipFolder, extractArchive } from "./ActionCloudList";
import { ModalProgressComponent } from "../../molecules/ModalProgressComponent/ModalProgressComponent";
import { CloudState, createCloudState, isShowingDescriptionState } from "./Models/CloudState";
import { imageFileExtensions, ModalPhotoLibrary } from "../../molecules/ModalPhotoLibrary/ModalPhotoLibrary";
import { ModalNewName } from "../../molecules/ModalNewName/ModalNewName";
import { ModalVideoPlayer, videoFileExtensions } from "../../molecules/ModalVideoPlayer/ModalVideoPlayer";
import { ModalAudioPlayer, audioFileExtensions } from "../../molecules/ModalAudioPlayer/ModalAudioPlayer";
import { cloudFilesName, routesFTAH } from "../../Routes";
import { MusicPlayerBar, PLAYER_BAR_HEIGHT } from "../../molecules/MusicPlayerBar/MusicPlayerBar";
import { ModalMoodPlaylist, MoodPlaylistMode } from "./ModalMoodPlaylist";
import { MoodPlaylistResponse } from "../../../data-model/musicMood";
import { ModalOpenPlaylist, ModalSavePlaylist, OpenPlaylistMode, parentFolder, playlistDisplayName } from "./ModalPlaylistFile";

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

// Ficheros "ocultos" (metadatos de macOS como .DS_Store o ._foto.jpg): empiezan por ".".
const isDotFile = (name: string) => name.startsWith('.');
// Los "._x.zip" de macOS no son zips de verdad: no se ofrecen para descomprimir.
const isAnArchiveFile = (name: string) => !isDotFile(name) && /\.(zip|rar)$/i.test(name);

// Preferencia por navegador de ocultar los ficheros que empiezan por ".".
const HIDE_DOT_FILES_STORAGE_KEY = 'ftah.cloud.hideDotFiles';
const readHideDotFiles = (): boolean => {
  try { return localStorage.getItem(HIDE_DOT_FILES_STORAGE_KEY) === 'true'; } catch { return false; }
};
const writeHideDotFiles = (value: boolean) => {
  try { localStorage.setItem(HIDE_DOT_FILES_STORAGE_KEY, `${value}`); } catch { /* sin almacenamiento: solo en memoria */ }
};

let indexNewCloudItemAdded = 0;

export const Cloud = () => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 600px)');
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const decodedPathname = decodeURIComponent(pathname);
  const cloudRootPath = routesFTAH.find(({name}) => name === cloudFilesName)?.path || '';
  const [, setCurrentCloudPath] = React.useState<string>(`cloud${decodedPathname.split(cloudRootPath)[1]}`);

  const [isOpenPhotoLibraryDialog, setOpenPhotoLibraryDialog] = React.useState(false);
  const [isOpenVideoPlayerDialog, setOpenVideoPlayerDialog] = React.useState(false);
  const [isOpenAudioPlayerDialog, setOpenAudioPlayerDialog] = React.useState(false);
  const [isOpenNameFileDialog, setOpenNameFileDialog] = React.useState(false);
  const [isOpenNameFolderDialog, setOpenNameFolderDialog] = React.useState(false);
  const [nameImageInPhotoLibrary, setNameImageInPhotoLibrary] = React.useState<string | undefined>();
  const [currentVideoName, setCurrentVideoName] = React.useState<string | undefined>();
  const [currentAudioName, setCurrentAudioName] = React.useState<string | undefined>();
  const [currentPathFolder, setCurrentPathFolder] = React.useState<string>('error');
  const [cloudState, setCloudState] = React.useState<CloudState>(createCloudState());
  const [fileList, setFileList] = React.useState<CloudItem[]>([]);
  const [isHidingDotFiles, setHidingDotFiles] = React.useState<boolean>(readHideDotFiles);
  // Lista que se muestra (y que reciben los visores): sin ficheros "." si están ocultos.
  const visibleFileList = React.useMemo(
    () => isHidingDotFiles ? fileList.filter(f => !isDotFile(f.name)) : fileList,
    [fileList, isHidingDotFiles],
  );
  const toggleHideDotFiles = () => setHidingDotFiles(prev => { writeHideDotFiles(!prev); return !prev; });
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

  React.useEffect(() => {
    CloudActions.getDrivesList()
      .then(({ driveList }) => {
        // For now, I'll choose the cloud drive.
        setDriveList(driveList);
        const indexCloudDrive = (indexCurrentDrive === -1) ? driveList.indexOf(cloudDriveName) : indexCurrentDrive;
        setIndexCurrentDrive(indexCloudDrive);
        const defaultDrive = driveList[indexCloudDrive];
        setCurrentDrive(defaultDrive);

        const nextCloudPathUpdated = `${defaultDrive}${decodedPathname.split(cloudRootPath)[1]}`;
        setCurrentCloudPath(nextCloudPathUpdated);
        setCurrentPathFolder(nextCloudPathUpdated);
        CloudActions.getAllFolderItems({ drive: defaultDrive, folderPath: nextCloudPathUpdated })
          .then(data => { setFileList(data.data); })
          .catch(() => {
            setSnackBarMessage(t('common.error.loadCloudFolder'));
            setErrorSnackbar(true);
            setOpenSnackbar(true);
          });
      })
      .catch(() => {
        setSnackBarMessage(t('common.error.loadCloud'));
        setErrorSnackbar(true);
        setOpenSnackbar(true);
      });
  }, [indexCurrentDrive, setCurrentCloudPath, decodedPathname, cloudRootPath]);

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

  // ── Music playlist ────────────────────────────────────────────────────────
  const [playlist, setPlaylist] = React.useState<CloudItem[]>([]);

  // La unidad sale de la ruta ("cloud/…"): la cola puede tener canciones de otra
  // unidad que la que se está viendo (listas, ánimo…).
  const getStreamUrlMemo = React.useCallback(
    (item: CloudItem) => CloudActions.getStreamUrl({ drive: item.path.split('/')[0] || currentDrive, path: item.path }),
    [currentDrive],
  );

  const addToPlaylist = React.useCallback((id: string, isFolder: boolean) => {
    if (isFolder) {
      // Fetch the folder's contents and add all audio files found.
      const folderItem = fileList.find(f => f.name === id && f.isFolder);
      if (!folderItem) return;
      CloudActions.getAllFolderItems({ drive: currentDrive, folderPath: folderItem.path }).then(data => {
        const audioFiles = data.data
          // Sin metadatos (".") ni imágenes (p. ej. carátulas): solo audio.
          .filter(f => !f.isFolder && !isDotFile(f.name) && isAnAudioFile(f.name) && !isAnImageFile(f.name))
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        setPlaylist(prev => {
          const existing = new Set(prev.map(p => p.path));
          const toAdd = audioFiles.filter(f => !existing.has(f.path));
          return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
        });
      });
    } else {
      const item = fileList.find(f => f.name === id && !f.isFolder);
      if (!item) return;
      setPlaylist(prev => prev.some(p => p.path === item.path) ? prev : [...prev, item]);
    }
  }, [currentDrive, fileList]);

  // Lista por ánimo: canciones ya analizadas de la carpeta actual y subcarpetas
  const [isOpenMoodPlaylistDialog, setOpenMoodPlaylistDialog] = React.useState(false);

  /** `label`: nombre de la lista para el aviso ("Energético", "Como «D4rky Vol 2»"…). */
  const onMoodPlaylistResult = (result: MoodPlaylistResponse, mode: MoodPlaylistMode, label: string) => {
    setOpenMoodPlaylistDialog(false);
    const missing = result.totalInFolder - result.analyzedInFolder;
    if (result.songs.length === 0) {
      setSnackBarMessage(result.analyzedInSeed === 0 ? t('cloud.moodPlaylist.noSeedSongs') : t('cloud.moodPlaylist.noSongs'));
      setErrorSnackbar(true);
      setOpenSnackbar(true);
      return;
    }
    const items: CloudItem[] = result.songs.map(song => ({
      name: song.name, path: song.path, isFolder: false, driveName: cloudDriveName,
    }));
    setPlaylist(prev => {
      if (mode === 'replace') return items;
      const existing = new Set(prev.map(p => p.path));
      return [...prev, ...items.filter(i => !existing.has(i.path))];
    });
    const notes = [t('cloud.moodPlaylist.created', { mood: label, count: items.length })];
    if (missing > 0) notes.push(t('cloud.moodPlaylist.partial', { missing, total: result.totalInFolder }));
    const seedTotal = result.totalInSeed ?? 0;
    const seedAnalyzed = result.analyzedInSeed ?? 0;
    if (seedAnalyzed < seedTotal) notes.push(t('cloud.moodPlaylist.partialSeed', { analyzed: seedAnalyzed, total: seedTotal }));
    setSnackBarMessage(notes.join(' '));
    setErrorSnackbar(false);
    setOpenSnackbar(true);
  };

  // Listas de reproducción en ficheros .m3u8 de la Cloud (ver ModalPlaylistFile)
  /** Lista cargada o guardada por última vez: su ruta y sus canciones, para saber si la cola cambió. */
  const [loadedPlaylist, setLoadedPlaylist] = React.useState<{ path: string; songPaths: string[] } | undefined>();
  const [playlistToOpen, setPlaylistToOpen] = React.useState<string | undefined>();
  const [isOpenSavePlaylistDialog, setOpenSavePlaylistDialog] = React.useState(false);

  React.useEffect(() => { if (playlist.length === 0) setLoadedPlaylist(undefined); }, [playlist.length]);

  const isPlaylistModified = loadedPlaylist !== undefined && (
    loadedPlaylist.songPaths.length !== playlist.length || loadedPlaylist.songPaths.some((p, i) => p !== playlist[i].path));

  const showSnackbar = (message: string, isError: boolean) => {
    setSnackBarMessage(message);
    setErrorSnackbar(isError);
    setOpenSnackbar(true);
  };

  const openPlaylistFile = (mode: OpenPlaylistMode) => {
    const path = playlistToOpen;
    setPlaylistToOpen(undefined);
    if (!path) return;
    CloudActions.readPlaylist(path).then(result => {
      if (result.isError || result.songs.length === 0) {
        showSnackbar(result.isError ? t('cloud.playlistFile.readError') : t('cloud.playlistFile.empty', { missing: result.missing.length }), true);
        return;
      }
      const items: CloudItem[] = result.songs.map(song => ({ name: song.name, path: song.path, isFolder: false, driveName: cloudDriveName }));
      if (mode === 'replace') {
        // Sin duplicados (el reproductor identifica cada canción por su ruta)
        const unique = items.filter((item, i) => items.findIndex(other => other.path === item.path) === i);
        setPlaylist(unique);
        // Si se reubicaron canciones, la lista queda "modificada" para animar a guardarla
        setLoadedPlaylist({ path, songPaths: result.relocated > 0 ? [] : unique.map(i => i.path) });
      } else {
        setPlaylist(prev => {
          const existing = new Set(prev.map(p => p.path));
          const toAdd = items.filter((item, i) => !existing.has(item.path) && items.findIndex(o => o.path === item.path) === i);
          return [...prev, ...toAdd];
        });
      }
      const notes = [t('cloud.playlistFile.loaded', { name: playlistDisplayName(path), count: result.songs.length })];
      if (result.relocated > 0) notes.push(t('cloud.playlistFile.relocated', { count: result.relocated }));
      if (result.missing.length > 0) notes.push(t('cloud.playlistFile.missing', { count: result.missing.length }));
      showSnackbar(notes.join(' '), result.missing.length > 0);
    });
  };

  const onPlaylistSaved = (path: string) => {
    setLoadedPlaylist({ path, songPaths: playlist.map(p => p.path) });
    if (parentFolder(path) === currentPathFolder) synchronizeWithCloud(action);
  };

  const saveFolderSuggestion = loadedPlaylist ? parentFolder(loadedPlaylist.path)
    : (currentPathFolder === cloudDriveName || currentPathFolder.startsWith(`${cloudDriveName}/`)) ? currentPathFolder : cloudDriveName;
  // ─────────────────────────────────────────────────────────────────────────

  const getUrlCloudFile = (item: CloudItem) => downloadFileAndGetBlob(action, item);
  const downloadCloudFile = (item: CloudItem) => downloadFile(action, item);
  const getVideoStreamUrl = (item: CloudItem) =>
    CloudActions.getStreamUrl({ drive: currentDrive, path: item.path });

  const isAnImageFile = (name: string) => imageFileExtensions.some(ext => name.toLowerCase().endsWith(ext));
  const isAVideoFile = (name: string) => videoFileExtensions.some(ext => name.toLowerCase().endsWith(ext));
  const isAnAudioFile = (name: string) => audioFileExtensions.some(ext => name.toLowerCase().endsWith(ext));

  return <ModalProgressComponent show={isShowingDescriptionState(cloudState)} progressMessage={cloudState.description}><Box sx={{...formStyle, paddingBottom: playlist.length > 0 ? PLAYER_BAR_HEIGHT : undefined}}>
    {fileList && <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          backgroundColor: dragIsOver ? 'Highlight' : 'rgba(245, 245, 245, 0)',
        }}
      >
      <TitleAndListWithFolders
        title={t('cloud.title')}
        id='cloud_0'
        helpSearchLabel={t('cloud.searchLabel')}
        path={currentPathFolder}
        onUploadItem={handleUploadButton}
        // duplicateItem={() => undefined}
        onSelectItem={(id, checked) => putInSelectedItemList(action, id, checked)}
        onOutSelectionMode={() => setSelectedNodes([])}
        onMoveItem={() => moveItemListToFolder(action)}
        onSearch={onSearchFileOrFolder(action)}
        createFile={() => setOpenNameFileDialog(true)}
        filterFileInEditor={(id) => id.endsWith('.txt') || id.endsWith('.html') || id.endsWith('.md') || isAnImageFile(id) || isAVideoFile(id) || isAnAudioFile(id)}
        openFileInEditor={(id) => {
          if (id.endsWith('.txt') || id.endsWith('.html') || id.endsWith('.md')) {
            downloadAndOpenFileInEditor(action, id).then(() => navigate('/cloud/text-editor'));
          } else if (isAnAudioFile(id)) {
            setCurrentAudioName(id);
            setOpenAudioPlayerDialog(true);
          } else if (isAVideoFile(id)) {
            setCurrentVideoName(id);
            setOpenVideoPlayerDialog(true);
          } else {
            setNameImageInPhotoLibrary(id);
            setOpenPhotoLibraryDialog(true);
          }
        }}
        addFolder={() => setOpenNameFolderDialog(true)}
        // filterItemPredicate={(id) => id !== nameFileForEmptyFolder}
        deleteAction={isMobile ? undefined : (id) => deleteItemAction(action, id)}
        seeCloudDrive={ () => changeDrive(action, cloudDriveName).then(res => navigate('')) }
        seeTrashDrive={ () => changeDrive(action, trashDriveName).then(res => navigate('')) }
        updateContent={() => synchronizeWithCloud(action)}
        goBackToParent={() => goBackToParentFolder(action).then(res => navigate(`${cloudRootPath}${res}`))}
        showPhotoLibrary={() => handleClickOpenPhotoLibraryDialog()}
        onAddToPlaylist={addToPlaylist}
        onToggleHideDotFiles={toggleHideDotFiles}
        isHidingDotFiles={isHidingDotFiles}
        toggleHideDotFilesTitle={isHidingDotFiles ? t('cloud.showDotFiles') : t('cloud.hideDotFiles')}
        onMoodPlaylist={currentDrive === cloudDriveName ? () => setOpenMoodPlaylistDialog(true) : undefined}
        moodPlaylistTitle={t('cloud.moodPlaylist.button')}
        list={
          sortFileList([...visibleFileList]).map((item, index) => ({id:`${item.name}`, isFolder: item.isFolder, item: <>{
            item.isFolder ?
              <LabelAndTextFieldWithFolder
                backgroundColor={(index % 2 === 0) ? '#D3D3D3' : '#FFFFFF'}
                text={item.name}
                path={item.path}
                nameFolder={item.name}
                zipInFolder={isMobile ? undefined : (label) => zipFolder(action, label)}
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
                onExtract={isAnArchiveFile(item.name) ? () => extractArchive(action, item.name) : undefined}
                extractTitle={t('cloud.extractArchive')}
                onPlaylist={currentDrive === cloudDriveName && isPlaylistFileName(item.name) ? () => setPlaylistToOpen(item.path) : undefined}
                playlistTitle={t('cloud.playlistFile.openButton')}
                onChange={(newTextToShow, newTextUrl) => renameCloudItem(action, item, newTextToShow, newTextUrl)}
                />
              }
            </>
          }))

        }
      />
    </div>
    }
    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} open={openSnackbar} autoHideDuration={3000} onClose={onCloseSnackBar} key={'topcenter'} sx={{ zIndex: 9999 }}>
      <Alert onClose={onCloseSnackBar} severity={isErrorSnackbar ? 'error' : 'success'} sx={{ width: '100%' }}>
        {snackBarMessage}
      </Alert>
    </Snackbar>
    <ModalPhotoLibrary
      handleClosePhotoLibraryDialog={handleClosePhotoLibraryDialog}
      isOpenPhotoLibraryDialog={isOpenPhotoLibraryDialog}
      nameFirstPhoto={nameImageInPhotoLibrary}
      fileList={visibleFileList}
      getUrlCloudFile={getUrlCloudFile}
      downloadCloudFile={downloadCloudFile}
    />
    <ModalVideoPlayer
      isOpen={isOpenVideoPlayerDialog}
      onClose={() => setOpenVideoPlayerDialog(false)}
      firstVideoName={currentVideoName}
      fileList={visibleFileList}
      getStreamUrl={getVideoStreamUrl}
      downloadCloudFile={downloadCloudFile}
    />
    <ModalAudioPlayer
      isOpen={isOpenAudioPlayerDialog}
      onClose={() => setOpenAudioPlayerDialog(false)}
      firstAudioName={currentAudioName}
      fileList={visibleFileList}
      getStreamUrl={getVideoStreamUrl}
      downloadCloudFile={downloadCloudFile}
    />
    <ModalNewName
      handleCloseDialog={() => setOpenNameFileDialog(false)}
      isOpenDialog={isOpenNameFileDialog}
      title={t('cloud.newFile')}
      description={t('cloud.newFileDescription')}
      defaultName={`new file ${indexNewCloudItemAdded}.txt`}
      onAcceptNewName={(newName) => {indexNewCloudItemAdded++; createBlankFile(action, newName);}}
    />
    <ModalNewName
      handleCloseDialog={() => setOpenNameFolderDialog(false)}
      isOpenDialog={isOpenNameFolderDialog}
      title={t('cloud.newFolder')}
      description={t('cloud.newFolderDescription')}
      defaultName={`new folder ${indexNewCloudItemAdded}`}
      onAcceptNewName={(newName) => { indexNewCloudItemAdded++; addFolderActionItemList(action, {
        driveName: currentDrive || '/',
        isFolder: true,
        name: newName,
        path: `${currentPathFolder}/${newName}`,
      })}}
    />
    <ModalMoodPlaylist
      isOpen={isOpenMoodPlaylistDialog}
      onClose={() => setOpenMoodPlaylistDialog(false)}
      folderPath={currentPathFolder}
      onResult={onMoodPlaylistResult}
    />
    <MusicPlayerBar
      playlist={playlist}
      getStreamUrl={getStreamUrlMemo}
      onPlaylistChange={setPlaylist}
      playlistName={loadedPlaylist ? playlistDisplayName(loadedPlaylist.path) : undefined}
      isPlaylistModified={isPlaylistModified}
      onSavePlaylist={() => setOpenSavePlaylistDialog(true)}
    />
    <ModalOpenPlaylist
      isOpen={playlistToOpen !== undefined}
      path={playlistToOpen ?? ''}
      hasQueue={playlist.length > 0}
      onClose={() => setPlaylistToOpen(undefined)}
      onLoad={openPlaylistFile}
    />
    <ModalSavePlaylist
      isOpen={isOpenSavePlaylistDialog}
      onClose={() => setOpenSavePlaylistDialog(false)}
      initialFolder={saveFolderSuggestion}
      initialName={loadedPlaylist ? playlistDisplayName(loadedPlaylist.path) : t('cloud.playlistFile.defaultName')}
      loadedPath={loadedPlaylist?.path}
      songPaths={playlist.filter(p => p.path.startsWith(`${cloudDriveName}/`)).map(p => p.path)}
      onSaved={onPlaylistSaved}
    />
  </Box>
  </ModalProgressComponent>;
};
