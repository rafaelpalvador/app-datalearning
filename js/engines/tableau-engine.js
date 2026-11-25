// Motor da linguagem de cálculos do Tableau (subconjunto fiel), usado pela trilha de Tableau.
// Avalia campos calculados no nível de linha, agregados, expressões LOD (FIXED/INCLUDE/EXCLUDE)
// e cálculos de tabela (RUNNING_*, WINDOW_*, LOOKUP, RANK, INDEX, TOTAL...), respeitando a ordem
// de operações do Tableau: FIXED antes dos filtros de dimensão (a não ser que o filtro seja de contexto).
// Roda no navegador e no Node (validador).

export class TabError extends Error {}
const erro = (msg) => { throw new TabError(msg); };

// ─────────────────────────────── analisador léxico
const KEYWORDS = new Set(['IF', 'THEN', 'ELSEIF', 'ELSE', 'END', 'CASE', 'WHEN', 'AND', 'OR', 'NOT', 'TRUE', 'FALSE', 'NULL', 'FIXED', 'INCLUDE', 'EXCLUDE', 'IN']);

function tokenize(src) {
  const t = [];
  let i = 0;
  const s = String(src || '');
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && s[i + 1] === '/') { while (i < s.length && s[i] !== '\n') i++; continue; }
    if (c === '/' && s[i + 1] === '*') { const j = s.indexOf('*/', i + 2); if (j < 0) erro('Comentário /* sem o */ de fechamento.'); i = j + 2; continue; }
    if (c === '[') {
      let j = i + 1; let nome = '';
      for (;;) {
        if (j >= s.length) erro('Falta fechar o colchete "]" de um campo.');
        if (s[j] === ']' && s[j + 1] === ']') { nome += ']'; j += 2; continue; }
        if (s[j] === ']') break;
        nome += s[j++];
      }
      t.push({ k: 'field', v: nome.trim(), pos: i }); i = j + 1; continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1; let v = '';
      for (;;) {
        if (j >= s.length) erro('Texto sem as aspas de fechamento.');
        if (s[j] === c && s[j + 1] === c) { v += c; j += 2; continue; }
        if (s[j] === c) break;
        v += s[j++];
      }
      t.push({ k: 'str', v, pos: i }); i = j + 1; continue;
    }
    if (c === '#') {
      const j = s.indexOf('#', i + 1);
      if (j < 0) erro('Data literal sem o # de fechamento, como #2025-01-31#.');
      t.push({ k: 'date', v: parseData(s.slice(i + 1, j).trim()), pos: i }); i = j + 1; continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(s[i + 1]))) {
      const m = s.slice(i).match(/^\d*\.?\d+(?:[eE][+-]?\d+)?/);
      t.push({ k: 'num', v: Number(m[0]), pos: i }); i += m[0].length; continue;
    }
    if (/[A-Za-z_À-ÿ]/.test(c)) {
      const m = s.slice(i).match(/^[A-Za-z_À-ÿ][A-Za-z0-9_À-ÿ]*/);
      const up = m[0].toUpperCase();
      t.push(KEYWORDS.has(up) ? { k: 'kw', v: up, pos: i } : { k: 'id', v: up, raw: m[0], pos: i });
      i += m[0].length; continue;
    }
    const dois = s.slice(i, i + 2);
    if (['<=', '>=', '<>', '!=', '=='].includes(dois)) { t.push({ k: 'op', v: dois, pos: i }); i += 2; continue; }
    if ('+-*/%^()=<>,{}:'.includes(c)) { t.push({ k: 'op', v: c, pos: i }); i++; continue; }
    if (c === ';') erro('O Tableau não usa ";" no fim do cálculo. Apague o ponto e vírgula.');
    erro(`Caractere inesperado: "${c}"`);
  }
  t.push({ k: 'eof', pos: s.length });
  return t;
}

function parseData(txt) {
  const m = String(txt).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const b = String(txt).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (b) return new Date(Date.UTC(+b[3], +b[2] - 1, +b[1]));
  return null;
}

// ─────────────────────────────── analisador sintático
export function parseCalc(src) {
  const tk = tokenize(src);
  let p = 0;
  const peek = () => tk[p];
  const next = () => tk[p++];
  const isOp = (v) => peek().k === 'op' && peek().v === v;
  const isKw = (v) => peek().k === 'kw' && peek().v === v;
  const expectOp = (v, msg) => { if (!isOp(v)) erro(msg || `Esperava "${v}".`); next(); };
  const expectKw = (v, msg) => { if (!isKw(v)) erro(msg || `Esperava ${v}.`); next(); };

  function expr() { return orE(); }
  function orE() { let l = andE(); while (isKw('OR')) { next(); l = { t: 'bin', op: 'OR', l, r: andE() }; } return l; }
  function andE() { let l = notE(); while (isKw('AND')) { next(); l = { t: 'bin', op: 'AND', l, r: notE() }; } return l; }
  function notE() { if (isKw('NOT')) { next(); return { t: 'not', e: notE() }; } return cmp(); }
  function cmp() {
    const l = add();
    if (peek().k === 'op' && ['=', '==', '!=', '<>', '<', '<=', '>', '>='].includes(peek().v)) {
      let op = next().v; if (op === '==') op = '='; if (op === '!=') op = '<>';
      return { t: 'bin', op, l, r: add() };
    }
    if (isKw('IN')) {
      next(); expectOp('(', 'Depois de IN, abra parênteses: [Campo] IN ("A", "B").');
      const itens = [expr()];
      while (isOp(',')) { next(); itens.push(expr()); }
      expectOp(')');
      return { t: 'in', e: l, itens };
    }
    return l;
  }
  function add() { let l = mul(); while (isOp('+') || isOp('-')) { const op = next().v; l = { t: 'bin', op, l, r: mul() }; } return l; }
  function mul() { let l = unary(); while (isOp('*') || isOp('/') || isOp('%')) { const op = next().v; l = { t: 'bin', op, l, r: unary() }; } return l; }
  function unary() { if (isOp('-')) { next(); return { t: 'neg', e: unary() }; } if (isOp('+')) { next(); return unary(); } return pow(); }
  function pow() { const b = primary(); if (isOp('^')) { next(); return { t: 'bin', op: '^', l: b, r: unary() }; } return b; }
  function primary() {
    const tok = peek();
    if (tok.k === 'num') { next(); return { t: 'lit', v: tok.v }; }
    if (tok.k === 'str') { next(); return { t: 'lit', v: tok.v }; }
    if (tok.k === 'date') { next(); return { t: 'lit', v: tok.v }; }
    if (tok.k === 'field') { next(); return { t: 'field', nome: tok.v }; }
    if (tok.k === 'kw') {
      if (tok.v === 'TRUE' || tok.v === 'FALSE') { next(); return { t: 'lit', v: tok.v === 'TRUE' }; }
      if (tok.v === 'NULL') { next(); return { t: 'lit', v: null }; }
      if (tok.v === 'IF') return ifE();
      if (tok.v === 'CASE') return caseE();
      erro(`A palavra ${tok.v} não pode aparecer aqui.`);
    }
    if (tok.k === 'op' && tok.v === '(') { next(); const e = expr(); expectOp(')', 'Falta fechar um parêntese ")".'); return e; }
    if (tok.k === 'op' && tok.v === '{') return lod();
    if (tok.k === 'id') {
      next();
      if (!isOp('(')) erro(`"${tok.raw}" não é um campo nem uma função. Campos vão entre colchetes, como [${tok.raw}].`);
      next();
      const args = [];
      if (!isOp(')')) { args.push(expr()); while (isOp(',')) { next(); args.push(expr()); } }
      expectOp(')', `Falta fechar o parêntese de ${tok.v}(...).`);
      return { t: 'call', fn: tok.v, args };
    }
    if (tok.k === 'eof') erro('O cálculo terminou antes do esperado (falta um valor, um parêntese ou um END?).');
    erro(`Não esperava "${tok.v}" aqui.`);
  }
  function ifE() {
    next();
    const ramos = [];
    const c = expr(); expectKw('THEN', 'Depois da condição do IF vem THEN.'); ramos.push([c, expr()]);
    while (isKw('ELSEIF')) { next(); const c2 = expr(); expectKw('THEN', 'Depois da condição do ELSEIF vem THEN.'); ramos.push([c2, expr()]); }
    let senao = null;
    if (isKw('ELSE')) { next(); senao = expr(); }
    expectKw('END', 'Todo IF termina com END.');
    return { t: 'if', ramos, senao };
  }
  function caseE() {
    next();
    const alvo = expr();
    const ramos = [];
    while (isKw('WHEN')) { next(); const v = expr(); expectKw('THEN', 'Depois do WHEN vem THEN.'); ramos.push([v, expr()]); }
    if (!ramos.length) erro('O CASE precisa de pelo menos um WHEN.');
    let senao = null;
    if (isKw('ELSE')) { next(); senao = expr(); }
    expectKw('END', 'Todo CASE termina com END.');
    return { t: 'case', alvo, ramos, senao };
  }
  function lod() {
    next();
    let modo = 'FIXED';
    const dims = [];
    if (isKw('FIXED') || isKw('INCLUDE') || isKw('EXCLUDE')) {
      modo = next().v;
      if (!isOp(':')) { dims.push(expr()); while (isOp(',')) { next(); dims.push(expr()); } }
      expectOp(':', `Depois das dimensões do ${modo}, use ":" antes da agregação.`);
    }
    const e = expr();
    expectOp('}', 'A expressão LOD termina com "}".');
    return { t: 'lod', modo, dims, e };
  }
  const raiz = expr();
  if (peek().k !== 'eof') erro(`Sobrou texto depois do fim do cálculo, perto de "${peek().v ?? ''}". Faltou um operador?`);
  return raiz;
}

// ─────────────────────────────── classificação: linha, agregado ou constante
const AGG = new Set(['SUM', 'AVG', 'MIN', 'MAX', 'COUNT', 'COUNTD', 'MEDIAN', 'ATTR', 'STDEV', 'VAR', 'PERCENTILE']);
const TABLE = new Set(['RUNNING_SUM', 'RUNNING_AVG', 'RUNNING_MIN', 'RUNNING_MAX', 'RUNNING_COUNT', 'WINDOW_SUM', 'WINDOW_AVG', 'WINDOW_MIN', 'WINDOW_MAX', 'WINDOW_COUNT', 'WINDOW_MEDIAN', 'WINDOW_STDEV', 'WINDOW_VAR', 'LOOKUP', 'INDEX', 'FIRST', 'LAST', 'SIZE', 'RANK', 'RANK_DENSE', 'RANK_UNIQUE', 'RANK_PERCENTILE', 'TOTAL']);
const isAggCall = (n) => n.t === 'call' && AGG.has(n.fn) && !((n.fn === 'MIN' || n.fn === 'MAX') && n.args.length === 2);

function classificar(n, env, dentroAgg = false) {
  switch (n.t) {
    case 'lit': return 'const';
    case 'field': {
      const calc = env.calcs[n.nome];
      if (calc) return classificar(calc, env, dentroAgg);
      if (!(n.nome in env.amostra)) erro(`O campo [${n.nome}] não existe nesta fonte de dados. Confira o nome no painel de Dados.`);
      return 'row';
    }
    case 'lod': {
      for (const d of n.dims) if (classificar(d, env) === 'agg') erro('As dimensões de uma LOD não podem ser agregadas.');
      const k = classificar(n.e, env);
      if (k !== 'agg') erro('Dentro de uma expressão LOD, depois dos ":", o cálculo precisa ser agregado (SUM, MIN, COUNTD...).');
      return 'row';
    }
    case 'call': {
      if (isAggCall(n)) {
        if (dentroAgg) erro(`Não é possível agregar algo que já é agregado: ${n.fn} dentro de outra agregação.`);
        for (const a of n.args) {
          const k = classificar(a, env, true);
          if (k === 'agg') erro(`Não é possível agregar algo que já é agregado (o argumento de ${n.fn} já é uma agregação).`);
        }
        return 'agg';
      }
      if (TABLE.has(n.fn)) {
        if (dentroAgg) erro(`${n.fn} é um cálculo de tabela e não pode ficar dentro de uma agregação.`);
        for (const a of n.args) {
          const k = classificar(a, env);
          if (k === 'row' && !(a.t === 'lit')) erro(`Os argumentos de ${n.fn} precisam ser agregados, como ${n.fn}(SUM([Vendas])).`);
        }
        return 'agg';
      }
      return combinar(n.args.map((a) => classificar(a, env, dentroAgg)), n.fn);
    }
    case 'bin': return combinar([classificar(n.l, env, dentroAgg), classificar(n.r, env, dentroAgg)]);
    case 'not': case 'neg': return classificar(n.e, env, dentroAgg);
    case 'in': return combinar([n.e, ...n.itens].map((x) => classificar(x, env, dentroAgg)));
    case 'if': return combinar(n.ramos.flat().concat(n.senao ? [n.senao] : []).map((x) => classificar(x, env, dentroAgg)), 'IF');
    case 'case': return combinar([n.alvo, ...n.ramos.flat(), ...(n.senao ? [n.senao] : [])].map((x) => classificar(x, env, dentroAgg)), 'CASE');
    default: return 'row';
  }
}
function combinar(tipos) {
  const temAgg = tipos.includes('agg');
  const temLinha = tipos.includes('row');
  if (temAgg && temLinha) erro('Não é possível misturar argumentos agregados e não agregados. Agregue o campo (ex.: SUM([Vendas])) ou use ATTR([Campo]).');
  return temAgg ? 'agg' : temLinha ? 'row' : 'const';
}

// ─────────────────────────────── utilidades de valor
const isNum = (v) => typeof v === 'number' && !Number.isNaN(v);
const isDate = (v) => v instanceof Date;
const nulo = (v) => v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v));
const DIA = 86400000;
const fmtData = (d) => d.toISOString().slice(0, 10);
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
export const HOJE = new Date(Date.UTC(2025, 11, 31)); // TODAY() nos exercícios: 31/12/2025 (a base vai até 2025)

function parteData(parte, d) {
  const p = String(parte).toLowerCase();
  switch (p) {
    case 'year': return d.getUTCFullYear();
    case 'quarter': return Math.floor(d.getUTCMonth() / 3) + 1;
    case 'month': return d.getUTCMonth() + 1;
    case 'day': return d.getUTCDate();
    case 'weekday': return d.getUTCDay() + 1;
    case 'week': { const ini = Date.UTC(d.getUTCFullYear(), 0, 1); const wd = new Date(ini).getUTCDay(); return Math.floor((d - ini) / DIA + wd) / 7 + 1 | 0; }
    case 'dayofyear': return Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / DIA) + 1;
    default: erro(`Parte de data desconhecida: '${parte}'. Use 'year', 'quarter', 'month', 'week', 'day' ou 'weekday'.`);
  }
}
function truncData(parte, d) {
  const y = d.getUTCFullYear(); const m = d.getUTCMonth();
  switch (String(parte).toLowerCase()) {
    case 'year': return new Date(Date.UTC(y, 0, 1));
    case 'quarter': return new Date(Date.UTC(y, Math.floor(m / 3) * 3, 1));
    case 'month': return new Date(Date.UTC(y, m, 1));
    case 'week': return new Date(d.getTime() - d.getUTCDay() * DIA);
    case 'day': return new Date(Date.UTC(y, m, d.getUTCDate()));
    default: erro(`Parte de data desconhecida em DATETRUNC: '${parte}'.`);
  }
}
function somaData(parte, n, d) {
  const x = new Date(d.getTime());
  switch (String(parte).toLowerCase()) {
    case 'year': x.setUTCFullYear(x.getUTCFullYear() + n); return x;
    case 'quarter': x.setUTCMonth(x.getUTCMonth() + 3 * n); return x;
    case 'month': x.setUTCMonth(x.getUTCMonth() + n); return x;
    case 'week': return new Date(x.getTime() + 7 * n * DIA);
    case 'day': return new Date(x.getTime() + n * DIA);
    default: erro(`Parte de data desconhecida em DATEADD: '${parte}'.`);
  }
}
function difData(parte, a, b) {
  switch (String(parte).toLowerCase()) {
    case 'year': return b.getUTCFullYear() - a.getUTCFullYear();
    case 'quarter': return (b.getUTCFullYear() - a.getUTCFullYear()) * 4 + Math.floor(b.getUTCMonth() / 3) - Math.floor(a.getUTCMonth() / 3);
    case 'month': return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
    case 'week': return Math.round((truncData('week', b) - truncData('week', a)) / (7 * DIA));
    case 'day': return Math.round((truncData('day', b) - truncData('day', a)) / DIA);
    default: erro(`Parte de data desconhecida em DATEDIFF: '${parte}'.`);
  }
}

function comparar(a, b) {
  if (nulo(a) && nulo(b)) return 0;
  if (nulo(a)) return -1;
  if (nulo(b)) return 1;
  if (isDate(a) && isDate(b)) return a - b;
  if (isNum(a) && isNum(b)) return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return (a ? 1 : 0) - (b ? 1 : 0);
  return String(a).localeCompare(String(b), 'pt-BR');
}

const mediana = (xs) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; if (!n) return null; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const percentil = (xs, p) => { const s = [...xs].sort((a, b) => a - b); if (!s.length) return null; const h = (s.length - 1) * p; const lo = Math.floor(h); return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (h - lo); };

function agregar(fn, vals, extra) {
  const v = vals.filter((x) => !nulo(x));
  switch (fn) {
    case 'SUM': if (!v.length) return null; if (!v.every(isNum)) erro('SUM só funciona com números.'); return v.reduce((a, b) => a + b, 0);
    case 'AVG': if (!v.length) return null; if (!v.every(isNum)) erro('AVG só funciona com números.'); return v.reduce((a, b) => a + b, 0) / v.length;
    case 'MIN': return v.length ? v.reduce((a, b) => (comparar(a, b) <= 0 ? a : b)) : null;
    case 'MAX': return v.length ? v.reduce((a, b) => (comparar(a, b) >= 0 ? a : b)) : null;
    case 'COUNT': return v.length;
    case 'COUNTD': return new Set(v.map((x) => (isDate(x) ? x.getTime() : x))).size;
    case 'MEDIAN': return mediana(v);
    case 'ATTR': { if (!v.length) return null; const um = v[0]; return v.every((x) => comparar(x, um) === 0) ? um : '*'; }
    case 'STDEV': case 'VAR': {
      if (v.length < 2) return null;
      const m = v.reduce((a, b) => a + b, 0) / v.length;
      const s2 = v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1);
      return fn === 'VAR' ? s2 : Math.sqrt(s2);
    }
    case 'PERCENTILE': return percentil(v, extra);
    default: return null;
  }
}

// ─────────────────────────────── avaliação
const num = (v, fn) => { if (nulo(v)) return null; if (typeof v === 'boolean') return v ? 1 : 0; if (!isNum(v)) erro(`${fn} espera um número.`); return v; };
const txt = (v) => (nulo(v) ? null : isDate(v) ? fmtData(v) : String(v));

function aplicarFuncao(fn, a, args) {
  switch (fn) {
    // lógicas e nulos
    case 'IIF': { const c = a[0]; if (nulo(c)) return a.length > 3 ? a[3] : null; return c ? a[1] : a[2]; }
    case 'ZN': return nulo(a[0]) ? 0 : a[0];
    case 'IFNULL': return nulo(a[0]) ? a[1] : a[0];
    case 'ISNULL': return nulo(a[0]);
    // números
    case 'ABS': return a[0] === null ? null : Math.abs(num(a[0], fn));
    case 'ROUND': { if (nulo(a[0])) return null; const d = a[1] ?? 0; const f = 10 ** d; return Math.round(num(a[0], fn) * f + Math.sign(a[0]) * 1e-9) / f; }
    case 'CEILING': return nulo(a[0]) ? null : Math.ceil(num(a[0], fn));
    case 'FLOOR': return nulo(a[0]) ? null : Math.floor(num(a[0], fn));
    case 'SQRT': return nulo(a[0]) ? null : Math.sqrt(num(a[0], fn));
    case 'POWER': return nulo(a[0]) ? null : num(a[0], fn) ** num(a[1], fn);
    case 'EXP': return nulo(a[0]) ? null : Math.exp(num(a[0], fn));
    case 'LN': return nulo(a[0]) || a[0] <= 0 ? null : Math.log(num(a[0], fn));
    case 'LOG': return nulo(a[0]) || a[0] <= 0 ? null : Math.log(num(a[0], fn)) / Math.log(a[1] ?? 10);
    case 'SIGN': return nulo(a[0]) ? null : Math.sign(num(a[0], fn));
    case 'DIV': return nulo(a[0]) || nulo(a[1]) || a[1] === 0 ? null : Math.trunc(a[0] / a[1]);
    case 'MIN': return nulo(a[0]) || nulo(a[1]) ? null : (comparar(a[0], a[1]) <= 0 ? a[0] : a[1]);
    case 'MAX': return nulo(a[0]) || nulo(a[1]) ? null : (comparar(a[0], a[1]) >= 0 ? a[0] : a[1]);
    // conversões
    case 'STR': return txt(a[0]);
    case 'INT': return nulo(a[0]) ? null : Math.trunc(typeof a[0] === 'string' ? Number(a[0].replace(',', '.')) : num(a[0], fn));
    case 'FLOAT': return nulo(a[0]) ? null : (typeof a[0] === 'string' ? Number(a[0].replace(',', '.')) : num(a[0], fn));
    case 'DATE': return nulo(a[0]) ? null : isDate(a[0]) ? truncData('day', a[0]) : parseData(a[0]);
    case 'MAKEDATE': return nulo(a[0]) ? null : new Date(Date.UTC(a[0], a[1] - 1, a[2]));
    // texto
    case 'LEN': return nulo(a[0]) ? null : txt(a[0]).length;
    case 'UPPER': return nulo(a[0]) ? null : txt(a[0]).toUpperCase();
    case 'LOWER': return nulo(a[0]) ? null : txt(a[0]).toLowerCase();
    case 'TRIM': return nulo(a[0]) ? null : txt(a[0]).trim();
    case 'LTRIM': return nulo(a[0]) ? null : txt(a[0]).replace(/^\s+/, '');
    case 'RTRIM': return nulo(a[0]) ? null : txt(a[0]).replace(/\s+$/, '');
    case 'LEFT': return nulo(a[0]) ? null : txt(a[0]).slice(0, Math.max(0, a[1]));
    case 'RIGHT': return nulo(a[0]) ? null : (a[1] <= 0 ? '' : txt(a[0]).slice(-a[1]));
    case 'MID': { if (nulo(a[0])) return null; const s = txt(a[0]); const ini = Math.max(0, a[1] - 1); return a.length > 2 ? s.substr(ini, a[2]) : s.slice(ini); }
    case 'CONTAINS': return nulo(a[0]) ? null : txt(a[0]).includes(txt(a[1]));
    case 'STARTSWITH': return nulo(a[0]) ? null : txt(a[0]).startsWith(txt(a[1]));
    case 'ENDSWITH': return nulo(a[0]) ? null : txt(a[0]).endsWith(txt(a[1]));
    case 'FIND': return nulo(a[0]) ? null : txt(a[0]).indexOf(txt(a[1])) + 1;
    case 'REPLACE': return nulo(a[0]) ? null : txt(a[0]).split(txt(a[1])).join(txt(a[2]));
    case 'SPLIT': {
      if (nulo(a[0])) return null;
      const partes = txt(a[0]).split(txt(a[1])); const n = a[2];
      const p = n > 0 ? partes[n - 1] : partes[partes.length + n];
      return p === undefined ? '' : p;
    }
    // datas
    case 'YEAR': return nulo(a[0]) ? null : a[0].getUTCFullYear();
    case 'QUARTER': return nulo(a[0]) ? null : parteData('quarter', a[0]);
    case 'MONTH': return nulo(a[0]) ? null : a[0].getUTCMonth() + 1;
    case 'DAY': return nulo(a[0]) ? null : a[0].getUTCDate();
    case 'DATEPART': return nulo(a[1]) ? null : parteData(a[0], a[1]);
    case 'DATENAME': {
      if (nulo(a[1])) return null;
      const p = String(a[0]).toLowerCase();
      if (p === 'month') return MESES[a[1].getUTCMonth()];
      if (p === 'weekday') return DIAS_SEMANA[a[1].getUTCDay()];
      return String(parteData(p, a[1]));
    }
    case 'DATETRUNC': return nulo(a[1]) ? null : truncData(a[0], a[1]);
    case 'DATEADD': return nulo(a[2]) ? null : somaData(a[0], a[1], a[2]);
    case 'DATEDIFF': return nulo(a[1]) || nulo(a[2]) ? null : difData(a[0], a[1], a[2]);
    case 'TODAY': return HOJE;
    // trigonometria (gráficos radiais, Sankey, distâncias)
    case 'PI': return Math.PI;
    case 'SIN': return nulo(a[0]) ? null : Math.sin(num(a[0], fn));
    case 'COS': return nulo(a[0]) ? null : Math.cos(num(a[0], fn));
    case 'TAN': return nulo(a[0]) ? null : Math.tan(num(a[0], fn));
    case 'ASIN': return nulo(a[0]) ? null : Math.asin(num(a[0], fn));
    case 'ACOS': return nulo(a[0]) ? null : Math.acos(Math.max(-1, Math.min(1, num(a[0], fn))));
    case 'ATAN': return nulo(a[0]) ? null : Math.atan(num(a[0], fn));
    case 'ATAN2': return nulo(a[0]) || nulo(a[1]) ? null : Math.atan2(num(a[0], fn), num(a[1], fn));
    case 'RADIANS': return nulo(a[0]) ? null : num(a[0], fn) * Math.PI / 180;
    case 'DEGREES': return nulo(a[0]) ? null : num(a[0], fn) * 180 / Math.PI;
    case 'SQUARE': return nulo(a[0]) ? null : num(a[0], fn) ** 2;
    default: erro(`A função ${fn}() não existe no Tableau (ou não está disponível nesta prática). Confira o nome.`);
  }
}

function binario(op, l, r) {
  if (op === 'AND') return l === false || r === false ? false : nulo(l) || nulo(r) ? null : !!(l && r);
  if (op === 'OR') return l === true || r === true ? true : nulo(l) || nulo(r) ? null : !!(l || r);
  if (nulo(l) || nulo(r)) return null;
  switch (op) {
    case '+':
      if (typeof l === 'string' && typeof r === 'string') return l + r;
      if (typeof l === 'string' || typeof r === 'string') erro('Não dá para juntar texto com número usando "+". Converta o número com STR(): "Ano " + STR([Ano]).');
      if (isDate(l) && isNum(r)) return new Date(l.getTime() + r * DIA);
      return num(l, '+') + num(r, '+');
    case '-':
      if (isDate(l) && isDate(r)) return (l - r) / DIA;
      if (isDate(l) && isNum(r)) return new Date(l.getTime() - r * DIA);
      return num(l, '-') - num(r, '-');
    case '*': return num(l, '*') * num(r, '*');
    case '/': return r === 0 ? null : num(l, '/') / num(r, '/');
    case '%': return r === 0 ? null : num(l, '%') % num(r, '%');
    case '^': return num(l, '^') ** num(r, '^');
    case '=': return comparar(l, r) === 0;
    case '<>': return comparar(l, r) !== 0;
    case '<': return comparar(l, r) < 0;
    case '<=': return comparar(l, r) <= 0;
    case '>': return comparar(l, r) > 0;
    case '>=': return comparar(l, r) >= 0;
    default: return null;
  }
}

// ctx: { tipo: 'linha', row } | { tipo: 'marca', rows, part, idx }
function avaliar(n, ctx, env) {
  switch (n.t) {
    case 'lit': return n.v;
    case 'field': {
      const calc = env.calcs[n.nome];
      if (calc) return avaliar(calc, ctx, env);
      if (ctx.tipo !== 'linha') erro(`O campo [${n.nome}] precisa estar dentro de uma agregação aqui.`);
      return ctx.row[n.nome];
    }
    case 'neg': { const v = avaliar(n.e, ctx, env); return nulo(v) ? null : -num(v, '-'); }
    case 'not': { const v = avaliar(n.e, ctx, env); return nulo(v) ? null : !v; }
    case 'bin': return binario(n.op, avaliar(n.l, ctx, env), avaliar(n.r, ctx, env));
    case 'in': { const v = avaliar(n.e, ctx, env); if (nulo(v)) return null; return n.itens.some((x) => comparar(v, avaliar(x, ctx, env)) === 0); }
    case 'if': {
      for (const [c, r] of n.ramos) if (avaliar(c, ctx, env) === true) return avaliar(r, ctx, env);
      return n.senao ? avaliar(n.senao, ctx, env) : null;
    }
    case 'case': {
      const v = avaliar(n.alvo, ctx, env);
      for (const [w, r] of n.ramos) if (comparar(v, avaliar(w, ctx, env)) === 0 && !nulo(v)) return avaliar(r, ctx, env);
      return n.senao ? avaliar(n.senao, ctx, env) : null;
    }
    case 'lod': return valorLod(n, ctx, env);
    case 'call': return chamar(n, ctx, env);
    default: return null;
  }
}

function chamar(n, ctx, env) {
  if (isAggCall(n)) {
    if (ctx.tipo === 'linha') erro(`${n.fn} é uma agregação e não pode ser usada num cálculo de nível de linha aqui.`);
    const vals = ctx.rows.map((row) => avaliar(n.args[0], { tipo: 'linha', row }, env));
    const extra = n.fn === 'PERCENTILE' ? avaliar(n.args[1], ctx, env) : undefined;
    return agregar(n.fn, vals, extra);
  }
  if (TABLE.has(n.fn)) return calcTabela(n, ctx, env);
  if (n.fn === 'USERNAME') return env.usuario.login;
  if (n.fn === 'FULLNAME') return env.usuario.nome;
  if (n.fn === 'ISMEMBEROF') return env.usuario.grupos.includes(avaliar(n.args[0], ctx, env));
  const a = n.args.map((x) => avaliar(x, ctx, env));
  return aplicarFuncao(n.fn, a, n.args);
}

function calcTabela(n, ctx, env) {
  if (ctx.tipo !== 'marca' || !ctx.part) erro(`${n.fn} é um cálculo de tabela: só funciona numa visualização (com dimensões nas prateleiras).`);
  const { part, idx } = ctx;
  const N = part.length;
  const val = (j) => avaliar(n.args[0], { tipo: 'marca', rows: part[j].rows, part, idx: j }, env);
  const arg = (k, padrao) => (n.args[k] ? avaliar(n.args[k], ctx, env) : padrao);
  switch (n.fn) {
    case 'INDEX': return idx + 1;
    case 'SIZE': return N;
    case 'FIRST': return -idx;
    case 'LAST': return N - 1 - idx;
    case 'LOOKUP': { const j = idx + (arg(1, 0) || 0); return j < 0 || j >= N ? null : val(j); }
    case 'TOTAL': return avaliar(n.args[0], { tipo: 'marca', rows: part.flatMap((m) => m.rows), part, idx }, env);
    case 'RUNNING_SUM': case 'RUNNING_AVG': case 'RUNNING_MIN': case 'RUNNING_MAX': case 'RUNNING_COUNT': {
      const vs = []; for (let j = 0; j <= idx; j++) vs.push(val(j));
      return agregar({ RUNNING_SUM: 'SUM', RUNNING_AVG: 'AVG', RUNNING_MIN: 'MIN', RUNNING_MAX: 'MAX', RUNNING_COUNT: 'COUNT' }[n.fn], vs);
    }
    case 'WINDOW_SUM': case 'WINDOW_AVG': case 'WINDOW_MIN': case 'WINDOW_MAX': case 'WINDOW_COUNT': case 'WINDOW_MEDIAN': case 'WINDOW_STDEV': case 'WINDOW_VAR': {
      const ini = Math.max(0, idx + (n.args[1] ? arg(1) : -idx));
      const fim = Math.min(N - 1, idx + (n.args[2] ? arg(2) : N - 1 - idx));
      const vs = []; for (let j = ini; j <= fim; j++) vs.push(val(j));
      return agregar(n.fn.replace('WINDOW_', ''), vs);
    }
    case 'RANK': case 'RANK_DENSE': case 'RANK_UNIQUE': case 'RANK_PERCENTILE': {
      const ordem = String(arg(1, 'desc')).toLowerCase() === 'asc' ? 1 : -1;
      const vs = part.map((_, j) => val(j));
      const meu = vs[idx];
      if (nulo(meu)) return null;
      const validos = vs.filter((v) => !nulo(v));
      if (n.fn === 'RANK') return validos.filter((v) => comparar(v, meu) * ordem < 0).length + 1;
      if (n.fn === 'RANK_DENSE') return new Set(validos.filter((v) => comparar(v, meu) * ordem < 0)).size + 1;
      if (n.fn === 'RANK_UNIQUE') return vs.filter((v, j) => !nulo(v) && (comparar(v, meu) * ordem < 0 || (comparar(v, meu) === 0 && j < idx))).length + 1;
      const abaixo = validos.filter((v) => comparar(v, meu) * -ordem < 0).length;
      return validos.length > 1 ? abaixo / (validos.length - 1) : 1;
    }
    default: return null;
  }
}

const chaveDe = (vals) => JSON.stringify(vals.map((v) => (isDate(v) ? `d${v.getTime()}` : v)));

function valorLod(n, ctx, env) {
  if (ctx.tipo !== 'linha') {
    // LOD usada como valor agregado de marca (ex.: dentro de IF agregado): pega o valor das linhas da marca
    const vs = ctx.rows.map((row) => valorLod(n, { tipo: 'linha', row }, env));
    return agregar('ATTR', vs);
  }
  let dims = n.dims;
  if (n.modo === 'INCLUDE') dims = [...env.vizDims.map((d) => ({ t: 'field', nome: d })), ...n.dims];
  if (n.modo === 'EXCLUDE') {
    const tirar = new Set(n.dims.map((d) => (d.t === 'field' ? d.nome : JSON.stringify(d))));
    dims = env.vizDims.filter((d) => !tirar.has(d)).map((d) => ({ t: 'field', nome: d }));
  }
  const base = n.modo === 'FIXED' ? env.dadosFixed : env.dados;
  if (!env.lodCache.has(n)) env.lodCache.set(n, new Map());
  const cache = env.lodCache.get(n);
  if (!cache.size) {
    const grupos = new Map();
    for (const row of base) {
      const k = chaveDe(dims.map((d) => avaliar(d, { tipo: 'linha', row }, env)));
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k).push(row);
    }
    for (const [k, rows] of grupos) cache.set(k, avaliar(n.e, { tipo: 'marca', rows, part: null, idx: 0 }, env));
  }
  const k = chaveDe(dims.map((d) => avaliar(d, { tipo: 'linha', row: ctx.row }, env)));
  return cache.has(k) ? cache.get(k) : null;
}

// ─────────────────────────────── execução de um exercício
/**
 * Executa um cálculo como o Tableau faria numa visualização.
 * opts:
 *  - dados: linhas da fonte
 *  - calc: texto do campo calculado; nome: nome da coluna resultante
 *  - dims: dimensões nas prateleiras (nomes de campos ou de campos calculados auxiliares), ou 'linha'
 *  - campos: { nome: 'expressão' } campos calculados auxiliares
 *  - filtro: { expr, contexto } filtro de dimensão (contexto = true roda antes das FIXED)
 *  - particao: dimensões que REINICIAM os cálculos de tabela (o resto é a direção)
 *  - mostrar: colunas extras no modo 'linha'
 */
export function runTableau({ dados, calc, nome = 'Cálculo', dims = [], campos = {}, filtro = null, particao = [], mostrar = [], usuario = null, ordenar = null, filtroTabela = null }) {
  if (!String(calc || '').trim()) erro('Escreva o cálculo no editor.');
  const amostra = dados[0] || {};
  const env = { calcs: {}, amostra, vizDims: dims === 'linha' ? [] : dims, lodCache: new Map(), dados, dadosFixed: dados, usuario: { login: 'ana.souza', nome: 'Ana Souza', grupos: [], ...(usuario || {}) } };
  for (const [k, src] of Object.entries(campos)) env.calcs[k] = parseCalc(src);
  const raiz = parseCalc(calc);
  const tipo = classificar(raiz, env);

  // filtros: o de contexto vale também para as FIXED; o de dimensão, só depois delas
  let filtrados = dados;
  if (filtro?.expr) {
    const f = parseCalc(filtro.expr);
    filtrados = dados.filter((row) => avaliar(f, { tipo: 'linha', row }, env) === true);
    if (filtro.contexto) env.dadosFixed = filtrados;
  }
  env.dados = filtrados;

  if (dims === 'linha') {
    if (tipo === 'agg') erro('Este exercício é no nível de linha (cada linha da base): não use agregações como SUM aqui.');
    const values = filtrados.map((row) => [...mostrar.map((m) => normalizar(avaliar({ t: 'field', nome: m }, { tipo: 'linha', row }, env))), normalizar(avaliar(raiz, { tipo: 'linha', row }, env))]);
    return { columns: [...mostrar, nome], values, linhas: true };
  }

  // monta as marcas (uma por combinação de dimensões), ordenadas como no Tableau
  for (const d of dims) if (!(d in amostra) && !env.calcs[d]) erro(`A dimensão [${d}] não existe.`);
  const grupos = new Map();
  for (const row of filtrados) {
    const vals = dims.map((d) => avaliar({ t: 'field', nome: d }, { tipo: 'linha', row }, env));
    const k = chaveDe(vals);
    if (!grupos.has(k)) grupos.set(k, { vals, rows: [] });
    grupos.get(k).rows.push(row);
  }
  const marcas = [...grupos.values()].sort((a, b) => {
    for (let i = 0; i < dims.length; i++) { const c = comparar(a.vals[i], b.vals[i]); if (c) return c; }
    return 0;
  });
  // ordenação pela medida (ex.: Pareto): muda a ordem das marcas e, com ela, a direção dos cálculos de tabela
  if (ordenar?.expr) {
    const o = parseCalc(ordenar.expr);
    if (classificar(o, env) !== 'agg') erro('A ordenação precisa ser por uma expressão agregada.');
    const chaveOrd = new Map(marcas.map((m) => [m, avaliar(o, { tipo: 'marca', rows: m.rows, part: null, idx: 0 }, env)]));
    const sinal = ordenar.asc ? 1 : -1;
    marcas.sort((a, b) => sinal * comparar(chaveOrd.get(a), chaveOrd.get(b)));
  }
  // partições dos cálculos de tabela
  const idxPart = particao.map((p) => dims.indexOf(p));
  const parts = new Map();
  for (const m of marcas) {
    const k = chaveDe(idxPart.map((i) => m.vals[i]));
    if (!parts.has(k)) parts.set(k, []);
    parts.get(k).push(m);
  }
  const medida = tipo === 'row'
    ? { t: 'call', fn: typeof avaliar(raiz, { tipo: 'linha', row: filtrados[0] || amostra }, env) === 'number' ? 'SUM' : 'ATTR', args: [raiz] }
    : raiz;
  // filtro de cálculo de tabela: roda por último e só ESCONDE marcas (os cálculos continuam vendo todas)
  const filtroTab = filtroTabela ? parseCalc(filtroTabela) : null;
  const values = [];
  for (const m of marcas) {
    const part = parts.get(chaveDe(idxPart.map((i) => m.vals[i])));
    const ctx = { tipo: 'marca', rows: m.rows, part, idx: part.indexOf(m) };
    if (filtroTab && avaliar(filtroTab, ctx, env) !== true) continue;
    values.push([...m.vals.map(normalizar), normalizar(avaliar(medida, ctx, env))]);
  }
  return { columns: [...dims, nome], values, agregado: tipo === 'row' ? medida.fn : null };
}

function normalizar(v) {
  if (nulo(v)) return null;
  if (isDate(v)) return fmtData(v);
  if (typeof v === 'number') return Math.abs(v) < 1e-12 ? 0 : v;
  return v;
}

/** Compara o resultado do aluno com o esperado. */
export function compararTableau(got, exp) {
  if (got.values.length !== exp.values.length) {
    return { ok: false, reason: `A visualização ficou com ${got.values.length} ${got.values.length === 1 ? 'marca' : 'marcas'}, mas o esperado são ${exp.values.length}.` };
  }
  for (let i = 0; i < exp.values.length; i++) {
    const a = got.values[i]; const b = exp.values[i];
    for (let j = 0; j < b.length; j++) {
      const x = a[j]; const y = b[j];
      const igual = (typeof x === 'number' && typeof y === 'number')
        ? Math.abs(x - y) <= 1e-6 * Math.max(1, Math.abs(y))
        : x === y;
      if (!igual) {
        const rotulo = exp.linhas ? `na linha ${i + 1} da base` : `na marca ${exp.values[i].slice(0, -1).join(' · ') || i + 1}`;
        return { ok: false, reason: `Valor diferente ${rotulo}: esperado ${formatar(y)}, saiu ${formatar(x)}.` };
      }
    }
  }
  return { ok: true };
}

export const formatar = (v) => (v === null || v === undefined ? 'Nulo' : typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2)) : typeof v === 'boolean' ? (v ? 'Verdadeiro' : 'Falso') : String(v));

/** Avalia um exercício: roda a solução e o código do aluno no mesmo cenário. */
export function avaliarTableau(step, codigo, dados) {
  const cenario = { dados, nome: step.nome || 'Cálculo', dims: step.dims ?? [], campos: step.campos || {}, filtro: step.filtro || null, particao: step.particao || [], mostrar: step.mostrar || [], usuario: step.usuario || null, ordenar: step.ordenar || null, filtroTabela: step.filtroTabela || null };
  let got;
  try { got = runTableau({ ...cenario, calc: codigo }); }
  catch (e) { return { ok: false, error: true, reason: e instanceof TabError ? e.message : `Erro no cálculo: ${e.message}` }; }
  const exp = runTableau({ ...cenario, calc: step.solution });
  return { ...compararTableau(got, exp), got, expected: exp };
}
