// Auditoria pedagógica: todo exercício deve vir DEPOIS de uma teoria que explique o que ele cobra.
// Percorre as trilhas na ordem do aluno e lista, para cada exercício, os termos técnicos
// (palavras-chave e funções SQL, métodos/funções Python) que ainda não apareceram em nenhum card de teoria.
//
// uso: node scripts/audit-theory.mjs            → relatório completo
//      node scripts/audit-theory.mjs --check    → sai com erro se houver lacunas (usado no validate)
import { COURSES } from '../js/content/index.js';

const SQL_TERMS = ['SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET', 'DISTINCT', 'AS', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'IS NULL', 'IS NOT NULL', 'COALESCE', 'NULLIF', 'CASE', 'WHEN', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ROUND', 'UPPER', 'LOWER', 'LENGTH', 'SUBSTR', 'REPLACE', 'TRIM', 'CAST', 'JOIN', 'LEFT JOIN', 'INNER JOIN', 'CROSS JOIN', 'ON', 'UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT', 'EXISTS', 'NOT EXISTS', 'WITH', 'RECURSIVE', 'OVER', 'PARTITION BY', 'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE', 'LAG', 'LEAD', 'ROWS BETWEEN', 'PRECEDING', 'UNBOUNDED', 'CURRENT ROW', 'strftime', 'date(', 'julianday', 'INSERT', 'UPDATE', 'DELETE', 'CREATE TABLE', 'CREATE VIEW', 'CREATE INDEX', 'PRIMARY KEY', 'NOT NULL', 'ON CONFLICT', 'json_each', 'json_extract', 'median', 'SQRT', 'WINDOW', '||', 'ASC', 'DESC'];

const PY_IGNORE = new Set(['append', 'items', 'keys', 'values', 'get', 'sum', 'len', 'print', 'range', 'round', 'abs', 'max', 'min', 'list', 'dict', 'set', 'int', 'float', 'str', 'sorted', 'enumerate', 'zip', 'isinstance', 'type', 'iloc', 'loc', 'copy', 'to_numpy', 'tolist', 'astype', 'lower', 'strip', 'title', 'split', 'replace', 'join', 'format', 'extend', 'array', 'mean', 'std', 'count', 'reset_index', 'head', 'shape', 'columns', 'index', 'DataFrame', 'Series', 'any', 'all', 'update', 'pop', 'setdefault', 'insert', 'ones', 'zeros', 'arange', 'sqrt', 'exp', 'log', 'super', 'next', 'iter', 'map', 'filter', 'repr', 'bool', 'tuple', 'open', 'read', 'self', 'value', 'name', 'reshape', 'dtype', 'T']);

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function sqlTermsIn(code) {
  const up = ' ' + code.replace(/'[^']*'/g, "''").replace(/\s+/g, ' ').toUpperCase() + ' ';
  return SQL_TERMS.filter((t) => {
    const T = t.toUpperCase();
    if (/^[A-Z_ ]+$/.test(T)) return new RegExp(`[^A-Z_]${T.replace(/ /g, '\\s+')}[^A-Z_]`).test(up);
    return up.includes(T);
  });
}

function pyTermsIn(code) {
  const terms = new Set();
  const clean = code.replace(/(["'])(?:(?!\1).)*\1/g, '""');
  for (const m of clean.matchAll(/\.([a-zA-Z_]\w*)\s*\(/g)) terms.add(m[1]);
  for (const m of clean.matchAll(/\b(np|pd|re|json|io|math|rng)\.([a-zA-Z_]\w*)/g)) terms.add(m[2]);
  for (const m of clean.matchAll(/\b(yield|lambda|class|dataclass|property|try|except|raise|while|global|with)\b/g)) terms.add(m[1]);
  return [...terms].filter((t) => !PY_IGNORE.has(t));
}

function inTheory(term, theoryNorm, theoryUp) {
  if (/^[A-Z_ (|]+$/.test(term) || term === '||') return theoryUp.includes(term.toUpperCase());
  return theoryNorm.includes(norm(term));
}

const report = [];
let theoryText = '';
const unescape = (s) => s.replace(/\\(.)/g, '$1');
for (const course of COURSES) {
  // cada trilha acumula a sua teoria; Estatística herda a de Python (pré-requisito declarado)
  if (course.id !== 'stats') theoryText = course.id === 'sql' ? '' : theoryText;
  for (const unit of course.units) {
    for (const lesson of unit.lessons) {
      lesson.steps.forEach((step, i) => {
        if (step.type === 'theory') { theoryText += '\n' + step.title + '\n' + unescape(step.md); return; }
        if (step.type === 'example') { theoryText += '\n' + step.title + '\n' + unescape(step.md) + '\n' + step.code + '\n' + unescape(step.after); return; }
        const tNorm = norm(theoryText);
        const tUp = theoryText.toUpperCase();
        let terms = [];
        if (step.type === 'sql') terms = sqlTermsIn(step.solution);
        else if (step.type === 'python') terms = pyTermsIn(step.solution);
        else if (step.type === 'quiz' || step.type === 'order' || step.type === 'fill') {
          const txt = [step.question, step.prompt, step.code, ...(step.options || []), ...(step.tokens || [])].filter(Boolean).join(' ');
          const backticks = [...txt.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
          terms = [...sqlTermsIn(step.code || ''), ...sqlTermsIn((step.tokens || []).join(' ')), ...backticks.flatMap((b) => pyTermsIn(b))];
        }
        const missing = [...new Set(terms)].filter((t) => !inTheory(t, tNorm, tUp));
        const noTheoryYet = !lesson.steps.slice(0, i).some((s) => s.type === 'theory' || s.type === 'example');
        if (missing.length || noTheoryYet) report.push({ where: `${lesson.id} #${i + 1} ${step.type}`, title: lesson.title, missing, noTheoryYet });
      });
    }
  }
}

if (process.argv.includes('--check')) {
  if (report.length) {
    console.error(`❌ Teoria antes da prática: ${report.length} exercício(s) cobram algo ainda não explicado:\n- ` + report.map((r) => `${r.where} (${r.title}): ${r.noTheoryYet ? 'sem teoria antes; ' : ''}${r.missing.join(', ')}`).join('\n- '));
    process.exit(1);
  }
  console.log('✅ Teoria antes da prática: todos os exercícios são precedidos pela teoria que cobram');
} else {
  for (const r of report) console.log(`${r.where.padEnd(24)} ${r.noTheoryYet ? '[SEM TEORIA ANTES] ' : ''}${r.missing.join(', ')}   — ${r.title}`);
  console.log(`\n${report.length} exercícios com lacunas`);
}
