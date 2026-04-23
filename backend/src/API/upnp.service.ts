import * as dgram from 'dgram';
import * as os from 'os';
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

// Search types to send — broadest first so we catch routers (IGD),
// NAS boxes and any other device that may host a ContentDirectory service.
const SSDP_SEARCH_TYPES = [
  'ssdp:all',
  'urn:schemas-upnp-org:device:MediaServer:1',
  'urn:schemas-upnp-org:service:ContentDirectory:1',
];

/** Returns all non-loopback IPv4 addresses on this machine. */
function getLanInterfaces(): string[] {
  const result: string[] = [];
  for (const iface of Object.values(os.networkInterfaces())) {
    if (!iface) continue;
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) result.push(addr.address);
    }
  }
  return result;
}

const makeMessage = (st: string) => Buffer.from(
  `M-SEARCH * HTTP/1.1\r\nHOST: ${SSDP_MULTICAST}:${SSDP_PORT}\r\nMAN: "ssdp:discover"\r\nMX: 4\r\nST: ${st}\r\n\r\n`
);

/** Run SSDP discovery bound to a specific local interface address. */
function ssdpDiscoverOnInterface(ifaceAddr: string, timeoutMs: number): Promise<string[]> {
  return new Promise(resolve => {
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    const locations = new Set<string>();

    socket.on('message', (msg: Buffer) => {
      const text = msg.toString();
      const m = text.match(/LOCATION:\s*(\S+)/i);
      if (m) locations.add(m[1]);
    });

    socket.on('error', () => {/* ignore */});

    socket.bind(0, ifaceAddr, () => {
      try {
        socket.setMulticastTTL(4);
        // Bind multicast membership to this specific interface so we
        // receive both multicast responses and unicast replies on it.
        socket.addMembership(SSDP_MULTICAST, ifaceAddr);

        // Stagger search types slightly to avoid packet collisions.
        SSDP_SEARCH_TYPES.forEach((st, i) => {
          const buf = makeMessage(st);
          setTimeout(() => {
            try { socket.send(buf, 0, buf.length, SSDP_PORT, SSDP_MULTICAST); } catch (_) {/* ignore */}
          }, i * 300);
        });
      } catch (_) {/* ignore */}

      setTimeout(() => {
        try { socket.close(); } catch (_) {/* ignore */}
        resolve(Array.from(locations));
      }, timeoutMs);
    });
  });
}

function ssdpDiscover(timeoutMs = 6000): Promise<string[]> {
  const ifaces = getLanInterfaces();
  console.log(`[UPnP] LAN interfaces found: ${ifaces.length > 0 ? ifaces.join(', ') : 'none — falling back to 0.0.0.0'}`);

  // If no LAN interface is detected (e.g. only loopback), fall back to 0.0.0.0.
  const targets = ifaces.length > 0 ? ifaces : ['0.0.0.0'];

  return Promise.all(targets.map(addr => ssdpDiscoverOnInterface(addr, timeoutMs)))
    .then(results => {
      const all = new Set<string>();
      results.forEach(r => r.forEach(loc => all.add(loc)));
      console.log(`[UPnP] SSDP locations discovered: ${all.size > 0 ? Array.from(all).join(', ') : 'none'}`);
      return Array.from(all);
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
