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

// ───────────── Portfólio: as soluções do aluno publicadas num Gist (público ou secreto)
import { COURSES } from './content/index.js';
import { INTERVIEW } from './content/interview.js';

const fence = (lang, code) => `~~~${lang}\n${code}\n~~~`;
const clean = (t = '') => String(t).replace(/🐞\s*/g, '').trim();

export function buildPortfolio() {
  const s = store.getState();
  const login = store.syncConfig().login || '';
  const files = {};
  const done = (c) => c.units.flatMap((u) => u.lessons).filter((l) => s.completed[l.id]).length;
  const total = (c) => c.units.reduce((a, u) => a + u.lessons.length, 0);
  const lv = store.levelInfo(s.xp);
  const ivSolved = INTERVIEW.filter((p) => s.interview[p.id]);

  // entrevistas, por linguagem
  for (const lang of ['sql', 'python']) {
    const probs = INTERVIEW.filter((p) => p.step.type === lang && s.solutions[`iv:${p.id}`]);
    if (!probs.length) continue;
    const body = probs.sort((a, b) => a.level - b.level).map((p) => {
      const sol = s.solutions[`iv:${p.id}`];
      const best = s.interview[p.id]?.bestSecs;
      return [`## ${p.title}`, `Nível ${p.level}${best ? ` · resolvido em ${Math.floor(best / 60)} min ${best % 60} s` : ''}`, '', clean(p.step.prompt), '', fence(lang, sol.code)].join('\n');
    });
    files[`entrevistas-${lang}.md`] = `# Problemas de entrevista: ${lang === 'sql' ? 'SQL' : 'Python'}\n\n${body.join('\n\n---\n\n')}\n`;
  }

  // exercícios das trilhas
  for (const c of COURSES) {
    const parts = [];
    for (const u of c.units) for (const l of u.lessons) {
      const items = l.steps.filter((st) => ['sql', 'python'].includes(st.type) && s.solutions[`${l.id}#${st.uid}`]);
      if (!items.length) continue;
      parts.push(`## ${l.title}\n\n` + items.map((st) => `${clean(st.prompt)}\n\n${fence(st.type, s.solutions[`${l.id}#${st.uid}`].code)}`).join('\n\n'));
    }
    if (parts.length) files[`exercicios-${c.id === 'stats' ? 'estatistica' : c.id}.md`] = `# ${c.title}: minhas soluções\n\n${parts.join('\n\n---\n\n')}\n`;
  }

  const lines = [
    `# Portfólio de dados${login ? ` · @${login}` : ''}`,
    '',
    `Soluções que escrevi estudando SQL, Python e estatística no Datum. Nível atual: **${lv.title}** (${s.xp} XP).`,
    '',
    '| trilha | lições concluídas |',
    '|---|---|',
    ...COURSES.map((c) => `| ${c.title} | ${done(c)} de ${total(c)} |`),
    '',
    `Problemas de entrevista resolvidos: **${ivSolved.length}** (SQL: ${ivSolved.filter((p) => p.step.type === 'sql').length}, Python: ${ivSolved.filter((p) => p.step.type === 'python').length}).`,
    '',
    '## Arquivos',
    ...Object.keys(files).sort().map((f) => `- \`${f}\``),
    '',
    `_Atualizado em ${new Date().toLocaleDateString('pt-BR')}. Só entram respostas escritas por mim (sem ver a solução)._`,
  ];
  files['README.md'] = lines.join('\n') + '\n';
  return files;
}

/** Cria ou atualiza o Gist do portfólio. Devolve a URL. */
export async function publishPortfolio({ public: isPublic = true } = {}) {
  const cfg = store.syncConfig();
  if (!cfg.token) throw new SyncError('setup', 'Conecte o GitHub primeiro.');
  const files = Object.fromEntries(Object.entries(buildPortfolio()).map(([k, v]) => [k, { content: v }]));
  const pf = store.getState().portfolio;
  let g = null;
  if (pf.gistId) {
    try {
      // arquivos que não existem mais são removidos
      const cur = await gh(`/gists/${pf.gistId}`, { token: cfg.token });
      for (const name of Object.keys(cur.files || {})) if (!files[name]) files[name] = null;
      if ((cur.public !== isPublic)) {
        await gh(`/gists/${pf.gistId}`, { token: cfg.token, method: 'DELETE' });
      } else {
        g = await gh(`/gists/${pf.gistId}`, { token: cfg.token, method: 'PATCH', body: { files } });
      }
    } catch (e) {
      if (e.code !== 'notfound') throw e;
    }
  }
  if (!g) {
    for (const k of Object.keys(files)) if (files[k] === null) delete files[k];
    g = await gh('/gists', { token: cfg.token, method: 'POST', body: { description: 'Portfólio de dados: SQL, Python e estatística (feito com o Datum)', public: isPublic, files } });
  }
  store.setPortfolio({ gistId: g.id, url: g.html_url, public: isPublic });
  // leva o endereço do portfólio para os outros aparelhos (para todos atualizarem o mesmo Gist)
  await syncNow({ force: true }).catch(() => {});
  return g.html_url;
}
