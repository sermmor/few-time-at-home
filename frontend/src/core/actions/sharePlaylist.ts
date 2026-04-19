import { playlistCreateEndpoint } from '../urls-and-end-points';

export type PlaylistPlatform = 'youtube' | 'spotify';

export interface CreatePlaylistRequest {
  platform:    PlaylistPlatform;
  name:        string;
  description: string;
  songs:       string[];  // raw filenames; extension is stripped on the backend
  token:       string;
}

export interface CreatePlaylistResponse {
  url:        string;
  totalAdded: number;
  notFound:   string[];
}

export const sharePlaylistActions = {
  /**
   * Creates a playlist on the given platform.
   * Throws an Error (with the server's message) on any non-2xx response,
   * so callers can catch it and display the error properly.
   */
  createPlaylist: async (data: CreatePlaylistRequest): Promise<CreatePlaylistResponse> => {
    const res = await fetch(playlistCreateEndpoint(), {
      method:  'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.message ?? `Error del servidor (${res.status})`);
    }
    return json as CreatePlaylistResponse;
  },
};
