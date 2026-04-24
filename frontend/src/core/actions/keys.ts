import { keysEndpoint } from '../urls-and-end-points';
import { fetchJsonReceive, fetchJsonSendAndReceive } from '../fetch-utils';

export interface KeysData {
  telegram_bot_token:             string;
  username_client:                string;
  token_pass:                     string;
  connect_to_telegram:            boolean;
  email_service:                  string;
  email_user:                     string;
  email_pass:                     string;
  email_prelude:                  string;
  is_backup_disabled:             boolean;
  is_dev_mode_enabled:            boolean;
  youtube_playlist_client_id:     string;
  youtube_playlist_client_secret: string;
  spotify_playlist_client_id:     string;
  spotify_playlist_client_secret: string;
  supabase_url:                   string;
  supabase_service_key:           string;
}

const emptyKeys: KeysData = {
  telegram_bot_token:             '',
  username_client:                '',
  token_pass:                     '',
  connect_to_telegram:            false,
  email_service:                  'Gmail',
  email_user:                     '',
  email_pass:                     '',
  email_prelude:                  '',
  is_backup_disabled:             true,
  is_dev_mode_enabled:            false,
  youtube_playlist_client_id:     '',
  youtube_playlist_client_secret: '',
  spotify_playlist_client_id:     '',
  spotify_playlist_client_secret: '',
  supabase_url:                   '',
  supabase_service_key:           '',
};

const getKeys = (): Promise<KeysData> =>
  fetchJsonReceive<KeysData>(keysEndpoint(), emptyKeys);

const saveKeys = (data: KeysData): Promise<{ success: boolean }> =>
  fetchJsonSendAndReceive<{ success: boolean }>(keysEndpoint(), data, { success: false });

export const KeysActions = { getKeys, saveKeys };
