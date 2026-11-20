// Núcleo do motor PostgreSQL (PGlite), usado pelo worker do app e pelo validador em Node.
// Não depende do navegador: recebe uma instância de banco já pronta.
import { compareResults } from './sql-engine.js';

// Comandos que não podem rodar dentro da transação de "caixa de areia" do corretor
// (controle de transação, VACUUM, operações CONCURRENTLY...). Esses rodam numa cópia descartável do banco.
const NEEDS_FRESH = /\b(COMMIT|ROLLBACK|END\s*;|START\s+TRANSACTION|BEGIN\s*(;|TRANSACTION|WORK|ISOLATION)|SAVEPOINT|RELEASE\s+SAVEPOINT|PREPARE\s+TRANSACTION|VACUUM|CONCURRENTLY|CREATE\s+DATABASE|ALTER\s+SYSTEM|CHECKPOINT)\b/i;
export const needsFresh = (sql) => NEEDS_FRESH.test(String(sql || '').replace(/--[^\n]*/g, '').replace(/'(?:[^']|'')*'/g, "''"));

// Converte valores do PostgreSQL para algo comparável e exibível
function norm(v, typeId) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'bigint') return Number(v);
  if (v instanceof Date) {
    if (isNaN(v)) return String(v);
    if (typeId === 1082) return v.toISOString().slice(0, 10); // date
    return v.toISOString().replace('T', ' ').replace(/\.000Z$|Z$/, '').replace(/\.(\d{3})$/, '.$1');
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

/** Divide um script em comandos, respeitando strings, identificadores, comentários e blocos $tag$. */
export function splitSql(sql) {
  const out = [];
  let cur = '';
  let i = 0;
  const s = String(sql || '');
  while (i < s.length) {
    const c = s[i];
    const two = s.slice(i, i + 2);
    if (two === '--') { const j = s.indexOf('\n', i); const end = j < 0 ? s.length : j; cur += s.slice(i, end); i = end; continue; }
    if (two === '/*') { const j = s.indexOf('*/', i + 2); const end = j < 0 ? s.length : j + 2; cur += s.slice(i, end); i = end; continue; }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < s.length) { if (s[j] === c) { if (s[j + 1] === c) { j += 2; continue; } break; } j++; }
      cur += s.slice(i, j + 1); i = j + 1; continue;
    }
    if (c === '$') {
      const m = s.slice(i).match(/^\$[A-Za-z_]*\$/);
      if (m) { const j = s.indexOf(m[0], i + m[0].length); const end = j < 0 ? s.length : j + m[0].length; cur += s.slice(i, end); i = end; continue; }
    }
    if (c === ';') { if (cur.trim()) out.push(cur.trim()); cur = ''; i++; continue; }
    cur += c; i++;
  }
  if (cur.trim() && cur.replace(/--[^\n]*/g, '').trim()) out.push(cur.trim());
  return out;
}

/** Executa um ou mais comandos e devolve o resultado do ÚLTIMO comando que retornou colunas.
 *  separado = true roda comando a comando (fora do bloco implícito), necessário para VACUUM e afins. */
export async function runSql(db, sql, separado = false) {
  let results;
  if (separado) {
    results = [];
    for (const stmt of splitSql(sql)) results.push(...await db.exec(stmt, { rowMode: 'array' }));
  } else {
    results = await db.exec(sql, { rowMode: 'array' });
  }
  let last = null;
  for (const r of results) if (r.fields?.length) last = r;
  if (!last) return { columns: [], values: [], affected: results.reduce((a, r) => a + (r.affectedRows || 0), 0) };
  return {
    columns: last.fields.map((f) => f.name),
    values: last.rows.map((row) => row.map((v, i) => norm(v, last.fields[i].dataTypeID))),
  };
}

/** Roda dentro de BEGIN … ROLLBACK: nada do que o código faz fica gravado. */
export async function sandbox(db, fn) {
  await db.exec('BEGIN');
  try {
    return await fn();
  } finally {
    try { await db.exec('ROLLBACK'); } catch { /* conexão já sem transação */ }
  }
}

/**
 * Executa um trecho (com o check opcional) isolado.
 * getFresh(): devolve uma cópia nova do banco (usada quando o código controla transações).
 */
export async function runIsolated(db, getFresh, sql, check = null) {
  if (needsFresh(sql)) {
    const fresh = await getFresh();
    try {
      let res = await runSql(fresh, sql, true);
      if (check) res = await runSql(fresh, check);
      return res;
    } finally {
      await fresh.close?.();
    }
  }
  return sandbox(db, async () => {
    let res = await runSql(db, sql);
    if (check) res = await runSql(db, check);
    return res;
  });
}

const friendly = (msg) => {
  const m = String(msg);
  let x;
  if ((x = m.match(/column "([^"]+)" does not exist/))) return `A coluna <code>${x[1]}</code> não existe. Confira o nome no Esquema (se for texto, use aspas simples: '${x[1]}').`;
  if ((x = m.match(/relation "([^"]+)" does not exist/))) return `A tabela <code>${x[1]}</code> não existe. Confira o nome no Esquema.`;
  if (/must appear in the GROUP BY clause/.test(m)) return 'Toda coluna do SELECT precisa estar no GROUP BY ou dentro de uma agregação (COUNT, SUM...).';
  if (/aggregate functions are not allowed in WHERE/.test(m)) return 'Agregações não podem ir no WHERE: use HAVING depois do GROUP BY.';
  if (/syntax error at or near "([^"]+)"/.test(m)) { x = m.match(/at or near "([^"]+)"/); return `Erro de sintaxe perto de <code>${x[1]}</code>. Confira vírgulas, parênteses e a ordem das cláusulas.`; }
  if (/operator does not exist/.test(m)) return 'Tipos incompatíveis na comparação. Converta um dos lados com <code>::tipo</code> ou <code>CAST(... AS tipo)</code>.';
  if (/violates check constraint/.test(m)) return 'Um CHECK impediu a gravação: o valor não respeita a regra da tabela.';
  if (/violates foreign key constraint/.test(m)) return 'A chave estrangeira não encontrou o registro de referência (ou ainda há linhas que dependem deste).';
  if (/duplicate key value violates unique constraint/.test(m)) return 'Já existe uma linha com esse valor único (PRIMARY KEY ou UNIQUE).';
  if (/null value in column "([^"]+)"/.test(m)) { x = m.match(/null value in column "([^"]+)"/); return `A coluna <code>${x[1]}</code> é NOT NULL e ficou sem valor.`; }
  if (/division by zero/.test(m)) return 'Divisão por zero: use <code>NULLIF(divisor, 0)</code>.';
  if (/invalid input syntax for type/.test(m)) return 'Um texto não pôde ser convertido para o tipo pedido. Limpe ou valide o valor antes de converter.';
  if (/is ambiguous/.test(m)) return 'Coluna ambígua: ela existe em mais de uma tabela do JOIN. Use o alias, como <code>p.id</code>.';
  return '';
};
export const friendlyPgError = friendly;

/** Avalia um exercício: roda a solução e o código do aluno (cada um isolado) e compara. */
export async function evaluatePg(db, getFresh, step, code) {
  let got;
  try {
    got = await runIsolated(db, getFresh, code, step.check);
  } catch (e) {
    return { ok: false, error: true, reason: `Erro no SQL: ${e.message}`, hint: friendly(e.message) };
  }
  const expected = await runIsolated(db, getFresh, step.solution, step.check);
  const cmp = compareResults(got, expected, step.ordered, code);
  return { ...cmp, got, expected };
}
