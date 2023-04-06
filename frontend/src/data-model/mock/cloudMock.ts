import { CloudDataModelFromFetch, CloudDrivesResponse } from "../cloud";

export const cloudDrivesResponseMock = (): CloudDrivesResponse => ({
  driveList: ['drive', 'videos', 'music'],
});

export const cloudDataModelMock = (): CloudDataModelFromFetch => ({
  allItems: [
    {
      name: "Andalucía 2.jpeg",
      path: "cloud/Imagenes/Andalucía 2.jpeg",
      driveName: "cloud"
    },
    {
      name: "Juan y medio.jpg",
      path: "cloud/Imagenes/Juan y medio.jpg",
      driveName: "cloud"
    },
    {
      name: "Documento1.txt",
      path: "cloud/Documentos/Documento1.txt",
      driveName: "cloud"
    },
    {
      name: "Documento2.txt",
      path: "cloud/Documentos/Documento2.txt",
      driveName: "cloud"
    },
  ]
});
