import { Box, Card, CardContent, Checkbox, SxProps, TextField, Theme, Typography } from "@mui/material";
import React from "react";
import { LabelAndTextField } from "../../molecules/LabelAndTextField/LabelAndTextField";
import { useConfiguredDialogAlphas } from "../../../core/context/DialogAlphasContext";

type BodyData = {[key: string]: number | boolean | string | string[]};
type OnChange = (key: string, newText: number | boolean | string | string[]) => void;

const titleStyle = () => ({
  textTransform: 'uppercase',
  color: "white",
  textShadow: `
    -1px -1px 0 black,
    1px -1px 0 black,
    -1px 1px 0 black,
    1px 1px 0 black,
    -1px 0 0 black,
    1px 0 0 black,
    0 -1px 0 black,
    0 1px 0 black
  `,
});

const getCardComponentStyle = (alpha: number): SxProps<Theme> => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'left',
  justifyContent: 'center',
  color: 'rgb(30, 30, 30)',
  backgroundColor: `rgba(245, 245, 245, ${alpha})`,
  width: {xs: '15.5rem', sm: '27rem', md: '50rem', lg: '70rem'},
  marginBottom: '.5rem',
});

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
}) => {
  const alphas = useConfiguredDialogAlphas();
  return <>
  <Typography variant='h6' sx={titleStyle()}>
    {title}
  </Typography>
  <Card sx={getCardComponentStyle(alphas.general)}>
    <CardContent>
      <Box style={{ marginBottom: '1rem' }}>
        {subtext}
      </Box>
      {Object.entries(body).map(([key, value]) => (
        <Box key={key}>
          {typeof value === 'number' ? undefined : <Box>{key}:</Box>}
          <Box>
            {parseBodyData(key, value, onChange)}
          </Box>
        </Box>
      ))}
    </CardContent>
  </Card>
</>;
};
