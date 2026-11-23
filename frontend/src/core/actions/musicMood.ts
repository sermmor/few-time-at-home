import {
  MoodPlaylistRequest, MoodPlaylistResponse, moodPlaylistMock, MusicMoodSaveSettingsResponse, MusicMoodSettings,
  musicMoodSettingsMock, MusicMoodStatus, musicMoodStatusMock,
} from "../../data-model/musicMood";
import { fetchJsonReceive, fetchJsonSendAndReceive } from "../fetch-utils";
import { getMusicMoodEndpoint } from "../urls-and-end-points";

const getSettings = (): Promise<MusicMoodSettings> =>
  fetchJsonReceive<MusicMoodSettings>(getMusicMoodEndpoint('settings'), musicMoodSettingsMock());

// Si falla la petición, el mock devuelve ok: false para avisar al usuario
const saveSettings = (settings: MusicMoodSettings): Promise<MusicMoodSaveSettingsResponse> =>
  fetchJsonSendAndReceive<MusicMoodSaveSettingsResponse>(getMusicMoodEndpoint('settings'), settings, { ok: false, settings });

const getStatus = (): Promise<MusicMoodStatus> =>
  fetchJsonReceive<MusicMoodStatus>(getMusicMoodEndpoint('status'), musicMoodStatusMock());

const analyzeNow = (): Promise<{ ok: boolean }> =>
  fetchJsonSendAndReceive<{ ok: boolean }>(getMusicMoodEndpoint('analyzeNow'), {}, { ok: false });

const stop = (): Promise<{ ok: boolean }> =>
  fetchJsonSendAndReceive<{ ok: boolean }>(getMusicMoodEndpoint('stop'), {}, { ok: false });

const getPlaylist = (data: MoodPlaylistRequest): Promise<MoodPlaylistResponse> =>
  fetchJsonSendAndReceive<MoodPlaylistResponse>(getMusicMoodEndpoint('playlist'), data, moodPlaylistMock());

export const MusicMoodActions = { getSettings, saveSettings, getStatus, analyzeNow, stop, getPlaylist };
