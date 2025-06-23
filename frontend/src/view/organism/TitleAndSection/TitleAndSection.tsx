import { Card, CardContent, Checkbox, SxProps, TextField, Theme, Typography } from "@mui/material";
import { LabelAndTextField } from "../../molecules/LabelAndTextField/LabelAndTextField";

type BodyData = {[key: string]: number | boolean | string | string[]};
type OnChange = (key: string, newText: number | boolean | string | string[]) => void;

const cardComponentStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'left',
  justifyContent: 'center',
  color: 'rgb(30, 30, 30)',
  backgroundColor: 'whitesmoke',
  width: {xs: '15.5rem', sm: '27rem', md: '50rem', lg: '70rem'},
  marginBottom: '.5rem', 
};

export const parseBodyData = (
  key: string,
  body: number | boolean | string | string[],
  onChange: OnChange,
) => {
  if (typeof body === 'number') {
    return <TextField
      label={key}
      variant="outlined"
      value={body}
      type='number'
      sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}, marginBottom: '1.5rem'}}
      onChange={evt => onChange(key, +evt.target.value)}
    />;
  } else if (typeof body === 'boolean') {
    // return <span>{body ? 'Yes' : 'No'}</span>;
    return <Checkbox
      checked={body}
      onChange={evt => onChange(key, evt.target.checked)}
    />;
  } else if (typeof body === 'string') {
    return <LabelAndTextField
      text={body}
      onChange={(newText: string) => onChange(key, newText)}
    />;
  } else if (Array.isArray(body)) {
    return <ul>
      {body.map((item, index) => (
        <li key={index}>
          <LabelAndTextField
            text={item}
            onChange={(newText: string) => {
              const newArray = [...body];
              newArray[index] = newText;
              onChange(key, newArray);
            }}
          />
        </li>
      ))}
    </ul>;
  }
  return <></>;
}

export const TitleAndSection = ({title, subtext, body, onChange}: {
  title: string;
  subtext?: JSX.Element;
  body: BodyData;
  onChange: OnChange;
}) => <>
  <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
    {title}
  </Typography>
  {subtext}
  <Card sx={cardComponentStyle}>
    <CardContent>
      {Object.entries(body).map(([key, value]) => (
        <div key={key}>
          {typeof value === 'number' ? undefined : <div>{key}:</div>}
          <div>
            {parseBodyData(key, value, onChange)}
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
</>;
