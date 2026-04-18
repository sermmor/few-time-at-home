/**
 * Removes accents, spaces and special characters from a title
 * to generate a valid HTML id/anchor.
 */
export function formatearTitulo(titulo: string): string {
  return titulo
    .split(' ').join('')
    .split('á').join('a').split('é').join('e').split('í').join('i')
    .split('ó').join('o').split('ú').join('u')
    .split('Á').join('A').split('É').join('E').split('Í').join('I')
    .split('Ó').join('O').split('Ú').join('U')
    .split('Ü').join('U').split('ü').join('u')
    .split('ñ').join('ny').split('Ñ').join('NY')
    .split('&').join('y').split('@').join('at')
    .split('(').join('').split(')').join('')
    .split(':').join('').split(';').join('')
    .split('.').join('').split(',').join('')
    .split('/').join('').split('\\').join('')
    .split('¿').join('').split('?').join('')
    .split('¡').join('').split('!').join('')
    .split('"').join("").split("'").join('')
    .split('$').join('').split('+').join('')
    .split('-').join('').split('*').join('')
    .split('·').join('').split('#').join('')
    .split('%').join('').split('=').join('')
    .split('<').join('').split('>').join('')
    .split('ç').join('').split('Ç').join('');
}

/**
 * Replaces line breaks with <br /> tags if enabled.
 */
export function intercambiaSaltosPorBr(texto: string, enabled: boolean): string {
  if (!enabled) return texto;
  return texto.replace(/(\r\n|\n|\r)/gm, '<br />');
}

/**
 * Heuristic algorithm: marks likely paragraph endings with "*"
 * to help convert PDF-copied text into proper paragraphs.
 */
export function vorazColocaPuntoYAparte(sTexto: string): string {
  const iAInspeccionar = 50;
  let iMaxCaracteresXLinea = 0;
  const lTextoSplit = sTexto.split('\n');
  const linesToInspect = Math.min(lTextoSplit.length, iAInspeccionar);

  for (let i = 0; i < linesToInspect; i++) {
    const candidate = lTextoSplit[i].length;
    if (candidate > iMaxCaracteresXLinea) {
      iMaxCaracteresXLinea = candidate;
    }
  }
  iMaxCaracteresXLinea = iMaxCaracteresXLinea - 4;

  let ret = '';
  for (let i = 0; i < lTextoSplit.length; i++) {
    let frase = lTextoSplit[i];
    const len = frase.length;
    if (len > 0 && frase[len - 1] === '.' && len <= iMaxCaracteresXLinea) {
      frase = frase + '*';
    }
    ret = ret + frase + '\n';
  }
  return ret;
}

/**
 * Converts PDF-copied text to normal paragraph format.
 */
export function fromPDFFormatToText(selectedText: string): string {
  let text = vorazColocaPuntoYAparte(selectedText);
  text = text.replace(/-(\r\n|\n|\r)/gm, '');
  text = text.replace(/(\r\n|\n|\r)/gm, ' ');
  text = text.replace(/\* /gm, '\n\n');
  return text;
}

/**
 * Searches for text in the textarea (case-insensitive) and selects it.
 * Returns [foundIndex, foundEnd] or [-1, -1] if not found.
 */
export function findAndSelect(
  textareaValue: string,
  searchTerm: string
): [number, number] {
  const valueLower = textareaValue.toLowerCase();
  const searchLower = searchTerm.toLowerCase();
  const idx = valueLower.search(searchLower);
  if (idx !== -1) {
    return [idx, idx + searchTerm.length];
  }
  return [textareaValue.length, textareaValue.length];
}
