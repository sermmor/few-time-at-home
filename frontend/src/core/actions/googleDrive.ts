import { getGoogleDriveEndpoint } from '../urls-and-end-points';

export interface DriveItem {
  id:            string;
  name:          string;
  isFolder:      boolean;
  mimeType:      string;
  size?:         number;
  modifiedTime?: string;
}

const listFolder = async (folderId?: string): Promise<{ items: DriveItem[] }> => {
  const url = new URL(getGoogleDriveEndpoint('list'));
  if (folderId) url.searchParams.set('folderId', folderId);
  const res = await fetch(url.toString());
  if (!res.ok) return { items: [] };
  return res.json();
};

const uploadFile = async (file: File, folderId?: string): Promise<{ success: boolean; item?: { id: string; name: string } }> => {
  const formData = new FormData();
  formData.append('file', file);
  if (folderId) formData.append('folderId', folderId);
  const res = await fetch(getGoogleDriveEndpoint('upload'), { method: 'POST', body: formData });
  if (!res.ok) return { success: false };
  return res.json();
};

const createFolder = async (name: string, parentFolderId?: string): Promise<{ success: boolean; item?: { id: string; name: string } }> => {
  const res = await fetch(getGoogleDriveEndpoint('createFolder'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parentFolderId }),
  });
  if (!res.ok) return { success: false };
  return res.json();
};

const deleteItem = async (fileId: string): Promise<{ success: boolean }> => {
  const res = await fetch(`${getGoogleDriveEndpoint('deleteItem')}/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) return { success: false };
  return res.json();
};

/** Triggers a native browser download for the given Drive file. */
const downloadFile = (fileId: string): void => {
  window.location.href = `${getGoogleDriveEndpoint('download')}/${encodeURIComponent(fileId)}`;
};

export const GoogleDriveActions = {
  listFolder,
  uploadFile,
  createFolder,
  deleteItem,
  downloadFile,
};
