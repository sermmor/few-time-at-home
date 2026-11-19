import React from 'react';

// ── Mantener la pantalla encendida ────────────────────────────────────────────
// Se usa en páginas "receptoras" (p. ej. /alexa) que se dejan abiertas en un
// móvil conectado a un altavoz: si la pantalla se apaga, el navegador suspende
// la página y la emisión en vivo falla.
//
// Estrategia:
// 1. Screen Wake Lock API (`navigator.wakeLock`). Solo existe en contextos
//    seguros (HTTPS o localhost). En la red local la app se sirve por http, así
//    que normalmente NO estará disponible.
// 2. Alternativa (técnica "NoSleep"): un vídeo negro, mudo y en bucle. Chrome
//    para Android no apaga la pantalla mientras se reproduce un vídeo visible.
//    Se pinta a pantalla completa como fondo (ver estilos en `ensureVideo`).
//
// Ambos se pierden al ocultar la página (cambio de app, bloqueo manual), así que
// se vuelven a pedir en `visibilitychange` y en cada toque del usuario.

export type KeepAwakeMode = 'wakeLock' | 'video' | 'off';

// Mínima tipificación propia: TS 4.9 no siempre trae los tipos de WakeLock.
interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', cb: () => void) => void;
}

export const isAndroidDevice = (): boolean =>
  typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

const KEEP_AWAKE_VIDEO_SOURCES: { src: string; type: string }[] = [
  { src: '/keep-awake.webm', type: 'video/webm' },
  { src: '/keep-awake.mp4', type: 'video/mp4' },
];

export const useKeepScreenAwake = (enabled: boolean): KeepAwakeMode => {
  const [mode, setMode] = React.useState<KeepAwakeMode>('off');

  React.useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    let disposed = false;
    let sentinel: WakeLockSentinelLike | null = null;
    let video: HTMLVideoElement | null = null;

    const wakeLockApi = (navigator as any).wakeLock as
      { request: (type: 'screen') => Promise<WakeLockSentinelLike> } | undefined;
    const canUseWakeLock = window.isSecureContext && !!wakeLockApi;

    // ── Alternativa: vídeo mudo en bucle ──────────────────────────────────────
    const ensureVideo = (): HTMLVideoElement => {
      if (video) return video;
      const v = document.createElement('video');
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.setAttribute('muted', '');
      v.setAttribute('playsinline', '');
      v.setAttribute('aria-hidden', 'true');
      v.title = 'Mantener pantalla encendida';
      // Chrome solo mantiene la pantalla encendida con vídeos que se ven de verdad
      // (un vídeo diminuto o casi transparente no basta). Por eso ocupa toda la
      // pantalla, opaco, en la capa z-index 0 (por encima del fondo de la app): el
      // vídeo es negro y hace de fondo. La página debe poner su contenido encima
      // (position + z-index ≥ 1) y dejar su fondo transparente en modo 'video'.
      Object.assign(v.style, {
        position: 'fixed', top: '0', left: '0',
        width: '100vw', height: '100vh', objectFit: 'cover',
        backgroundColor: '#000', pointerEvents: 'none', zIndex: '0',
      } as Partial<CSSStyleDeclaration>);
      KEEP_AWAKE_VIDEO_SOURCES.forEach(({ src, type }) => {
        const source = document.createElement('source');
        source.src = src;
        source.type = type;
        v.appendChild(source);
      });
      // El modo refleja si el vídeo se está reproduciendo de verdad: el navegador
      // puede pausarlo al ocultar la página.
      v.addEventListener('play', () => { if (!disposed && !sentinel) setMode('video'); });
      v.addEventListener('pause', () => { if (!disposed && !sentinel) setMode('off'); });
      document.body.appendChild(v);
      video = v;
      return v;
    };

    const startVideo = async () => {
      try {
        const v = ensureVideo();
        if (v.paused) await v.play();
      } catch (err) {
        // Sin gesto del usuario el navegador puede bloquearlo: se reintenta al tocar.
        console.warn('[KeepAwake] el vídeo de respaldo no pudo reproducirse:', err);
      }
    };

    // ── Opción preferida: Screen Wake Lock ────────────────────────────────────
    const requestWakeLock = async (): Promise<boolean> => {
      if (!canUseWakeLock || !wakeLockApi) return false;
      if (sentinel && !sentinel.released) return true;
      sentinel = null;
      try {
        const lock = await wakeLockApi.request('screen');
        if (disposed) { lock.release().catch(() => undefined); return true; }
        sentinel = lock;
        lock.addEventListener('release', () => {
          if (sentinel === lock) sentinel = null;
          if (!disposed) setMode('off');
        });
        // Si el vídeo de respaldo llegó a arrancar antes, ya no hace falta.
        video?.pause();
        setMode('wakeLock');
        return true;
      } catch (err) {
        console.warn('[KeepAwake] wakeLock rechazado, uso el vídeo de respaldo:', err);
        return false;
      }
    };

    const acquire = async () => {
      if (disposed || document.visibilityState !== 'visible') return;
      const ok = await requestWakeLock();
      if (!ok && !disposed) await startVideo();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') acquire();
    };

    acquire();
    // Red de seguridad: si algo liberó el bloqueo o pausó el vídeo sin avisar,
    // se vuelve a pedir cada poco (no hace nada si ya está activo).
    const retryTimer = window.setInterval(acquire, 30_000);
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('pointerdown', acquire);
    document.addEventListener('touchstart', acquire, { passive: true });

    return () => {
      disposed = true;
      window.clearInterval(retryTimer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('pointerdown', acquire);
      document.removeEventListener('touchstart', acquire);
      if (sentinel && !sentinel.released) sentinel.release().catch(() => undefined);
      sentinel = null;
      if (video) {
        video.pause();
        video.remove();
        video = null;
      }
      setMode('off');
    };
  }, [enabled]);

  return mode;
};
