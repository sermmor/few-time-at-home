import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';

const FAVICON_DIR = 'data/favicon';
const EXTENSIONS  = ['png', 'ico', 'jpg', 'jpeg', 'gif', 'svg'];
const TIMEOUT_MS  = 6000;

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Extrae el nombre "amigable" para el fichero de favicon a partir de la URL.
 * Ejemplo: "https://www.youtube.com/watch?v=xxx" → "youtube"
 *          "https://docs.google.com/..."          → "google"
 *          "https://github.com/..."               → "github"
 */
export const extractFaviconName = (url: string): string => {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    const parts    = hostname.split('.');
    // Para "youtube.com"  → parts = ['youtube','com']      → parts[0] = 'youtube'
    // Para "docs.google.com" → parts = ['docs','google','com'] → parts[parts.length-2] = 'google'
    return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  } catch {
    return 'unknown';
  }
};

/**
 * Devuelve la ruta absoluta al fichero de favicon si ya existe, o null.
 */
export const getFaviconFilePath = (name: string): string | null => {
  for (const ext of EXTENSIONS) {
    const p = path.join(FAVICON_DIR, `${name}.${ext}`);
    if (existsSync(p)) return p;
  }
  return null;
};

// ── Descarga ───────────────────────────────────────────────────────────────────

const fetchWithTimeout = (url: string) =>
  fetch(url, { timeout: TIMEOUT_MS } as any);

/**
 * Intenta descargar y guardar el favicon para la URL dada.
 * - Primero intenta el servicio de Google Favicons (más fiable).
 * - Si falla, intenta /favicon.ico directamente en el host.
 * Devuelve el nombre (sin extensión) si tuvo éxito, o null si no.
 */
export const getOrDownloadFavicon = async (url: string): Promise<string | null> => {
  const name = extractFaviconName(url);

  // ¿Ya existe en disco? No volver a descargar.
  if (getFaviconFilePath(name)) {
    console.log(`[Favicon] cache hit: ${name}`);
    return name;
  }

  // Asegurar que el directorio existe
  if (!existsSync(FAVICON_DIR)) {
    mkdirSync(FAVICON_DIR, { recursive: true });
  }

  let hostname: string;
  let protocol: string;
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname;
    protocol = parsed.protocol;
  } catch {
    return null;
  }

  const savePath = path.join(FAVICON_DIR, `${name}.png`);

  // ── Intento 1: Google Favicon Service ─────────────────────────────────────
  try {
    const googleUrl = `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
    const res = await fetchWithTimeout(googleUrl);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(savePath, buf);
      console.log(`[Favicon] downloaded from Google: ${name}`);
      return name;
    }
  } catch (e) {
    console.warn(`[Favicon] Google service failed for ${hostname}:`, (e as Error).message);
  }

  // ── Intento 2: /favicon.ico directo en el host ────────────────────────────
  try {
    const icoUrl = `${protocol}//${hostname}/favicon.ico`;
    const res    = await fetchWithTimeout(icoUrl);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(savePath, buf);
      console.log(`[Favicon] downloaded from direct ico: ${name}`);
      return name;
    }
  } catch (e) {
    console.warn(`[Favicon] direct ico failed for ${hostname}:`, (e as Error).message);
  }

  console.warn(`[Favicon] could not download favicon for ${hostname}`);
  return null;
};
