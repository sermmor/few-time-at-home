import React from "react";
import { Box, Button, Dialog, DialogContent } from "@mui/material";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { CloudItem } from "../../../data-model/cloud";

interface Props {
  fileList: CloudItem[];
  isOpenPhotoLibraryDialog: boolean;
  nameFirstPhoto: string | undefined;
  handleClosePhotoLibraryDialog: () => void;
  getUrlCloudFile: (item: CloudItem) => Promise<string>;
  downloadCloudFile: (item: CloudItem) => void; 
}

export const imageFileExtensions = ['.jpg', '.jpeg', '.gif', '.png'];

export const ModalPhotoLibrary = ({ handleClosePhotoLibraryDialog, getUrlCloudFile, downloadCloudFile, nameFirstPhoto, isOpenPhotoLibraryDialog, fileList }: Props): JSX.Element => {
  const [imageListFiles, setImageListFiles] = React.useState<CloudItem[]>([]);
  const [indexImageFile, setIndexImageFile] = React.useState<number>(0);
  const [isShowingIndexImage, setShowingIndexImage] = React.useState<boolean>(false);
  const [currentImage, setCurrentImage] = React.useState<string>('');
  const [currentImageStyle, setCurrentImageStyle] = React.useState<React.CSSProperties | undefined>();

  React.useEffect(() => {
    setImageListFiles(fileList.filter(
      file => imageFileExtensions.filter(extension => file.name.toLowerCase().indexOf(extension) > -1).length > 0
    ));
  }, [fileList]);

  if (isOpenPhotoLibraryDialog && !isShowingIndexImage) {
    const indexPhoto = nameFirstPhoto ? imageListFiles.findIndex(item => item.name === nameFirstPhoto) : 0;
    setIndexImageFile(indexPhoto);
    getUrlCloudFile(imageListFiles[indexPhoto]).then(blob => setCurrentImage(blob));
    setShowingIndexImage(true);
  } else if (!isOpenPhotoLibraryDialog && isShowingIndexImage) {
    setShowingIndexImage(false);
  }

  const setImageByIndex = (index: number) => {
    if (-1 < index && index < imageListFiles.length) {
      getUrlCloudFile(imageListFiles[index]).then(blob => setCurrentImage(blob));
      setIndexImageFile(index);
    }
  };

  const rechargeImageStyle = (width: number, height: number) => {
    if (height >= width) {
      setCurrentImageStyle({ height: `${window.innerHeight * .74}px` });
    } else {
      const newWidth = window.innerWidth * .74;
      // Calculamos alto por regla de 3.
      const newHeight = newWidth * height / width;
      if (newHeight < window.innerHeight * .74) {
        setCurrentImageStyle({ width: `${window.innerWidth * .74}px` });
      } else {
        // Como al pasar al ancho, la imagen es demasiado alta, elegimos reestructurar por el alto.
        setCurrentImageStyle({ height: `${window.innerHeight * .74}px` });
      }
    }
  };

  React.useEffect(() => {
    const img = new Image();
    img.src = currentImage;
    img.onload = () => {
      rechargeImageStyle(img.width, img.height);
    };
  }, [currentImage]);

  return <Dialog
  onClose={handleClosePhotoLibraryDialog}
  aria-labelledby="customized-dialog-title"
  open={isOpenPhotoLibraryDialog}
  fullWidth
  maxWidth={'lg'}
  onKeyUp={(key) => {
    if (key.code === 'ArrowLeft') {
      // Key left.
      setImageByIndex(indexImageFile - 1);
    } else if (key.code === 'ArrowRight') {
      // Key right.
      setImageByIndex(indexImageFile + 1);
    }
  }}
>
  <DialogContent dividers>
    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <img alt="content" style={currentImageStyle} src={currentImage}/>
    </Box>
    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      {imageListFiles && imageListFiles[indexImageFile] ? imageListFiles[indexImageFile].name : ''}
    </Box>
    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <Button disabled={indexImageFile === 0} onClick={() => setImageByIndex(indexImageFile - 1)}><ArrowBackIcon /></Button>
      <Button onClick={() => downloadCloudFile(imageListFiles[indexImageFile])}><FileDownloadIcon /></Button>
      <Button disabled={indexImageFile === imageListFiles.length - 1} onClick={() => setImageByIndex(indexImageFile + 1)}><ArrowForwardIcon /></Button>
    </Box>
  </DialogContent>

</Dialog>
}