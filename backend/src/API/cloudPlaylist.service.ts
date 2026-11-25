// Listas de reproducción de la Cloud guardadas como ficheros M3U (.m3u8, UTF-8),
// compatibles con VLC. Las canciones se guardan con su ruta RELATIVA a la carpeta
// de la lista ("../Música/Artista/01 - Canción.mp3"), nunca con la IP ni con una
// URL del backend: así la lista sigue funcionando aunque cambie la IP de la
// Raspberry, al abrirla desde un disco montado o por HTTP (GET /cloud/raw/...),
// porque VLC resuelve las rutas relativas contra la ruta o URL de la propia lista.
import { stat, readFile, writeFile, rename, mkdir } from 'fs/promises';
import pathModule from 'path';
import { listAudioFiles } from '../musicMood/moodIndex';

const posix = pathModule.posix;

/** Drive de la Cloud donde viven las listas y sus canciones. */
export const PLAYLIST_DRIVE = 'cloud';
export const PLAYLIST_EXTENSIONS = ['.m3u8', '.m3u'];
export const isPlaylistFile = (name: string) => PLAYLIST_EXTENSIONS.includes(posix.extname(name).toLowerCase());

/** Prefijo de la ruta GET que sirve la Cloud por ruta (para VLC por HTTP). */
export const RAW_ROUTE_PREFIX = '/cloud/raw/';

/** Máximo de canciones por lista (evita peticiones/ficheros desmesurados). */
const MAX_SONGS = 5000;

export interface PlaylistSong {
  /** Ruta relativa a la raíz de la Cloud: "cloud/Música/…/canción.mp3". */
  path: string;
  name: string;
}

export interface ReadPlaylistResult {
  isError: boolean;
  message: string;
  songs: PlaylistSong[];
  /** Entradas que no se han encontrado en la Cloud (tal cual estaban en el fichero). */
  missing: string[];
  /** Canciones que ya no estaban en su ruta y se han encontrado en otra carpeta. */
  relocated: number;
}

export interface SavePlaylistResult {
  isError: boolean;
  message: string;
  /** Ruta final (con extensión) de la lista guardada. */
  path?: string;
  /** Canciones guardadas (las que no existen en la Cloud se descartan). */
  saved?: number;
  /** El fichero ya existía y no se pidió sobrescribir: no se ha guardado. */
  exists?: boolean;
}

/** Ruta "cloud/…" normalizada, o undefined si sale de la Cloud ("..", otra unidad…). */
export const toCloudPath = (relativePath: string): string | undefined => {
  const normalized = posix.normalize(relativePath.replace(/\\/g, '/')).replace(/^\.\/+/, '').replace(/\/+$/, '');
  if (normalized !== PLAYLIST_DRIVE && !normalized.startsWith(`${PLAYLIST_DRIVE}/`)) return undefined;
  if (normalized.split('/').some(part => part === '..')) return undefined;
  return normalized;
};

const safeDecode = (text: string): string | undefined => {
  try {
    return decodeURIComponent(text);
  } catch {
    return undefined;
  }
};

/** Entradas (rutas o URLs) de un M3U/M3U8, en orden; sin comentarios ni #EXTINF. */
export const parseM3u = (text: string): string[] => text
  .replace(/^﻿/, '')
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => line !== '' && !line.startsWith('#'));

/**
 * Posibles rutas "cloud/…" de una entrada, de más a menos probable. Acepta lo que
 * escribimos nosotros (relativa a la lista) y lo que traen listas de otros sitios:
 * relativa a la raíz de la Cloud, con "\" de Windows, codificada como URL, "file://",
 * ruta absoluta dentro de la Cloud, o una URL del backend con cualquier IP antigua
 * (/cloud/raw/… o ?path=cloud/…).
 */
export const entryCandidates = (entry: string, playlistPath: string, cloudRoot: string): string[] => {
  const playlistDir = posix.dirname(playlistPath);
  const found: string[] = [];
  const add = (p: string | undefined) => { const c = p === undefined ? undefined : toCloudPath(p); if (c && !found.includes(c)) found.push(c); };
  const fromLocalPath = (rawPath: string) => {
    const p = rawPath.replace(/\\/g, '/');
    const root = cloudRoot.replace(/\\/g, '/').replace(/\/+$/, '');
    const isAbsolute = p.startsWith('/') || /^[a-zA-Z]:\//.test(p);
    if (isAbsolute) {
      const sameRoot = process.platform === 'win32'
        ? p.toLowerCase().startsWith(`${root.toLowerCase()}/`)
        : p.startsWith(`${root}/`);
      if (sameRoot) add(p.slice(root.length + 1));
      return;
    }
    add(posix.join(playlistDir, p));
    add(p);
  };

  if (/^https?:\/\//i.test(entry)) {
    try {
      const url = new URL(entry);
      const rawIndex = url.pathname.indexOf(RAW_ROUTE_PREFIX);
      if (rawIndex >= 0) add(safeDecode(url.pathname.slice(rawIndex + RAW_ROUTE_PREFIX.length)));
      add(url.searchParams.get('path') ?? undefined);
    } catch { /* URL mal formada: no es de la Cloud */ }
    return found;
  }
  if (/^file:\/\//i.test(entry)) {
    const decoded = safeDecode(entry.replace(/^file:\/\/(localhost)?/i, ''));
    if (decoded) fromLocalPath(decoded.replace(/^\/([a-zA-Z]:\/)/, '$1'));
    return found;
  }
  if (/^[a-z][a-z0-9+.-]+:\/\//i.test(entry)) return found; // otros protocolos (rtsp://…)
  fromLocalPath(entry);
  const decoded = safeDecode(entry);
  if (decoded && decoded !== entry) fromLocalPath(decoded);
  return found;
};

const isExistingFile = async (absolutePath: string): Promise<boolean> => {
  try {
    return (await stat(absolutePath)).isFile();
  } catch {
    return false;
  }
};

/** Cuántos trozos finales de ruta comparten (para elegir la canción movida más parecida). */
const commonTailLength = (a: string, b: string): number => {
  const pa = a.toLowerCase().split('/').reverse();
  const pb = b.toLowerCase().split('/').reverse();
  let n = 0;
  while (n < pa.length && n < pb.length && pa[n] === pb[n]) n++;
  return n;
};

/**
 * VLC trata cada entrada relativa como una URL (también al abrir la lista como fichero):
 * "#" la cortaría (fragmento), "?" empezaría una query y "%" se leería como escape. Se
 * escapan solo esos tres; espacios, acentos… se dejan legibles (VLC ya los entiende).
 * Al leer, `entryCandidates` prueba la entrada tal cual y decodificada.
 */
const escapeM3uEntry = (path: string) => path.replace(/[%#?]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/** Contenido M3U8 de una lista: rutas relativas a la carpeta de la lista, con "/". */
export const formatM3u = (playlistPath: string, songPaths: string[]): string => {
  const playlistDir = posix.dirname(playlistPath);
  const name = posix.basename(playlistPath, posix.extname(playlistPath));
  const lines = ['#EXTM3U', `#PLAYLIST:${name}`];
  for (const song of songPaths) {
    lines.push(`#EXTINF:-1,${posix.basename(song, posix.extname(song))}`);
    lines.push(escapeM3uEntry(posix.relative(playlistDir, song)));
  }
  return `${lines.join('\n')}\n`;
};

export class CloudPlaylistService {
  constructor(private getCloudRoot: () => string) {}

  private absolute = (cloudPath: string) => pathModule.join(this.getCloudRoot(), cloudPath);

  /** Lee una lista de la Cloud y devuelve sus canciones que existen en la Cloud. Nunca lanza. */
  read = async (playlistPath: string): Promise<ReadPlaylistResult> => {
    const result: ReadPlaylistResult = { isError: false, message: '', songs: [], missing: [], relocated: 0 };
    const listPath = toCloudPath(playlistPath);
    if (!listPath || !isPlaylistFile(listPath)) {
      return { ...result, isError: true, message: `Not a playlist in the cloud: ${playlistPath}` };
    }
    let text: string;
    try {
      text = await readFile(this.absolute(listPath), 'utf8');
    } catch (err) {
      console.error(`[playlist] Error reading ${listPath}:`, err);
      return { ...result, isError: true, message: `Error reading ${listPath}` };
    }
    const cloudRoot = this.getCloudRoot();
    // Recorrido de la Cloud, solo si alguna canción no está en su sitio (se hace una vez)
    let byName: Map<string, string[]> | undefined;
    const findMoved = async (candidates: string[], entry: string): Promise<string | undefined> => {
      if (!byName) {
        byName = new Map();
        const files = await listAudioFiles(cloudRoot, [], () => false).catch(() => new Map<string, unknown>());
        for (const rel of files.keys()) {
          const key = posix.basename(rel).toLowerCase();
          const list = byName.get(key);
          if (list) list.push(rel); else byName.set(key, [rel]);
        }
      }
      const wanted = candidates[0] ?? entry.replace(/\\/g, '/');
      const sameName = byName.get(posix.basename(wanted).toLowerCase()) ?? [];
      if (sameName.length <= 1) return sameName[0];
      // Varias con el mismo nombre: la que comparte más carpetas finales; si empatan, ninguna
      const scored = sameName.map(rel => ({ rel, score: commonTailLength(rel, wanted) })).sort((a, b) => b.score - a.score);
      return scored[0].score > scored[1].score ? scored[0].rel : undefined;
    };

    for (const entry of parseM3u(text).slice(0, MAX_SONGS)) {
      const candidates = entryCandidates(entry, listPath, cloudRoot);
      let songPath: string | undefined;
      for (const c of candidates) {
        if (await isExistingFile(this.absolute(c))) { songPath = c; break; }
      }
      // No está en su ruta: se busca por nombre en toda la Cloud (carpeta renombrada o
      // movida, lista hecha en otro PC…). No con URLs de otras webs.
      const isForeignUrl = /^[a-z][a-z0-9+.-]+:\/\//i.test(entry) && !/^file:/i.test(entry) && candidates.length === 0;
      if (!songPath && !isForeignUrl) {
        songPath = await findMoved(candidates, entry);
        if (songPath) result.relocated++;
      }
      if (songPath) result.songs.push({ path: songPath, name: posix.basename(songPath) });
      else result.missing.push(entry);
    }
    result.message = `${result.songs.length} songs loaded from ${listPath}`;
    return result;
  };

  /** Guarda (o sobrescribe con `overwrite`) una lista en la Cloud. Nunca lanza. */
  save = async (playlistPath: string, songPaths: unknown[], overwrite: boolean): Promise<SavePlaylistResult> => {
    let listPath = toCloudPath(playlistPath);
    if (!listPath || listPath === PLAYLIST_DRIVE || posix.basename(listPath).startsWith('.')) {
      return { isError: true, message: `Invalid playlist path: ${playlistPath}` };
    }
    if (!isPlaylistFile(listPath)) listPath = `${listPath}.m3u8`;
    const songs = songPaths
      .filter((s): s is string => typeof s === 'string')
      .map(s => toCloudPath(s))
      .filter((s): s is string => s !== undefined && s !== PLAYLIST_DRIVE)
      .slice(0, MAX_SONGS);
    // Solo canciones que existen en la Cloud
    const existing: string[] = [];
    for (const song of songs) {
      if (await isExistingFile(this.absolute(song))) existing.push(song);
    }
    if (existing.length === 0) return { isError: true, message: 'The playlist has no songs from the cloud' };

    const absolutePath = this.absolute(listPath);
    if (!overwrite && await isExistingFile(absolutePath)) {
      return { isError: false, exists: true, path: listPath, message: `${listPath} already exists` };
    }
    const tmp = `${absolutePath}.tmp`;
    try {
      await mkdir(pathModule.dirname(absolutePath), { recursive: true });
      await writeFile(tmp, formatM3u(listPath, existing), 'utf8');
      await rename(tmp, absolutePath);
      return { isError: false, path: listPath, saved: existing.length, message: `Playlist saved: ${listPath}` };
    } catch (err) {
      console.error(`[playlist] Error saving ${listPath}:`, err);
      return { isError: true, path: listPath, message: `Error saving ${listPath}` };
    }
  };

  /**
   * Fichero de la Cloud pedido por ruta (GET /cloud/raw/cloud/…), o undefined si no
   * existe o sale de la Cloud.
   */
  resolveRawPath = async (requestedPath: string): Promise<{ cloudPath: string; isPlaylist: boolean } | undefined> => {
    const cloudPath = toCloudPath(requestedPath);
    if (!cloudPath || cloudPath.split('/').some(part => part.startsWith('.'))) return undefined;
    if (!await isExistingFile(this.absolute(cloudPath))) return undefined;
    return { cloudPath, isPlaylist: isPlaylistFile(cloudPath) };
  };
}
