import * as dgram from 'dgram';
import fetch from 'node-fetch';

// ── Types ──────────────────────────────────────────────────────────────────

export interface UPnPServer {
  name: string;        // friendlyName from device description
  controlUrl: string;  // full absolute URL to ContentDirectory control endpoint
  location: string;    // original SSDP LOCATION header value
}

export interface UPnPContainer {
  id: string;
  title: string;
  childCount: number;
}

export interface UPnPItem {
  id: string;
  title: string;
  resourceUrl: string;  // HTTP URL to the media file (from <res> in DIDL-Lite)
  mimeType: string;
}

export interface UPnPBrowseResult {
  containers: UPnPContainer[];
  items: UPnPItem[];
}

// ── XML helpers (targeted, no deps) ───────────────────────────────────────

/** Extract text content of the first occurrence of <tag>…</tag> (case-insensitive). */
function getTagText(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : '';
}

/** Extract all occurrences of <tag …>…</tag> as raw strings. */
function getAllElements(xml: string, tag: string): string[] {
  const results: string[] = [];
  const re = new RegExp(`<${tag}(?:[\\s/][^>]*)?>(?:[\\s\\S]*?)<\\/${tag}>`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) results.push(m[0]);
  return results;
}

/** Extract a named attribute value from an opening tag string. */
function getAttr(openTag: string, attr: string): string {
  const re = new RegExp(`\\b${attr}="([^"]*)"`, 'i');
  const m = openTag.match(re);
  return m ? m[1] : '';
}

/** Decode XML/HTML character entities. */
function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// ── SSDP discovery ─────────────────────────────────────────────────────────

const SSDP_MULTICAST = '239.255.255.250';
const SSDP_PORT = 1900;

function ssdpDiscover(timeoutMs = 4000): Promise<string[]> {
  return new Promise(resolve => {
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    const locations = new Set<string>();

    const message = Buffer.from(
      `M-SEARCH * HTTP/1.1\r\nHOST: ${SSDP_MULTICAST}:${SSDP_PORT}\r\nMAN: "ssdp:discover"\r\nMX: 3\r\nST: urn:schemas-upnp-org:device:MediaServer:1\r\n\r\n`
    );

    socket.on('message', (msg: Buffer) => {
      const text = msg.toString();
      const m = text.match(/LOCATION:\s*(\S+)/i);
      if (m) locations.add(m[1]);
    });

    socket.on('error', () => {/* ignore network errors */});

    socket.bind(0, () => {
      try {
        socket.setMulticastTTL(4);
        socket.send(message, 0, message.length, SSDP_PORT, SSDP_MULTICAST);
      } catch (_) {/* ignore */}

      setTimeout(() => {
        try { socket.close(); } catch (_) {/* ignore */}
        resolve(Array.from(locations));
      }, timeoutMs);
    });
  });
}

// ── Device description fetching ────────────────────────────────────────────

/** Given a LOCATION URL, fetch the device XML and extract name + ContentDirectory controlURL. */
async function fetchDeviceInfo(location: string): Promise<UPnPServer | null> {
  try {
    const parsedLoc = new URL(location);
    const baseUrl = `${parsedLoc.protocol}//${parsedLoc.host}`;

    const res = await fetch(location, { timeout: 5000 } as any);
    if (!res.ok) return null;
    const xml = await res.text();

    const name = getTagText(xml, 'friendlyName') || 'Unknown';

    // Find the ContentDirectory service block
    const serviceBlocks = getAllElements(xml, 'service');
    for (const block of serviceBlocks) {
      const serviceType = getTagText(block, 'serviceType');
      if (!serviceType.toLowerCase().includes('contentdirectory')) continue;

      let controlUrl = getTagText(block, 'controlURL');
      if (!controlUrl) continue;
      if (!controlUrl.startsWith('http')) {
        controlUrl = `${baseUrl}${controlUrl.startsWith('/') ? '' : '/'}${controlUrl}`;
      }
      return { name, controlUrl, location };
    }
    return null;
  } catch {
    return null;
  }
}

// ── SOAP Browse ────────────────────────────────────────────────────────────

function buildBrowseSoap(objectId: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"
            s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:Browse xmlns:u="urn:schemas-upnp-org:service:ContentDirectory:1">
      <ObjectID>${objectId}</ObjectID>
      <BrowseFlag>BrowseDirectChildren</BrowseFlag>
      <Filter>*</Filter>
      <StartingIndex>0</StartingIndex>
      <RequestedCount>0</RequestedCount>
      <SortCriteria></SortCriteria>
    </u:Browse>
  </s:Body>
</s:Envelope>`;
}

function parseDidlContainers(didl: string): UPnPContainer[] {
  const containers: UPnPContainer[] = [];
  const re = /<container\s([^>]*)>([\s\S]*?)<\/container>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(didl)) !== null) {
    const attrs = m[1];
    const content = m[2];
    const id = getAttr(attrs, 'id');
    const title =
      /<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i.exec(content)?.[1]?.trim() ||
      getTagText(content, 'title') ||
      '';
    const ccStr = getAttr(attrs, 'childCount');
    const childCount = ccStr ? parseInt(ccStr, 10) : 0;
    if (id && title) containers.push({ id, title, childCount });
  }
  return containers;
}

/** Make a URL absolute.  Some DLNA servers return relative paths in <res>. */
function makeAbsolute(url: string, serverBase: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${serverBase}${url}`;
  return `${serverBase}/${url}`;
}

function parseDidlItems(didl: string, serverBase = ''): UPnPItem[] {
  const items: UPnPItem[] = [];
  const itemRe = /<item\s([^>]*)>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(didl)) !== null) {
    const attrs = m[1];
    const content = m[2];
    const id = getAttr(attrs, 'id');
    const title =
      /<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i.exec(content)?.[1]?.trim() ||
      getTagText(content, 'title') ||
      '';

    // Find the best <res> element (prefer video/*)
    let resourceUrl = '';
    let mimeType = '';
    const resRe = /<res\s([^>]*)>([\s\S]*?)<\/res>/gi;
    let rm: RegExpExecArray | null;
    while ((rm = resRe.exec(content)) !== null) {
      const resAttrs = rm[1];
      const rawUrl = rm[2].trim();
      if (!rawUrl) continue;
      const absoluteUrl = makeAbsolute(rawUrl, serverBase);
      const pi = getAttr(resAttrs, 'protocolInfo');       // e.g. http-get:*:video/mp4:*
      const mime = pi.split(':')[2] || '';
      if (mime.startsWith('video/') && !resourceUrl) {
        resourceUrl = absoluteUrl;
        mimeType = mime;
      } else if (!resourceUrl) {
        resourceUrl = absoluteUrl;
        mimeType = mime;
      }
    }

    if (id && title && resourceUrl) items.push({ id, title, resourceUrl, mimeType });
  }
  return items;
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function discoverUpnpServers(timeoutMs = 4000): Promise<UPnPServer[]> {
  const locations = await ssdpDiscover(timeoutMs);
  const results = await Promise.all(locations.map(fetchDeviceInfo));
  return results.filter((s): s is UPnPServer => s !== null);
}

export async function browseUpnpServer(controlUrl: string, objectId = '0'): Promise<UPnPBrowseResult> {
  // Derive the server base URL to resolve any relative <res> URLs in DIDL-Lite.
  let serverBase = '';
  try {
    const parsed = new URL(controlUrl);
    serverBase = `${parsed.protocol}//${parsed.host}`;
  } catch { /* ignore if controlUrl is malformed */ }

  const soapBody = buildBrowseSoap(objectId);

  const res = await fetch(controlUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset="utf-8"',
      'SOAPAction': '"urn:schemas-upnp-org:service:ContentDirectory:1#Browse"',
    },
    body: soapBody,
    timeout: 10000,
  } as any);

  if (!res.ok) throw new Error(`SOAP browse failed: ${res.status}`);

  const responseXml = await res.text();

  // The Result element contains HTML-encoded DIDL-Lite XML
  const resultMatch = responseXml.match(/<Result[^>]*>([\s\S]*?)<\/Result>/i);
  const encodedDidl = resultMatch?.[1] ?? '';
  const didl = decodeEntities(encodedDidl);

  const result = {
    containers: parseDidlContainers(didl),
    items: parseDidlItems(didl, serverBase),
  };

  console.log(`[UPnP Browse] objectId=${objectId} → ${result.containers.length} carpetas, ${result.items.length} items`);
  if (result.items.length > 0) {
    console.log(`[UPnP Browse] Primer item URL: ${result.items[0].resourceUrl}`);
  }

  return result;
}
