/**
 * Copies text to the clipboard.
 *
 * Uses the modern navigator.clipboard API only on secure contexts (HTTPS or
 * localhost). On plain-HTTP local-network deployments (e.g. Raspberry Pi),
 * window.isSecureContext is false — navigator.clipboard may still exist in
 * Chrome but writeText() will reject asynchronously, which means the
 * execCommand fallback would run outside the original user-gesture and also
 * fail. Checking isSecureContext upfront ensures we always call execCommand
 * synchronously within the click handler when needed.
 */
export function copyToClipboard(text: string): void {
  if (window.isSecureContext && navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => _execCommandCopy(text));
  } else {
    _execCommandCopy(text);
  }
}

/**
 * Fallback para contextos no seguros (HTTP en la red local).
 *
 * Ojo: si se llama desde un Menu/Dialog de MUI, su FocusTrap recupera el foco
 * en cuanto el textarea oculto lo toma, así que la selección queda vacía y
 * execCommand('copy') no copiaba nada. Por eso:
 *  1. Escuchamos el evento 'copy' y escribimos el texto directamente en
 *     clipboardData: no depende ni del foco ni de la selección.
 *  2. Aun así, insertamos el textarea dentro del contenedor que tiene el foco
 *     (dentro del FocusTrap) y lo seleccionamos, para navegadores (Safari/iOS)
 *     que no lanzan 'copy' sin una selección real.
 */
function _execCommandCopy(text: string): void {
  const onCopy = (e: ClipboardEvent) => {
    if (!e.clipboardData) return;
    e.clipboardData.setData('text/plain', text);
    e.preventDefault();
  };

  const previousFocus = document.activeElement as HTMLElement | null;
  const container =
    (previousFocus?.closest('[role="presentation"], [role="dialog"]') as HTMLElement | null)
    ?? document.body;

  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.position = 'fixed';
  el.style.top      = '0';
  el.style.left     = '0';
  el.style.opacity  = '0';
  el.style.pointerEvents = 'none';
  container.appendChild(el);

  document.addEventListener('copy', onCopy, true);
  try {
    el.focus();
    el.select();
    el.setSelectionRange(0, text.length); // iOS
    document.execCommand('copy');
  } catch {
    // Sin portapapeles disponible: no hay nada más que hacer
  } finally {
    document.removeEventListener('copy', onCopy, true);
    container.removeChild(el);
    previousFocus?.focus?.();
  }
}
