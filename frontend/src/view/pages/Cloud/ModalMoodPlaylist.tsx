// Popup "Lista por ánimo": elige ánimo y número de canciones y pide al backend una
// lista con lo ya analizado de la carpeta actual (y subcarpetas).
import React from "react";
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel,
  FormLabel, MenuItem, Radio, RadioGroup, TextField, Typography,
} from "@mui/material";
import { useTranslation } from 'react-i18next';
import { MusicMoodActions } from "../../../core/actions/musicMood";
import { MOOD_IDS, MoodId, MoodPlaylistResponse } from "../../../data-model/musicMood";

const MAX_SONGS = 500;
const DEFAULT_SONGS = 20;

export type MoodPlaylistMode = 'replace' | 'add';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Carpeta actual (p. ej. "cloud/Música"). */
  folderPath: string;
  onResult: (result: MoodPlaylistResponse, mode: MoodPlaylistMode, mood: MoodId) => void;
}

export const ModalMoodPlaylist = ({ isOpen, onClose, folderPath, onResult }: Props): JSX.Element => {
  const { t } = useTranslation();
  const [mood, setMood] = React.useState<MoodId>('energetico');
  const [count, setCount] = React.useState<string>(String(DEFAULT_SONGS));
  const [mode, setMode] = React.useState<MoodPlaylistMode>('replace');
  const [isLoading, setIsLoading] = React.useState(false);

  const countNumber = Math.floor(Number(count));
  const isCountValid = Number.isFinite(countNumber) && countNumber >= 1 && countNumber <= MAX_SONGS;

  const create = () => {
    if (!isCountValid) return;
    setIsLoading(true);
    MusicMoodActions.getPlaylist({ folderPath, mood, count: countNumber })
      .then(result => {
        onResult({
          songs: Array.isArray(result?.songs) ? result.songs : [],
          analyzedInFolder: result?.analyzedInFolder ?? 0,
          totalInFolder: result?.totalInFolder ?? 0,
        }, mode, mood);
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <Dialog open={isOpen} onClose={isLoading ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('cloud.moodPlaylist.title')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.5rem !important' }}>
        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
          {t('cloud.moodPlaylist.folder', { folder: folderPath })}
        </Typography>
        <TextField
          select
          label={t('cloud.moodPlaylist.mood')}
          value={mood}
          onChange={evt => setMood(evt.target.value as MoodId)}
        >
          {MOOD_IDS.map(id => <MenuItem key={id} value={id}>{t(`cloud.moodPlaylist.moods.${id}`)}</MenuItem>)}
        </TextField>
        <TextField
          type="number"
          label={t('cloud.moodPlaylist.count')}
          value={count}
          inputProps={{ min: 1, max: MAX_SONGS, step: 1 }}
          error={!isCountValid}
          helperText={isCountValid ? undefined : t('cloud.moodPlaylist.countError', { max: MAX_SONGS })}
          onChange={evt => setCount(evt.target.value)}
        />
        <FormControl>
          <FormLabel>{t('cloud.moodPlaylist.mode')}</FormLabel>
          <RadioGroup value={mode} onChange={evt => setMode(evt.target.value as MoodPlaylistMode)}>
            <FormControlLabel value="replace" control={<Radio />} label={t('cloud.moodPlaylist.replace')} />
            <FormControlLabel value="add" control={<Radio />} label={t('cloud.moodPlaylist.add')} />
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>{t('common.cancel')}</Button>
        <Button variant="contained" onClick={create} disabled={!isCountValid || isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : undefined}>
          {t('cloud.moodPlaylist.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
