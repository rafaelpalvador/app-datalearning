// Renderizador de Markdown mínimo para os cards de teoria.
// Suporta: títulos, parágrafos, listas, tabelas, citações (dicas), blocos de código (``` ou ~~~),
// `código`, **negrito** e *itálico*.

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function inline(text) {
  return text
    .split(/(`[^`]+`)/g)
    .map((part) => {
      if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
        return `<code>${esc(part.slice(1, -1).replace(/\\\|/g, '|'))}</code>`;
      }
      return esc(part)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>');
    })
    .join('');
}

function splitRow(line) {
  const cells = [];
  let cur = '';
  let inCode = false;
  const body = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '\\' && body[i + 1] === '|') { cur += '\\|'; i++; continue; }
    if (ch === '`') inCode = !inCode;
    if (ch === '|' && !inCode) { cells.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

export function highlight(code, lang) {
  const kw = lang === 'sql'
    ? /\b(SELECT|FROM|WHERE|AND|OR|NOT|IN|IS|NULL|AS|ON|JOIN|INNER|LEFT|RIGHT|FULL|OUTER|CROSS|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|DISTINCT|CASE|WHEN|THEN|ELSE|END|WITH|RECURSIVE|UNION|ALL|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|VIEW|INDEX|PRIMARY|KEY|REFERENCES|DEFAULT|CHECK|BETWEEN|LIKE|EXISTS|OVER|PARTITION|ROWS|PRECEDING|FOLLOWING|CURRENT|ROW|UNBOUNDED|ASC|DESC|BEGIN|COMMIT|ROLLBACK|EXPLAIN|QUERY|PLAN|INTERVAL|INTERSECT|EXCEPT|ANALYZE)\b/g
    : /\b(import|from|as|def|return|if|elif|else|for|while|in|not|and|or|is|None|True|False|try|except|finally|raise|with|lambda|class|pass|break|continue|yield|print)\b/g;
  const comment = lang === 'sql' ? /(--[^\n]*)/g : /(#[^\n]*)/g;
  // tokeniza strings e comentários primeiro para não colorir dentro deles
  const re = new RegExp(`(${comment.source.slice(1, -1)})|('(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*")`, 'g');
  let out = '';
  let last = 0;
  let m;
  const colorPlain = (s) => esc(s)
    .replace(kw, '<span class="tk-kw">$1</span>')
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tk-num">$1</span>');
  while ((m = re.exec(code))) {
    out += colorPlain(code.slice(last, m.index));
    out += m[1] ? `<span class="tk-com">${esc(m[0])}</span>` : `<span class="tk-str">${esc(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  out += colorPlain(code.slice(last));
  return out;
}

export function renderMarkdown(src) {
  const lines = src.replace(/^\n+/, '').replace(/\s+$/, '').split('\n');
  let html = '';
  let i = 0;
  const isSpecial = (l) => /^(```|~~~|#{1,4} |\s*[-*] |\d+\. |\||> )/.test(l);

  while (i < lines.length) {
    const l = lines[i];
    if (/^(```|~~~)/.test(l)) {
      const fence = l.slice(0, 3);
      const lang = l.slice(3).trim();
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith(fence)) code.push(lines[i++]);
      i++;
      html += `<pre class="code"><code>${highlight(code.join('\n'), lang)}</code></pre>`;
    } else if (/^#{1,4} /.test(l)) {
      const n = l.match(/^#+/)[0].length;
      html += `<h${n + 2}>${inline(l.slice(n + 1))}</h${n + 2}>`;
      i++;
    } else if (/^\s*[-*] /.test(l)) {
      html += '<ul>';
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) html += `<li>${inline(lines[i++].replace(/^\s*[-*] /, ''))}</li>`;
      html += '</ul>';
    } else if (/^\d+\. /.test(l)) {
      html += '<ol>';
      while (i < lines.length && /^\d+\. /.test(lines[i])) html += `<li>${inline(lines[i++].replace(/^\d+\. /, ''))}</li>`;
      html += '</ol>';
    } else if (l.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      const body = rows.filter((r) => !/^\|[\s|:-]+\|?$/.test(r)).map(splitRow);
      const [head, ...rest] = body;
      html += '<div class="table-wrap"><table><thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>'
        + rest.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>';
    } else if (l.startsWith('> ')) {
      const quote = [];
      while (i < lines.length && lines[i].startsWith('> ')) quote.push(lines[i++].slice(2));
      html += `<div class="tip">💡 ${inline(quote.join(' '))}</div>`;
    } else if (!l.trim()) {
      i++;
    } else {
      const para = [];
      while (i < lines.length && lines[i].trim() && !isSpecial(lines[i])) para.push(lines[i++]);
      html += `<p>${inline(para.join(' '))}</p>`;
    }
  }
  return html;
}
