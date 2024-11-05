import React from "react";
import { Box, Button, Dialog, DialogContent, DialogTitle } from "@mui/material";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { CloudItem } from "../../../data-model/cloud";

interface Props {
  fileList: CloudItem[];
  isOpenPhotoLibraryDialog: boolean;
  handleClosePhotoLibraryDialog: () => void;
  getUrlCloudFile: (item: CloudItem) => Promise<string>;
  downloadCloudFile: (item: CloudItem) => void; 
}

const imageFileExtensions = ['.jpg', '.jpeg', '.gif', '.png'];

export const ModalPhotoLibrary = ({ handleClosePhotoLibraryDialog, getUrlCloudFile, downloadCloudFile, isOpenPhotoLibraryDialog, fileList }: Props): JSX.Element => {
  const [imageListFiles, setImageListFiles] = React.useState<CloudItem[]>([]);
  const [indexImageFile, setIndexImageFile] = React.useState<number>(0);
  const [isShowingIndexImage, setShowingIndexImage] = React.useState<boolean>(false);
  const [currentImage, setCurrentImage] = React.useState<string>('');

  React.useEffect(() => {
    setImageListFiles(fileList.filter(
      file => imageFileExtensions.filter(extension => file.name.toLowerCase().indexOf(extension) > -1).length > 0
    ));
  }, [fileList]);

  if (isOpenPhotoLibraryDialog && !isShowingIndexImage) {
    setIndexImageFile(0);
    getUrlCloudFile(imageListFiles[0]).then(blob => setCurrentImage(blob));
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
      <img alt="content" style={{ height: `${window.innerHeight * .74}px` }} src={currentImage}/>
    </Box>
    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      {imageListFiles[indexImageFile].name}
    </Box>
    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <Button disabled={indexImageFile === 0} onClick={() => setImageByIndex(indexImageFile - 1)}><ArrowBackIcon /></Button>
      <Button onClick={() => downloadCloudFile(imageListFiles[indexImageFile])}><FileDownloadIcon /></Button>
      <Button disabled={indexImageFile === imageListFiles.length - 1} onClick={() => setImageByIndex(indexImageFile + 1)}><ArrowForwardIcon /></Button>
    </Box>
  </DialogContent>

</Dialog>
}