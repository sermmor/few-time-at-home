/**
 * Copies text to the clipboard.
 *
 * Prefers the modern navigator.clipboard API (requires HTTPS or localhost).
 * Falls back to the legacy document.execCommand('copy') approach so the
 * feature works on plain-HTTP local-network deployments where navigator.clipboard
 * is undefined.
 */
export function copyToClipboard(text: string): void {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => _execCommandCopy(text));
  } else {
    _execCommandCopy(text);
  }
}

function _execCommandCopy(text: string): void {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.top      = '-9999px';
  el.style.left     = '-9999px';
  document.body.appendChild(el);
  el.focus();
  el.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(el);
  }
}
