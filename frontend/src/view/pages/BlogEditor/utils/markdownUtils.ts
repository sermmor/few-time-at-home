/**
 * HTML ↔ Markdown converters for BlogEditor output.
 * Uses the browser's DOMParser so no third-party library is needed.
 */

// ── Markdown → HTML ───────────────────────────────────────────────────────────

export function markdownToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') { i++; continue; }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = inlineToHtml(headingMatch[2].trim());
      output.push(`<h${level}>${text}</h${level}>`);
      i++; continue;
    }

    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      output.push('<hr />'); i++; continue;
    }

    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2)); i++;
      }
      const inner = quoteLines.map((l) => inlineToHtml(l)).join('<br />\n');
      output.push(`<blockquote>${inner}</blockquote>`);
      continue;
    }

    if (/^[-*+]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(`    <li>${inlineToHtml(lines[i].replace(/^[-*+]\s/, '').trim())}</li>`);
        i++;
      }
      output.push(`<ul>\n${items.join('\n')}\n</ul>`);
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(`    <li>${inlineToHtml(lines[i].replace(/^\d+\.\s/, '').trim())}</li>`);
        i++;
      }
      output.push(`<ol>\n${items.join('\n')}\n</ol>`);
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^[-*_]{3,}\s*$/.test(lines[i].trim()) &&
      !lines[i].startsWith('> ') &&
      !/^[-*+]\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i])
    ) {
      paraLines.push(inlineToHtml(lines[i])); i++;
    }
    if (paraLines.length) {
      output.push(`<p style="text-align:justify;">${paraLines.join('<br />\n')}</p>`);
    }
  }

  return output.join('\n');
}

function inlineToHtml(text: string): string {
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target=\'_blank\'>$1</a>');
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/\*\*\*(.+?)\*\*\*/g,
    '<span style="font-weight: bold;"><span style="font-style: oblique;">$1</span></span>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<span style="font-weight: bold;">$1</span>');
  text = text.replace(/\*(.+?)\*/g, '<span style="font-style: oblique;">$1</span>');
  text = text.replace(/(?<!\w)_(.+?)_(?!\w)/g, '<span style="font-style: oblique;">$1</span>');
  text = text.replace(/~~(.+?)~~/g, '<span style="text-decoration: line-through;">$1</span>');
  text = text.replace(/\^(.+?)\^/g, '<span style="vertical-align: super; font-size: 0.75em;">$1</span>');
  return text;
}

// ── HTML → Markdown ───────────────────────────────────────────────────────────

export function htmlToMarkdown(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const raw = convertNode(doc.body);
  return raw.replace(/\n{3,}/g, '\n\n').trim();
}

function convertNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case 'script': case 'style': case 'head': return '';
    case 'br': return '\n';
    case 'hr': return '\n\n---\n\n';
    case 'h1': return `\n\n# ${inner(el).trim()}\n\n`;
    case 'h2': return `\n\n## ${inner(el).trim()}\n\n`;
    case 'h3': return `\n\n### ${inner(el).trim()}\n\n`;
    case 'h4': return `\n\n#### ${inner(el).trim()}\n\n`;
    case 'h5': return `\n\n##### ${inner(el).trim()}\n\n`;
    case 'h6': return `\n\n###### ${inner(el).trim()}\n\n`;
    case 'p': { const t = inner(el).trim(); return t ? `\n\n${t}\n\n` : ''; }
    case 'div': { const t = inner(el).trim(); return t ? `\n\n${t}\n\n` : ''; }
    case 'blockquote': {
      const t = inner(el).trim();
      return `\n\n${t.split('\n').map((l) => `> ${l}`).join('\n')}\n\n`;
    }
    case 'strong': case 'b': return `**${inner(el)}**`;
    case 'em': case 'i': return `*${inner(el)}*`;
    case 's': case 'del': case 'strike': return `~~${inner(el)}~~`;
    case 'u': return `_${inner(el)}_`;
    case 'sup': return `^${inner(el)}`;
    case 'sub': return `~${inner(el)}`;
    case 'a': {
      const href = el.getAttribute('href') ?? '';
      const text = inner(el).trim();
      return text ? `[${text}](${href})` : href;
    }
    case 'img': {
      const src = el.getAttribute('src') ?? '';
      const alt = el.getAttribute('alt') ?? '';
      return `![${alt}](${src})`;
    }
    case 'ul': {
      const items = liChildren(el);
      return `\n\n${items.map((li) => `- ${inner(li).trim()}`).join('\n')}\n\n`;
    }
    case 'ol': {
      const items = liChildren(el);
      return `\n\n${items.map((li, i) => `${i + 1}. ${inner(li).trim()}`).join('\n')}\n\n`;
    }
    case 'li': return `- ${inner(el).trim()}\n`;
    case 'table': return convertTable(el);
    case 'span': {
      const style = el.getAttribute('style') ?? '';
      const text = inner(el);
      if (style.includes('font-weight: bold')) return `**${text}**`;
      if (style.includes('font-style: oblique') || style.includes('font-style: italic')) return `*${text}*`;
      if (style.includes('line-through')) return `~~${text}~~`;
      if (style.includes('text-decoration: underline')) return `_${text}_`;
      if (style.includes('vertical-align: super')) return `^${text}`;
      if (style.includes('vertical-align: sub')) return `~${text}`;
      return text;
    }
    default: return inner(el);
  }
}

function inner(el: HTMLElement): string {
  return Array.from(el.childNodes).map(convertNode).join('');
}

function liChildren(el: HTMLElement): HTMLElement[] {
  return Array.from(el.children).filter((c) => c.tagName === 'LI') as HTMLElement[];
}

function convertTable(table: HTMLElement): string {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length === 0) return '';
  const toCell = (td: Element) =>
    inner(td as HTMLElement).trim().replace(/\|/g, '\\|').replace(/\n+/g, ' ') || ' ';
  const headerCells = Array.from(rows[0].querySelectorAll('th, td')).map(toCell);
  const separator = headerCells.map(() => '---');
  const bodyRows = rows.slice(1).map((row) =>
    Array.from(row.querySelectorAll('td, th')).map(toCell));
  const format = (cells: string[]) => `| ${cells.join(' | ')} |`;
  return `\n\n${[format(headerCells), format(separator), ...bodyRows.map(format)].join('\n')}\n\n`;
}
