import { Box, Button, Link, SxProps, TextField, Theme } from "@mui/material";
import React from "react";
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import { UnfurlActions } from "../../../core/actions/unfurl";

export const LabelAndUrlField = ({textToShow, textUrl, hideUrl, backgroundColor, onChange, isReadOnly, onClickUrl, onExtract, extractTitle}: {
  textToShow: string,
  textUrl: string,
  backgroundColor?: string,
  onChange?: (newTextToShow: string, newtextUrl: string) => void,
  isReadOnly?: boolean,
  hideUrl?: boolean,
  onClickUrl?: () => void,
  /** Si se indica, muestra un botón para descomprimir el fichero (.zip/.rar). */
  onExtract?: () => void,
  extractTitle?: string,
}) => {
  const colorRow: SxProps<Theme> = backgroundColor ? { backgroundColor } : {};
  const [isInEditMode, setEditMode] = React.useState<boolean>(false);
  const [isTextToShowChanged, setIsTextToShowChanged] = React.useState<boolean>(false);
  const [isUrlChanged, setIsUrlChanged] = React.useState<boolean>(false);
  const [textToShowEditing, setTextToShowEditing] = React.useState<string>(textToShow);
  const [textUrlEditing, setTextUrlEditing] = React.useState<string>(textUrl);

  const setText = (newTextToShow: string, newUrl: string) => {
    if (!isTextToShowChanged && isUrlChanged) {
      UnfurlActions.getUnfurl({urlList: [newUrl], loadTime: 1000}).then(allData => {
        const data = allData && allData.length ? allData[0] : {title: ""};
        setTextToShowEditing(data.title);
        setEditMode(false);
        onChange!(data.title, newUrl);
      });
    } else {
      setEditMode(false);
      onChange!(newTextToShow, newUrl);
    }
  }

  return <> {
    isInEditMode ?
      <Box sx={{...colorRow, width:'100%', display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '0.25rem', alignItems: 'center'}}>
        {!hideUrl && <TextField
          variant="standard"
          value={textUrlEditing}
          sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}, width:'100%'}}
          onChange={evt => { setTextUrlEditing(evt.target.value); setIsUrlChanged(true); }}
          onKeyDown={(evt) => evt.key === 'Escape' ? setText(textToShowEditing, textUrlEditing)
            : (evt.key === 'Enter') ? setText(textToShowEditing, textUrlEditing) : undefined }
          autoFocus={isInEditMode}
        />}
        <TextField
          variant="standard"
          value={textToShowEditing}
          sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}, width:'100%'}}
          onChange={evt => { setTextToShowEditing(evt.target.value); setIsTextToShowChanged(true); }}
          onKeyDown={(evt) => evt.key === 'Escape' ? setText(textToShowEditing, textUrlEditing)
          : (evt.key === 'Enter') ? setText(textToShowEditing, textUrlEditing) : undefined }
        />
        <Button onClick={() => setText(textToShowEditing, textUrlEditing)}>Ok</Button>
      </Box>
    :
    <Box sx={{...colorRow, width:'100%', display: 'flex', flexDirection: {xs: 'column', sm:'row'}, alignItems: 'center'}}>
      <Box sx={isReadOnly ? undefined : {cursor: 'pointer', color: '#1976d2'}} onClick={() => isReadOnly ? undefined : setEditMode(true)}>
        {textToShowEditing ? textToShowEditing : '<No title>'}
      </Box>
      {
        onExtract &&
          <Link title={extractTitle} sx={{ marginLeft: {xs: 'none', sm:'auto'}, cursor: 'pointer'}} onClick={onExtract}>
            <UnarchiveIcon />
          </Link>
      }
      {
        onClickUrl ? 
          <Link target='_blank' rel='noreferrer' sx={{ marginLeft: onExtract ? undefined : {xs: 'none', sm:'auto'}, cursor: 'pointer'}} onClick={onClickUrl}>
            <OpenInNewIcon />
          </Link>
        :
          <Link href={textUrlEditing} target='_blank' rel='noreferrer' sx={{ marginLeft: onExtract ? undefined : {xs: 'none', sm:'auto'}}}>
            <OpenInNewIcon />
          </Link>
      }
    </Box>
  }</>;
}