// Motor SQL: SQLite compilado para WebAssembly (sql.js), rodando 100% no navegador.
// A lógica de comparação é pura para poder ser reutilizada no validador (Node).

import { DB_SQL } from '../content/datasets.js';

let sqlPromise = null;

export function initSql() {
  if (!sqlPromise) {
    // window.initSqlJs é carregado por vendor/sql-wasm.js (ver index.html)
    sqlPromise = window.initSqlJs({ locateFile: (f) => `vendor/${f}` });
  }
  return sqlPromise;
}

export async function freshDb() {
  const SQL = await initSql();
  return createDb(SQL);
}

// Montar o banco com os INSERTs leva ~15 ms (bem mais no celular), e isso acontecia
// a cada execução. Monta uma vez, guarda os bytes e cria cópias instantâneas (~0,2 ms).
const baseBytes = new WeakMap();
export function createDb(SQL) {
  let bytes = baseBytes.get(SQL);
  if (!bytes) {
    const db = new SQL.Database();
    db.run(DB_SQL);
    bytes = db.export();
    db.close();
    baseBytes.set(SQL, bytes);
  }
  return new SQL.Database(bytes);
}

// Executa e devolve o resultado do ÚLTIMO comando que retornou linhas.
export function runQuery(db, sql) {
  const results = db.exec(sql);
  if (!results.length) return { columns: [], values: [] };
  return results[results.length - 1];
}

function normValue(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return (Math.round(v * 100) / 100).toFixed(2);
  if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)) && /^-?\d+(\.\d+)?$/.test(v.trim())) {
    return (Math.round(Number(v) * 100) / 100).toFixed(2);
  }
  return String(v);
}

function normRows(res, ordered) {
  const rows = res.values.map((r) => r.map(normValue).join('\u0001'));
  return ordered ? rows : [...rows].sort();
}

// Compara o resultado do aluno com o esperado e, quando erra, tenta EXPLICAR o porquê.
// Nomes de colunas são ignorados (aliases livres), mas número de colunas,
// valores e (quando pedido) a ordem das linhas precisam bater.
export function compareResults(got, expected, ordered, userSql = '') {
  const sqlU = userSql.toUpperCase().replace(/\s+/g, ' ');
  const expCols = expected.columns.join(', ');
  if (got.columns.length !== expected.columns.length) {
    return {
      ok: false,
      reason: `Seu resultado tem ${got.columns.length} coluna(s); o esperado tem ${expected.columns.length}.`,
      hint: `Colunas esperadas (os nomes podem variar): <code>${escapeHtml(expCols)}</code>.`,
    };
  }
  const gotRows = normRows(got, false);
  const expRows = normRows(expected, false);
  if (got.values.length !== expected.values.length) {
    const reason = `Seu resultado tem ${got.values.length} linha(s); o esperado tem ${expected.values.length}.`;
    let hint;
    const gotSet = new Set(gotRows);
    const dupes = gotRows.length - gotSet.size;
    const expSet = new Set(expRows);
    if (got.values.length > expected.values.length) {
      if (dupes > 0 && [...gotSet].every((r) => expSet.has(r))) {
        hint = 'Há linhas <b>duplicadas</b>. Um JOIN pode estar multiplicando linhas — talvez falte <code>DISTINCT</code> ou <code>GROUP BY</code>.';
      } else if (expRows.every((r) => gotSet.has(r))) {
        hint = 'Todas as linhas certas estão aí, mas sobraram outras: falta algum <b>filtro</b> (<code>WHERE</code>/<code>HAVING</code>)' + (/ OR /.test(sqlU) ? ' — ou os parênteses ao misturar AND e OR.' : '.');
      } else {
        hint = 'Vieram linhas a mais. Revise os filtros e as condições do JOIN.';
      }
    } else {
      if (gotRows.every((r) => expSet.has(r))) {
        hint = /\bJOIN\b/.test(sqlU) && !/LEFT JOIN|RIGHT JOIN|FULL/.test(sqlU)
          ? 'Faltam linhas. Um <code>INNER JOIN</code> descarta quem não tem correspondência — será que era um <code>LEFT JOIN</code>?'
          : 'Faltam linhas: seu filtro está <b>restritivo demais</b>.' + (/= ?NULL/.test(sqlU) ? ' Lembre: compare NULL com <code>IS NULL</code>, nunca com <code>=</code>.' : '');
      } else if (/GROUP BY/.test(sqlU)) {
        hint = 'O número de grupos não bate: confira as colunas do <code>GROUP BY</code> e o <code>HAVING</code>.';
      } else {
        hint = 'Vieram linhas a menos. Revise filtros e JOINs.';
      }
    }
    return { ok: false, reason, hint };
  }
  const a = normRows(got, ordered);
  const b = normRows(expected, ordered);
  if (a.every((r, i) => r === b[i])) return { ok: true };

  if (ordered && gotRows.join() === expRows.join()) {
    return {
      ok: false,
      reason: 'Os dados estão certos, mas a <b>ordem</b> das linhas não.',
      hint: /ORDER BY/.test(sqlU) ? 'Confira a coluna e a direção (<code>ASC</code>/<code>DESC</code>) do ORDER BY.' : 'O enunciado pede uma ordem: falta o <code>ORDER BY</code>.',
    };
  }
  // descobre QUAIS colunas diferem comparando cada coluna como multiconjunto
  const colDiff = [];
  for (let c = 0; c < expected.columns.length; c++) {
    const g = got.values.map((r) => normValue(r[c])).sort().join('|');
    const e = expected.values.map((r) => normValue(r[c])).sort().join('|');
    if (g !== e) colDiff.push(c);
  }
  let hint = '';
  if (colDiff.length) {
    const names = colDiff.map((c) => `<code>${escapeHtml(expected.columns[c])}</code> (coluna ${c + 1})`).join(', ');
    hint = `Os valores diferentes estão em: ${names}.`;
    const c = colDiff[0];
    const gv = got.values.map((r) => r[c]);
    const ev = expected.values.map((r) => r[c]);
    const nullGot = gv.filter((v) => v === null).length;
    const nullExp = ev.filter((v) => v === null).length;
    if (nullGot !== nullExp) {
      hint += nullGot > nullExp ? ' Você tem NULLs onde deveria haver valores — talvez <code>COALESCE</code>.' : ' O esperado tem NULLs que você não tem — cuidado com <code>COUNT(*)</code> × <code>COUNT(coluna)</code> e com JOINs.';
    } else if (gv.every((v) => typeof v === 'number') && ev.every((v) => typeof v === 'number')) {
      const close = gv.slice().sort((x, y) => x - y).every((v, i) => Math.abs(v - ev.slice().sort((x, y) => x - y)[i]) < 1);
      if (close) hint += ' Os números estão quase iguais: confira o <b>arredondamento</b> (<code>ROUND</code>) ou divisão inteira.';
      else if (/ \* |SUM\(/.test(sqlU) || /AVG\(/.test(sqlU)) hint += ' Confira o cálculo: a fórmula, a agregação (<code>SUM</code>/<code>AVG</code>/<code>COUNT</code>) e se um JOIN está duplicando valores.';
    }
  } else {
    hint = 'Cada coluna tem os valores certos, mas eles estão combinados nas linhas erradas — confira as condições do JOIN.';
  }
  return { ok: false, reason: 'Os valores retornados não batem com o esperado.', hint };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Traduz os erros mais comuns do SQLite em dicas para iniciantes.
export function friendlySqlError(msg) {
  const m = String(msg);
  let x;
  if ((x = m.match(/no such column: (\S+)/))) return `A coluna <code>${escapeHtml(x[1])}</code> não existe. Confira o nome no Esquema — e se for um texto, coloque entre aspas simples: <code>'${escapeHtml(x[1])}'</code>.`;
  if ((x = m.match(/no such table: (\S+)/))) return `A tabela <code>${escapeHtml(x[1])}</code> não existe. Abra o Esquema para ver os nomes certos.`;
  if (/misuse of aggregate/.test(m)) return 'Funções de agregação (COUNT, SUM...) não podem ir no <code>WHERE</code>. Use <code>HAVING</code> depois do GROUP BY.';
  if ((x = m.match(/near "([^"]+)": syntax error/))) return `Erro de sintaxe perto de <code>${escapeHtml(x[1])}</code>. Confira vírgulas, parênteses e a ordem das cláusulas (SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT).`;
  if (/incomplete input/.test(m)) return 'A query parece incompleta: falta fechar um parêntese ou aspas?';
  if (/ambiguous column name: (\S+)/.test(m)) return 'Essa coluna existe em mais de uma tabela do JOIN: use o prefixo da tabela, como <code>c.id</code>.';
  if (/UNIQUE constraint failed/.test(m)) return 'Já existe uma linha com essa chave (violação de UNIQUE/PRIMARY KEY).';
  if (/NOT NULL constraint failed/.test(m)) return 'Uma coluna obrigatória (NOT NULL) ficou sem valor.';
  if (/already exists/.test(m)) return 'Esse objeto já existe no banco.';
  return '';
}

// Avalia um exercício SQL. Recebe uma função que cria bancos novos.
export function evaluateSql(makeDb, step, userSql) {
  const dbUser = makeDb();
  const dbSol = makeDb();
  try {
    let got;
    try {
      got = runQuery(dbUser, userSql);
      if (step.check) got = runQuery(dbUser, step.check);
    } catch (e) {
      return { ok: false, error: true, reason: `Erro no SQL: ${e.message}`, hint: friendlySqlError(e.message) };
    }
    let expected = runQuery(dbSol, step.solution);
    if (step.check) expected = runQuery(dbSol, step.check);
    const cmp = compareResults(got, expected, step.ordered, userSql);
    return { ...cmp, got, expected };
  } finally {
    dbUser.close();
    dbSol.close();
  }
}
