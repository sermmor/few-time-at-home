import { formatearTitulo } from './textUtils';

export function makeTable(numFil: number, numCol: number): string {
  let html = '\n<table>\n<tr style="background: #fcdf6a;">\n';
  for (let i = 1; i <= numCol; i++) {
    html += `<th scope="col" style="border-bottom: 1px solid #000;"> <!-- Column header ${i} --> </th>\n`;
  }
  html += '</tr>\n';
  for (let i = 1; i <= numFil; i++) {
    html += `<tr><!--ROW ${i}-->\n`;
    for (let j = 1; j <= numCol; j++) {
      const style = i % 2 === 0 ? ' style="background: #fff7bb;"' : '';
      html += `<td${style}><!-- Cell (${i};${j}) --></td>\n`;
    }
    html += '</tr>\n';
  }
  html += '</table>\n';
  return html;
}

export function makeSubrayado(color: string): [string, string] {
  return [`<span style="background: #${color};">`, '</span>'];
}

export function makeCita(color: string, enBloque: boolean): [string, string] {
  if (enBloque) {
    return [
      `<blockquote style="background: #${color};color: #402C00;font-style: oblique;">`,
      '</blockquote>',
    ];
  }
  return [
    `<span style="background: #${color};color: #402C00;font-style: oblique;">`,
    '</span>',
  ];
}

export function makeImagen(
  titleImagen: string,
  altImagen: string,
  linkImagen: string,
  pieFoto: string,
  alignment: 'center' | 'left' | 'right'
): string {
  let wrapper: string;
  if (alignment === 'center') {
    wrapper = '<div style="text-align:center;">';
  } else if (alignment === 'left') {
    wrapper = '<div style="float:left;padding-right:20px;">';
  } else {
    wrapper = '<div style="float:right;padding-left:20px;">';
  }
  const titleAlt = `alt="${altImagen}" title="${titleImagen}"`;
  return (
    wrapper +
    `<a href="${linkImagen}"><img ${titleAlt} src="${linkImagen}" width="300"></a>` +
    `<br /><div style="text-align:center;font-size: 11px;">${pieFoto}</div></div>`
  );
}

function troceaFraseLateral(frase: string, numPalabras: number): string {
  const palabras = frase.split(' ');
  let resultado = '';
  let contador = 1;
  for (const palabra of palabras) {
    if (contador === numPalabras) {
      resultado += palabra + '\n';
      contador = 1;
    } else {
      resultado += palabra + ' ';
      contador++;
    }
  }
  return resultado;
}

export function makeFraseLateral(
  frase: string,
  alignment: 'center' | 'left' | 'right'
): string {
  let open: string;
  let close: string;
  if (alignment === 'center') {
    open = '<div style="text-align:center;font-size: 16pt;font-style: oblique;">';
    close = '</div>';
  } else if (alignment === 'left') {
    open = '<span style="float:left;padding-right:20px;padding-top:20px;padding-bottom:20px;font-size: 16pt;font-style: oblique;">';
    close = '</span>';
  } else {
    open = '<span style="float:right;padding-left:20px;padding-top:20px;padding-bottom:20px;font-size: 16pt;font-style: oblique;">';
    close = '</span>';
  }
  return open + troceaFraseLateral(frase, 4) + close;
}

export function makeYoutubeCode(
  code: string,
  pie: string,
  alignment: 'center' | 'left' | 'right'
): string {
  let open: string;
  let close: string;
  if (alignment === 'center') {
    open = '<div style="text-align:center;">';
    close = '</div>';
  } else if (alignment === 'left') {
    open = '<span style="float:left;padding-right:20px;padding-top:20px;padding-bottom:20px;">';
    close = '</span>';
  } else {
    open = '<span style="float:right;padding-left:20px;padding-top:20px;padding-bottom:20px;">';
    close = '</span>';
  }
  return open + code + `<br /><div style="text-align:center;font-size: 11px;">${pie}</div>` + close;
}

export function makeImageList(
  title: string,
  images: Array<{ url: string; caption: string }>
): string {
  if (!title || images.length === 0) return '';

  const formTitle = formatearTitulo(title);
  const nameList = `listaImagenes${formTitle}`;
  const namePie = `listaPieFoto${formTitle}`;
  const fnChange = `changeImageAndPie${formTitle}`;

  let listInit = '';
  let pieInit = '';
  for (let i = 0; i < images.length; i++) {
    listInit += `${nameList}[${i}]='${images[i].url}';`;
    pieInit += `${namePie}[${i}]='${images[i].caption}';`;
  }

  let html = `<div style="width: 400; border: 1px solid #CCC;text-align:center;">`;
  html += `<script type="text/javascript">`;
  html += `var ${nameList}=new Array();${listInit}`;
  html += `var ${namePie}=new Array();${pieInit}`;
  html += `var iIter${formTitle}=0;`;
  html += `function ${fnChange}(){`;
  html += `if(iIter${formTitle}>=${nameList}.length-1){iIter${formTitle}=-1;}`;
  html += `iIter${formTitle}=iIter${formTitle}+1;`;
  html += `document.nameImg${formTitle}.src=${nameList}[iIter${formTitle}];`;
  html += `document.getElementById("namePie${formTitle}").innerHTML=${namePie}[iIter${formTitle}];`;
  html += `}`;
  html += `function ${fnChange}Min(idx){`;
  html += `iIter${formTitle}=idx;`;
  html += `document.nameImg${formTitle}.src=${nameList}[idx];`;
  html += `document.getElementById("namePie${formTitle}").innerHTML=${namePie}[idx];`;
  html += `}`;
  html += `</script>`;
  html += `<div style="cursor:pointer;" onclick="${fnChange}();">`;
  html += `<img style="margin:7px;" name="nameImg${formTitle}" height="200" src="${images[0].url}" /></div><br />`;
  html += `<div id="namePie${formTitle}" style="text-align:center;">${images[0].caption}</div><br />`;
  html += `<div style="margin:7px;width:350;height:150px;border:1px solid #CCC;overflow:auto;">`;
  for (let i = 0; i < images.length; i++) {
    html += `<img style="margin:7px;" width="150" src="${images[i].url}" title="${images[i].caption}" onclick="${fnChange}Min(${i});" />`;
  }
  html += `</div></div>`;
  return html;
}

export function makeNoticiaReference(
  titulo: string,
  enlace: string,
  autor: string,
  medio: string,
  fecha: string
): string {
  return `{<i><a href="${enlace}" target='_blank'>${titulo}</a>, ${autor} (${medio}, ${fecha})</i>.}`;
}
