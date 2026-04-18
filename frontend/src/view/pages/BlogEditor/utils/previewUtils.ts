import { intercambiaSaltosPorBr } from './textUtils';
import { convertirLlavesEnNotas } from './notesUtils';

export function createZonaNotas(
  textoNotas: string,
  colorNota: string,
  pasarABr: boolean
): string {
  const fondoStyle = colorNota ? `style="background-color: #${colorNota};"` : '';
  if (pasarABr) {
    return (
      `<hr />\n<div ${fondoStyle}>\n<i>Notes:</i>` +
      `<span style="font-size: 11px;"><br />\n` +
      `${textoNotas.replace(/(\r\n|\n|\r)/gm, '<br />')}` +
      `</span><br />\n</div><br />\n`
    );
  }
  return (
    `<hr />\n<div ${fondoStyle}>\n<i>Notes:</i>` +
    `<span style="font-size: 11px;">\n${textoNotas}</span>\n</div>\n`
  );
}

export function createCodeEntry(
  content: string,
  tituloNota: string,
  pasarANotas: boolean,
  pasarABr: boolean,
  colorNota: string
): string {
  const withBr = intercambiaSaltosPorBr(content, pasarABr);
  const [textoSinNotas, contentNotas] = convertirLlavesEnNotas(withBr, tituloNota, pasarANotas);
  if (contentNotas) {
    return textoSinNotas + '<br />\n' + createZonaNotas(contentNotas, colorNota, pasarABr);
  }
  return textoSinNotas;
}
