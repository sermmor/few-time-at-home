const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]'];
const isLoopbackHost = (host: string): boolean => LOOPBACK_HOSTS.includes(host.toLowerCase());

// ── Host del backend ──────────────────────────────────────────────────────────
// `configuration.json` suele tener `"ip": "localhost"` en el ordenador de
// desarrollo. Eso solo vale desde el propio ordenador: si la web se abre desde
// otro dispositivo de la red (p. ej. el móvil en http://<IP>:7000), "localhost"
// sería el móvil y la app se quedaría esperando al backend para siempre.
// En ese caso se usa el host desde el que se ha cargado la página, porque el
// backend corre en la misma máquina que sirve el frontend.
export const resolveBackendHost = (configuredIp: string): string => {
  if (typeof window === 'undefined') return configuredIp;
  const pageHost = window.location.hostname;
  if (isLoopbackHost(configuredIp) && pageHost && !isLoopbackHost(pageHost)) {
    // Las IPv6 necesitan corchetes dentro de una URL.
    return pageHost.includes(':') && !pageHost.startsWith('[') ? `[${pageHost}]` : pageHost;
  }
  return configuredIp;
};

// Reescribe una URL absoluta del backend que apunte a "localhost" para que sea
// alcanzable desde este dispositivo. Ejemplo: el ordenador emite a /alexa una
// canción con `http://localhost:3001/cloud/stream-file?...`; en el móvil ese
// "localhost" sería el propio móvil, así que se cambia por el host de la página.
export const toReachableBackendUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (!isLoopbackHost(parsed.hostname)) return url;
    const host = resolveBackendHost(parsed.hostname);
    if (host === parsed.hostname) return url;
    parsed.hostname = host;
    return parsed.toString();
  } catch {
    return url; // URL relativa o inválida: se deja tal cual
  }
};

export class ConfigurationService {
  static Instance: ConfigurationService;
  public ip: string;
  constructor(ip: string, public port: number, public webSocketPort: number, public isUsingMocks: boolean) {
    this.ip = resolveBackendHost(ip);
    ConfigurationService.Instance = this;
  }
}
