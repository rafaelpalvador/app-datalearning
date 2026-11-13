// Motor SQL: SQLite compilado para WebAssembly (sql.js), rodando 100% no navegador.
// A lógica de comparação é pura para poder ser reutilizada no validador (Node).

import { LOJA_SQL } from '../content/datasets.js';

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

export function createDb(SQL) {
  const db = new SQL.Database();
  db.run(LOJA_SQL);
  return db;
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

// Compara o resultado do aluno com o esperado.
// Nomes de colunas são ignorados (aliases livres), mas número de colunas,
// valores e (quando pedido) a ordem das linhas precisam bater.
export function compareResults(got, expected, ordered) {
  if (got.columns.length !== expected.columns.length) {
    return { ok: false, reason: `Seu resultado tem ${got.columns.length} coluna(s); o esperado tem ${expected.columns.length}.` };
  }
  if (got.values.length !== expected.values.length) {
    return { ok: false, reason: `Seu resultado tem ${got.values.length} linha(s); o esperado tem ${expected.values.length}.` };
  }
  const a = normRows(got, ordered);
  const b = normRows(expected, ordered);
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      if (ordered && normRows(got, false).join() === normRows(expected, false).join()) {
        return { ok: false, reason: 'Os dados estão certos, mas a ORDEM das linhas não. Confira o ORDER BY.' };
      }
      return { ok: false, reason: 'Os valores retornados não batem com o esperado. Confira filtros, JOINs e cálculos.' };
    }
  }
  return { ok: true };
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
      return { ok: false, error: true, reason: `Erro no SQL: ${e.message}` };
    }
    let expected = runQuery(dbSol, step.solution);
    if (step.check) expected = runQuery(dbSol, step.check);
    const cmp = compareResults(got, expected, step.ordered);
    return { ...cmp, got, expected };
  } finally {
    dbUser.close();
    dbSol.close();
  }
}
