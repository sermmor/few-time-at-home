import { CloudDataModel, CloudDrivesResponse, MessageResponse, UpdatedResponse } from "../cloud";

export const cloudDrivesResponseMock = (): CloudDrivesResponse => ({
  driveList: ['drive', 'videos', 'music'],
});

export const cloudDataModelMock = (): CloudDataModel => ({
  data: [
    {
      name: "Andalucía 2.jpeg",
      path: "cloud/Imagenes/Andalucía 2.jpeg",
      isFolder: false,
      driveName: "cloud"
    },
    {
      name: "Juan y medio.jpg",
      path: "cloud/Imagenes/Juan y medio.jpg",
      isFolder: false,
      driveName: "cloud"
    },
    {
      name: "Fotos",
      path: "cloud/Imagenes/Fotos",
      isFolder: true,
      driveName: "cloud"
    },
    {
      name: "Documento2.txt",
      path: "cloud/Imagenes/Documento2.txt",
      isFolder: false,
      driveName: "cloud"
    },
  ]
});

export const updatedResponseMock = (): UpdatedResponse => ({isUpdated: true});

export const messageResponseMock = (): MessageResponse => ({message: 'This is fine'});
