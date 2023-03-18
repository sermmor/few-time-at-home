import { Card, CardContent, Link } from '@mui/material';
import Typography from '@mui/material/Typography';

interface Props {
  message: string;
}

// TODO DON'T FORGET USE UNFURL FOR THE FIRST LINK (A NodeJS library?)
export const RssMessage = ({message}: Props) => {
  const [header, ...rest] = message.split('\n');
  const foot = rest[rest.length - 1];
  const msg = rest.slice(0, rest.length - 1).join('\n');

  return <Card sx={{ margin: '1rem 1rem 0rem 1rem', color: 'whitesmoke', backgroundColor: 'rgb(30, 30, 30)', fontFamily: 'Roboto, Helvetica, Arial, sans-serif' }}>
    <CardContent>
      <Typography variant='h5'>
        {header}
      </Typography>
      <Typography variant='body2' dangerouslySetInnerHTML={{__html: msg}} />
      <Link href={foot} target='_blank' rel='noreferrer'>
        {foot}
      </Link>
    </CardContent>
  </Card>
};
