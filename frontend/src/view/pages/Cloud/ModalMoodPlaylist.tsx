// Popup "Lista por ánimo": elige ánimo (o "Como esta lista…" con una carpeta/canción
// patrón) y número de canciones, y pide al backend una lista con lo ya analizado de
// la carpeta actual (y subcarpetas).
import React from "react";
import {
  Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControl,
  FormControlLabel, FormHelperText, FormLabel, MenuItem, Radio, RadioGroup, TextField, Typography,
} from "@mui/material";
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import { useTranslation } from 'react-i18next';
import { MusicMoodActions } from "../../../core/actions/musicMood";
import { MOOD_IDS, MoodPlaylistResponse, PlaylistMood, SIMILAR_MODE } from "../../../data-model/musicMood";
import { CloudSelection, ModalCloudMultiSelect } from "../../molecules/ModalCloudMultiSelect/ModalCloudMultiSelect";
import { audioFileExtensions } from "../../molecules/ModalAudioPlayer/ModalAudioPlayer";

const MAX_SONGS = 500;
const DEFAULT_SONGS = 20;
/** Último patrón usado (comodidad por navegador). */
const SEED_STORAGE_KEY = 'ftah.cloud.moodSeed';

export type MoodPlaylistMode = 'replace' | 'add';

const isAudioFile = (name: string) => audioFileExtensions.some(ext => name.toLowerCase().endsWith(ext));
const baseName = (path: string) => path.split('/').filter(Boolean).pop() ?? path;
const stripExtension = (name: string) => name.replace(/\.[^.]+$/, '');

const loadSeed = (): CloudSelection[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SEED_STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed)
      ? parsed.filter(s => s && typeof s.path === 'string' && typeof s.isFolder === 'boolean')
      : [];
  } catch {
    return [];
  }
};

const saveSeed = (seed: CloudSelection[]) => {
  try { localStorage.setItem(SEED_STORAGE_KEY, JSON.stringify(seed)); } catch { /* sin almacenamiento: no pasa nada */ }
};

/** Nombre corto del patrón: "D4rky Vol 2" o "D4rky Vol 2 + 2". */
const seedName = (seed: CloudSelection[]) => {
  if (seed.length === 0) return '';
  const first = seed[0].isFolder ? baseName(seed[0].path) : stripExtension(baseName(seed[0].path));
  return seed.length === 1 ? first : `${first} + ${seed.length - 1}`;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Carpeta actual (p. ej. "cloud/Música"). */
  folderPath: string;
  /** `label`: nombre de la lista para mostrar ("Energético", "Como «D4rky Vol 2»"…). */
  onResult: (result: MoodPlaylistResponse, mode: MoodPlaylistMode, label: string) => void;
}

export const ModalMoodPlaylist = ({ isOpen, onClose, folderPath, onResult }: Props): JSX.Element => {
  const { t } = useTranslation();
  const [mood, setMood] = React.useState<PlaylistMood>('energetico');
  const [count, setCount] = React.useState<string>(String(DEFAULT_SONGS));
  const [mode, setMode] = React.useState<MoodPlaylistMode>('replace');
  const [seed, setSeed] = React.useState<CloudSelection[]>(loadSeed);
  const [includeSeedSongs, setIncludeSeedSongs] = React.useState(false);
  const [isSeedPickerOpen, setIsSeedPickerOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const isSimilar = mood === SIMILAR_MODE;
  const countNumber = Math.floor(Number(count));
  const isCountValid = Number.isFinite(countNumber) && countNumber >= 1 && countNumber <= MAX_SONGS;
  const isSeedValid = !isSimilar || seed.length > 0;

  const acceptSeed = (selection: CloudSelection[]) => {
    setSeed(selection);
    saveSeed(selection);
    setIsSeedPickerOpen(false);
  };

  const create = () => {
    if (!isCountValid || !isSeedValid) return;
    setIsLoading(true);
    const label = isSimilar
      ? t('cloud.moodPlaylist.similarName', { name: seedName(seed) })
      : t(`cloud.moodPlaylist.moods.${mood}`);
    MusicMoodActions.getPlaylist({
      folderPath, mood, count: countNumber,
      ...(isSimilar ? { seedPaths: seed.map(s => s.path), includeSeedSongs } : {}),
    })
      .then(result => {
        onResult({
          songs: Array.isArray(result?.songs) ? result.songs : [],
          analyzedInFolder: result?.analyzedInFolder ?? 0,
          totalInFolder: result?.totalInFolder ?? 0,
          ...(typeof result?.analyzedInSeed === 'number' ? { analyzedInSeed: result.analyzedInSeed } : {}),
          ...(typeof result?.totalInSeed === 'number' ? { totalInSeed: result.totalInSeed } : {}),
        }, mode, label);
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
          onChange={evt => setMood(evt.target.value as PlaylistMood)}
        >
          {[...MOOD_IDS, SIMILAR_MODE].map(id => (
            <MenuItem key={id} value={id}>{t(`cloud.moodPlaylist.moods.${id}`)}</MenuItem>
          ))}
        </TextField>

        {isSimilar && (
          <FormControl error={!isSeedValid}>
            <FormLabel>{t('cloud.moodPlaylist.seed')}</FormLabel>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
              {seed.map(s => (
                <Chip
                  key={s.path}
                  label={s.path}
                  size="small"
                  sx={{ maxWidth: '100%' }}
                  onDelete={() => acceptSeed(seed.filter(x => x.path !== s.path))}
                />
              ))}
            </Box>
            <Button
              variant="outlined"
              startIcon={<LibraryMusicIcon />}
              sx={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
              onClick={() => setIsSeedPickerOpen(true)}
            >
              {t('cloud.moodPlaylist.pickSeed')}
            </Button>
            <FormHelperText>
              {isSeedValid ? t('cloud.moodPlaylist.seedHelp') : t('cloud.moodPlaylist.seedRequired')}
            </FormHelperText>
            <FormControlLabel
              control={<Checkbox checked={includeSeedSongs} onChange={evt => setIncludeSeedSongs(evt.target.checked)} />}
              label={t('cloud.moodPlaylist.includeSeed')}
            />
          </FormControl>
        )}

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
        <Button variant="contained" onClick={create} disabled={!isCountValid || !isSeedValid || isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : undefined}>
          {t('cloud.moodPlaylist.create')}
        </Button>
      </DialogActions>

      <ModalCloudMultiSelect
        isOpen={isSeedPickerOpen}
        onClose={() => setIsSeedPickerOpen(false)}
        onAccept={acceptSeed}
        initialSelection={seed}
        title={t('cloud.moodPlaylist.pickSeedTitle')}
        fileFilter={isAudioFile}
      />
    </Dialog>
  );
};
