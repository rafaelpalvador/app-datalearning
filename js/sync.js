// Sincronização do progresso entre aparelhos usando um Gist secreto do GitHub do aluno.
// Não há servidor do Datum: o progresso fica num arquivo da conta GitHub da própria pessoa,
// e o token (com permissão só para Gists) fica salvo apenas no aparelho.
import * as store from './state.js';

const API = 'https://api.github.com';
const FILE = 'datum-progresso.json';
const DESCRIPTION = 'Datum: progresso sincronizado entre aparelhos (não apague)';
export const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=Datum%20sincroniza%C3%A7%C3%A3o';

export class SyncError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

async function gh(path, { token, method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new SyncError('offline', 'Sem conexão com o GitHub. O progresso será sincronizado quando houver internet.');
  }
  if (res.status === 401) throw new SyncError('auth', 'Token do GitHub inválido ou expirado. Crie outro e conecte de novo.');
  if (res.status === 403 || res.status === 429) {
    const limit = res.headers.get('x-ratelimit-remaining') === '0';
    throw new SyncError(limit ? 'rate' : 'perm', limit ? 'O GitHub limitou as consultas por agora. Tente mais tarde.' : 'O token não tem permissão para Gists. Marque a opção "gist" ao criar o token.');
  }
  if (res.status === 404) throw new SyncError('notfound', 'Não encontrado.');
  if (!res.ok) throw new SyncError('api', `O GitHub respondeu ${res.status}.`);
  return res.status === 204 ? null : res.json();
}

const payloadFile = () => ({ [FILE]: { content: JSON.stringify({ app: 'datum', version: 1, savedAt: new Date().toISOString(), progress: store.syncPayload() }) } });

async function readGist(token, id) {
  const g = await gh(`/gists/${id}`, { token });
  const f = g.files?.[FILE];
  if (!f) return null;
  let text = f.content;
  if (f.truncated && f.raw_url) text = await (await fetch(f.raw_url, { cache: 'no-store' })).text();
  try { return JSON.parse(text).progress || null; } catch { return null; }
}

async function findGist(token) {
  for (let page = 1; page <= 10; page++) {
    const list = await gh(`/gists?per_page=100&page=${page}`, { token });
    const hit = list.find((g) => g.files?.[FILE]);
    if (hit) return hit.id;
    if (list.length < 100) return null;
  }
  return null;
}

/** Conecta com um token: valida, encontra (ou cria) o Gist e faz a 1ª sincronização. */
export async function connect(rawToken) {
  const token = rawToken.trim();
  if (!token) throw new SyncError('setup', 'Cole o token do GitHub.');
  const user = await gh('/user', { token });
  let gistId = await findGist(token);
  if (!gistId) {
    const g = await gh('/gists', { token, method: 'POST', body: { description: DESCRIPTION, public: false, files: payloadFile() } });
    gistId = g.id;
  }
  store.setSyncConfig({ token, gistId, login: user.login });
  return syncNow({ force: true });
}

export function disconnect() {
  store.setSyncConfig({ token: '' });
}

export const isConnected = () => !!store.syncConfig().token;

let running = null;
/**
 * Baixa o progresso do outro aparelho, junta com o deste e envia o resultado.
 * Devolve { changed } — changed = o progresso local mudou (a tela deve ser redesenhada).
 */
export function syncNow({ force = false } = {}) {
  const cfg = store.syncConfig();
  if (!cfg.token) return Promise.resolve({ changed: false, skipped: true });
  if (!force && Date.now() - (cfg.lastSync || 0) < 20000) return Promise.resolve({ changed: false, skipped: true });
  running ??= (async () => {
    let remote = null;
    let gistId = cfg.gistId;
    try {
      remote = gistId ? await readGist(cfg.token, gistId) : null;
    } catch (e) {
      if (e.code !== 'notfound') throw e;
      gistId = null; // o Gist foi apagado: cria outro abaixo
    }
    const changed = remote ? store.mergeSynced(remote) : false;
    if (!remote) store.mergeSynced(store.syncPayload());
    if (gistId) await gh(`/gists/${gistId}`, { token: cfg.token, method: 'PATCH', body: { files: payloadFile() } });
    else gistId = (await gh('/gists', { token: cfg.token, method: 'POST', body: { description: DESCRIPTION, public: false, files: payloadFile() } })).id;
    store.setSyncConfig({ gistId, lastSync: Date.now() });
    return { changed };
  })().finally(() => { running = null; });
  return running;
}
