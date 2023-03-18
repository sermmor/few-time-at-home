import { Box } from '@mui/material';

interface Props {
  message: string;
}

// TODO DON'T FORGET USE UNFURL FOR THE FIRST LINK (A NodeJS library?)
export const RssMessage = ({message}: Props) => (<Box>{message}</Box>);
