import { Box, Dialog, SxProps, Theme } from "@mui/material";
import CircularProgress from '@mui/material/CircularProgress';

interface Props {
  children: JSX.Element;
  show?: boolean;
  progressMessage?: string;
}

const modalProgressComponentMainStyle = (): SxProps<Theme> => ({
  display: 'flex',
  flexDirection: "column",
  justifyContent: 'center',
  alignItems: 'center',
  minWidth: '10rem',
  margin: '2rem',
  gap: '2rem',
});

export const ModalProgressComponent = ({show, progressMessage, children}: Props): JSX.Element => ( 
  <>
    <Dialog open={!!show}>
      <Box sx={modalProgressComponentMainStyle()}>
        <CircularProgress />
        <Box>{progressMessage}</Box>
      </Box>
    </Dialog>
    {children}
  </>
);
  // <>{
  //   show ? (<Box sx={modalProgressComponentMainStyle(!!show)}>
  //     <CircularProgress />
  //     <Box>{progressMessage}</Box>
  //   </Box>)
  //   : children
  // }</>);
