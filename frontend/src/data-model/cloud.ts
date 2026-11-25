import { DownloadFile, UploadFiles } from "./commons";

export const isFileInRootPath = (nameDrive: string, itemPath: string): boolean => {
  // For instance: nameDrive='cloud' item.path='cloud/Andalucia.jpeg' is true
  const splitPath = itemPath.split('/');
  return splitPath.length === 2 && splitPath[0] === nameDrive;
}

// For instance: item.path='cloud/Images/Andalucia.jpeg' => 'cloud/Images'
export const getPathFolderContainer = (itemPath: string): string => {
  const splitPath = itemPath.split('/');
  return splitPath.slice(0, splitPath.length - 1).join('/');
}

// For instance: item.path='cloud/Images/States/Spain/Andalucia.jpeg' => ['cloud', 'cloud/Images', 'cloud/Images/States', 'cloud/Images/States/Spain']
export const getBreadcrumb = (itemPath: string): string[] => {
  const breadcrumb: string[] = [];
  let currentPath = '';

  itemPath.split('/').forEach(folderName => {
    currentPath = ('' === currentPath) ? folderName : `${currentPath}/${folderName}`;
    breadcrumb.push(currentPath);
  });

  return breadcrumb.slice(0, breadcrumb.length - 1);
}

export const getNameFileOfFolder = (path: string): string => {
  const splitPath = path.split('/');
  return splitPath[splitPath.length - 1];
}

export interface CloudDrivesResponse {
  driveList: string[];
}

export interface UpdatedResponse {
  isUpdated: boolean;
}

export interface MessageResponse {
  message: string;
}

export interface CloudItem {
  name: string;
  path: string;
  isFolder: boolean;
  driveName: string;
}

export interface CloudDataModel {
  data: CloudItem[];
}

export interface GenericCloudRequest {
  drive: string;
  path: string;
}

export interface ExtractArchiveCloudRequest {
  relativePathFile: string; // fichero .zip o .rar
}

export interface ExtractArchiveCloudResponse {
  message: string;
  isError: boolean;
}

export interface ZipCloudRequest {
  relativePathToZip: string,
  compression: 0 | 5 | 9;
}

export interface GetFolderCloudRequest {
  drive: string;
  folderPath: string;
}

export interface ChangePathCloudRequest {
  oldPath: string;
  newPath: string;
}

export interface SaveCloudFileRequest {
  filePath: string;
  textContent: string;
}

export interface MoveCloudRequest {
  oldPathList: string[];
  newPathList: string[];
}

export interface UploadFilesToCloudRequest extends UploadFiles {
}

export interface DownloadFileToCloudResquest extends DownloadFile {
}

export interface SearchItemsResquest {
  nameDrive: string;
  folderPath: string;
  searchTokken: string;
}

export interface SearchItemsResponse {
  search: { path: string }[];
}
// ── Listas de reproducción (.m3u8 en la Cloud) ──────────────────────────────
export const PLAYLIST_FILE_EXTENSIONS = ['.m3u8', '.m3u'];
export const isPlaylistFileName = (name: string) => PLAYLIST_FILE_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext));

export interface PlaylistSong {
  /** Ruta relativa a la raíz de la Cloud: "cloud/Música/…/canción.mp3". */
  path: string;
  name: string;
}

export interface ReadPlaylistResponse {
  isError: boolean;
  message: string;
  songs: PlaylistSong[];
  /** Entradas de la lista que no están en la Cloud. */
  missing: string[];
  /** Canciones que ya no estaban en su ruta y se han encontrado en otra carpeta. */
  relocated: number;
}

export interface SavePlaylistRequest {
  /** "cloud/Listas/Mi lista" (sin extensión se guarda como .m3u8). */
  path: string;
  songs: string[];
  overwrite?: boolean;
}

export interface SavePlaylistResponse {
  isError: boolean;
  message: string;
  path?: string;
  /** Canciones guardadas (las que no están en la Cloud se descartan). */
  saved?: number;
  /** Ya existía y no se pidió sobrescribir: no se ha guardado. */
  exists?: boolean;
}
