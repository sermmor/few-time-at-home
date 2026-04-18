import { formatearTitulo } from './textUtils';

export function convertirLlavesEnNotas(
  textoCompleto: string,
  titulo: string,
  pasarANotas: boolean
): [string, string] {
  if (!titulo || !pasarANotas) return [textoCompleto, ''];

  const sFormatTitulo = formatearTitulo(titulo);
  const lTextoConLlaves = textoCompleto.split('{');

  if (lTextoConLlaves.length <= 1) return [textoCompleto, ''];

  let sTodaNota = '';
  let sTextoSinNotas = lTextoConLlaves[0];

  for (let i = 1; i < lTextoConLlaves.length; i++) {
    const sNumNota = i.toString();
    const lNotaYNoNota = lTextoConLlaves[i].split('}');
    const sNotaCode =
      `<a href="#${sFormatTitulo}Ref${sNumNota}" id="${sFormatTitulo}CN${sNumNota}">[${sNumNota}]</a> ` +
      lNotaYNoNota[0] + '\n';
    sTodaNota += sNotaCode;
    const sNotaTextCode =
      `<a id="${sFormatTitulo}Ref${sNumNota}" href="#${sFormatTitulo}CN${sNumNota}">[${sNumNota}]</a>`;
    sTextoSinNotas += sNotaTextCode + lNotaYNoNota[1];
  }

  return [sTextoSinNotas, sTodaNota];
}

function montarTextoNota(lIniNota: string[], iNumeroNota: number): string {
  return (
    lIniNota[0] + iNumeroNota.toString() +
    lIniNota[1] + iNumeroNota.toString() +
    lIniNota[2] + iNumeroNota.toString() +
    lIniNota[3]
  );
}

function averiguarTitulo(textoCompleto: string): string {
  const sComienzo = 'Ref1" href="#';
  const sFin = 'CN1">[1]</a>';
  const iComienzoTitulo = textoCompleto.indexOf(sComienzo) + sComienzo.length;
  const iFinTitulo = textoCompleto.indexOf(sFin);
  return textoCompleto.substring(iComienzoTitulo, iFinTitulo);
}

function extraerNotas(textoCompleto: string, titulo: string): string[] {
  const listaNotas: string[] = [];
  const lIniNota = [
    `<a href="#${titulo}Ref`,
    `" id="${titulo}CN`,
    '">[',
    ']</a> ',
  ];
  let iNumeroNota = 1;
  let bSeguir = true;

  while (bSeguir) {
    const sNotaActual = montarTextoNota(lIniNota, iNumeroNota);
    iNumeroNota++;
    const sNotaSiguiente = montarTextoNota(lIniNota, iNumeroNota);
    const iComienzoNota = textoCompleto.indexOf(sNotaActual) + sNotaActual.length;
    const iFinSiguiente = textoCompleto.indexOf(sNotaSiguiente);

    if (iFinSiguiente > 0) {
      listaNotas[iNumeroNota - 2] = textoCompleto.substring(iComienzoNota, iFinSiguiente - 1);
    } else {
      const sFinTag = '</span>\n</div>\n';
      const iFinNota = textoCompleto.length - sFinTag.length;
      listaNotas[iNumeroNota - 2] = textoCompleto.substring(iComienzoNota, iFinNota - 1);
      bSeguir = false;
    }
  }
  return listaNotas;
}

function getTextoSinZonaNotas(textoCompleto: string, titulo: string): string {
  const sTextoPrimeraNota = `<a href="#${titulo}Ref1" id="${titulo}CN1">[1]</a> `;
  const iPosZonaNotas = textoCompleto.indexOf(sTextoPrimeraNota) - 93;
  return textoCompleto.substring(0, iPosZonaNotas);
}

function insertarLlavesNotasEnTexto(
  textoCompleto: string,
  titulo: string,
  listaNotas: string[]
): string {
  const lIniNota = [
    `<a id="${titulo}Ref`,
    `" href="#${titulo}CN`,
    '">[',
    ']</a>',
  ];
  let sTextoResultado = textoCompleto;
  for (let i = 1; i <= listaNotas.length; i++) {
    const parts = sTextoResultado.split(montarTextoNota(lIniNota, i));
    sTextoResultado = parts[0] + '{' + listaNotas[i - 1] + '}' + parts[1];
  }
  return sTextoResultado;
}

export function convertirTextoConNotasEnLlaves(
  textoCompleto: string
): [string, string, boolean] {
  const sComienzo = 'Ref1" href="#';
  const iComienzoTitulo = textoCompleto.indexOf(sComienzo);

  if (iComienzoTitulo <= 0) return [textoCompleto, '', false];

  const titulo = averiguarTitulo(textoCompleto);
  const listaNotas = extraerNotas(textoCompleto, titulo);
  const textoSinZona = getTextoSinZonaNotas(textoCompleto, titulo);
  const resultado = insertarLlavesNotasEnTexto(textoSinZona, titulo, listaNotas);

  return [resultado, titulo, true];
}
