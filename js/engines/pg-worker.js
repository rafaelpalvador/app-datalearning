// Worker do PostgreSQL (PGlite): o banco roda fora da linha principal, então montar
// 480 mil linhas ou rodar uma consulta pesada não trava a tela.
import { PGlite } from '../../vendor/pglite/index.js';
import { pg_trgm } from '../../vendor/pglite/contrib/pg_trgm.js';
import { pgBuildSql } from '../content/pg-dataset.js';
import { runIsolated, evaluatePg, friendlyPgError } from './pg-core.js';

const extensions = { pg_trgm };
const BUILD = pgBuildSql(1);
// muda quando o conteúdo do banco muda (força remontar o cache)
const KEY = 'datum-pg-' + [...BUILD].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7).toString(36);

let db = null;
let dump = null;
let ready = null;

function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('datum-pg', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('dumps');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbGet(k) {
  try { const d = await idb(); return await new Promise((res) => { const q = d.transaction('dumps').objectStore('dumps').get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); } catch { return null; }
}
async function idbPutOnly(k, v) {
  try {
    const d = await idb();
    await new Promise((res) => {
      const tx = d.transaction('dumps', 'readwrite');
      const st = tx.objectStore('dumps');
      st.clear();
      st.put(v, k);
      tx.oncomplete = res; tx.onerror = res;
    });
  } catch { /* sem armazenamento: monta de novo na próxima vez */ }
}

function init(status) {
  ready ??= (async () => {
    const cached = await idbGet(KEY);
    if (cached) {
      status('Abrindo o PostgreSQL...');
      try {
        db = await PGlite.create({ loadDataDir: cached, extensions });
        dump = cached;
        return;
      } catch { /* cache corrompido: monta de novo */ }
    }
    status('Montando o banco do curso (só na primeira vez: ≈ 480 mil linhas)...');
    db = await PGlite.create({ extensions });
    await db.exec(BUILD);
    status('Guardando o banco para as próximas vezes...');
    dump = await db.dumpDataDir('gzip');
    await idbPutOnly(KEY, dump);
  })().catch((e) => { ready = null; throw e; });
  return ready;
}

const getFresh = () => PGlite.create({ loadDataDir: dump, extensions });

self.onmessage = async (e) => {
  const { id, op, sql, step, code } = e.data;
  const status = (msg) => self.postMessage({ id, status: msg });
  try {
    await init(status);
    status('Executando...');
    let result;
    if (op === 'run') {
      const t = performance.now();
      try {
        result = { ok: true, ...(await runIsolated(db, getFresh, sql)), ms: Math.round(performance.now() - t) };
      } catch (err) {
        result = { ok: false, error: String(err.message || err), hint: friendlyPgError(err.message) };
      }
    } else if (op === 'evaluate') {
      result = await evaluatePg(db, getFresh, step, code);
    } else if (op === 'warm') {
      result = { ok: true };
    }
    self.postMessage({ id, result });
  } catch (err) {
    self.postMessage({ id, result: { ok: false, error: 'Não foi possível iniciar o PostgreSQL: ' + (err.message || err) } });
  }
};
