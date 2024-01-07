import { Card, CardContent, SxProps, TextField, Theme } from "@mui/material"
import React from "react";

const listComponentStyle = (widthBoxes: {xs: string; sm: string; md: string; lg: string;}): SxProps<Theme> => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'left',
  justifyContent: 'center',
  color: 'rgb(30, 30, 30)',
  backgroundColor: '#000000',
  width: widthBoxes,
  marginBottom: '.5rem', 
});

interface Props {
  helperText: string;
  widthBoxes: {xs: string; sm: string; md: string; lg: string;};
  onSearch: (textToSearch: string) => Promise<(string | JSX.Element)[]>;
}

export const SearchAndList = ({helperText, widthBoxes, onSearch}: Props) => {
  const [toSearch, setToSearch] = React.useState<string>('');
  const [textSearched, setTextSearcher] = React.useState<(string | JSX.Element)[]>([]);

  const onTyping = (value: string) => {
    setToSearch(value);
    setTextSearcher([]);
  }

  const cleanFields = () => {
    setToSearch('');
    setTextSearcher([]);
  }

  const searchText = (textToSearch: string) => {
    onSearch(textToSearch).then(contentSearched => {
      setTextSearcher(contentSearched);
    });
  }

  return <>
      <TextField
        variant="outlined"
        value={toSearch}
        helperText={helperText}
        sx={{width: widthBoxes}}
        onChange={evt => onTyping(evt.target.value)}
        onKeyDown={(evt) => evt.key === 'Escape' ? cleanFields()
          : (evt.key === 'Enter') ? searchText(toSearch) : undefined }
      />
    {textSearched && (textSearched.length > 0) && <Card sx={listComponentStyle(widthBoxes)}>
      <CardContent>
        {textSearched.map((item, index) => {
          if (typeof(item) === 'string') {
            return <p key={`p_search_${index}`}>{item}</p>;
          } else {
            return item;
          }
        })}
      </CardContent>
    </Card>}
  </>
}