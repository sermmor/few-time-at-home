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
