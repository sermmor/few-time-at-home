import { Box } from '@mui/material';

interface Props {
    message: string;
}

export const RssMessage = ({message}: Props) => (<Box>{message}</Box>);
