// Progresso do aluno salvo no aparelho (localStorage).
// Para sincronizar entre celular e PC sem servidor: Perfil → Backup (código de exportação).
// A chave de armazenamento é mantida desde a 1ª versão para preservar o progresso nas atualizações.

const KEY = 'datalingo:v1';
const DAY = 86400000;

// data local (não UTC), para o "dia" virar à meia-noite do aluno
export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ───────────── níveis de carreira (por XP)
export const LEVELS = [
  { xp: 0, title: 'Estagiário de Dados' },
  { xp: 150, title: 'Analista Júnior I' },
  { xp: 400, title: 'Analista Júnior II' },
  { xp: 800, title: 'Analista Pleno I' },
  { xp: 1400, title: 'Analista Pleno II' },
  { xp: 2200, title: 'Analista Sênior I' },
  { xp: 3300, title: 'Analista Sênior II' },
  { xp: 4800, title: 'Especialista em Dados' },
  { xp: 6800, title: 'Head de Dados' },
];

export function levelInfo(xp) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1];
  return {
    index: i + 1,
    title: cur.title,
    next: next?.title ?? null,
    progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1,
    toNext: next ? next.xp - xp : 0,
  };
}

function freshDaily() {
  return { day: today(), xp: 0, lessons: 0, perfect: 0, sql: 0, python: 0, review: 0, theory: 0, combo: 0, maxCombo: 0, claimed: [] };
}

function defaults() {
  return {
    xp: 0,
    dailyGoal: 30,
    completed: {},     // lessonId -> { at, stars, bestMistakes }
    checkpoints: {},   // unitId -> { at, score }
    mistakes: [],      // [{ lessonId, stepIndex (identificador estável do passo), at }]
    srs: {},           // 'lessonId#uid' -> { ease, interval, due, reps, lapses }
    interview: {},     // problemId -> { solvedAt, bestSecs, attempts }
    achievements: {},  // id -> timestamp
    history: {},       // 'AAAA-MM-DD' -> xp do dia
    topics: {},        // courseId -> { correct, answered } (estatísticas por trilha)
    daily: freshDaily(),
    reminder: { enabled: false, hour: 19, minute: 0 },
    settings: { sound: true, haptics: true, theme: 'system' },
    tutor: { provider: '', keys: {}, models: {}, baseUrls: {} },
    syncCfg: { token: '', gistId: '', login: '', lastSync: 0, syncPrefs: true }, // sincronização via GitHub (fica só no aparelho)
    prefsAt: 0,        // quando as preferências mudaram (vale a mais recente entre aparelhos)
    solutions: {},     // 'lessonId#uid' ou 'iv:problemId' -> { code, lang, at } (respostas certas, sem ver a solução)
    portfolio: { gistId: '', url: '', public: true, at: 0 },
    syncBase: null,    // estado combinado na última sincronização (base da junção em 3 vias)
    totals: { correct: 0, answered: 0, perfectLessons: 0, maxCombo: 0, theoryRead: 0, tutorQuestions: 0 },
  };
}

let state = null;

// v1.2 guardava só a chave da Anthropic em tutor.apiKey
function migrateTutor(t) {
  const out = { provider: t.provider || '', keys: { ...(t.keys || {}) }, models: { ...(t.models || {}) }, baseUrls: { ...(t.baseUrls || {}) } };
  if (t.apiKey) {
    out.keys.anthropic = t.apiKey;
    out.provider ||= 'anthropic';
  }
  return out;
}

export function getState() {
  if (state) return state;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    const d = defaults();
    state = {
      ...d,
      ...saved,
      totals: { ...d.totals, ...(saved.totals || {}) },
      daily: { ...freshDaily(), ...(saved.daily || {}) },
      reminder: { ...d.reminder, ...(saved.reminder || {}) },
      settings: { ...d.settings, ...(saved.settings || {}) },
      tutor: migrateTutor({ ...d.tutor, ...(saved.tutor || {}) }),
      syncCfg: { ...d.syncCfg, ...(saved.syncCfg || {}) },
      portfolio: { ...d.portfolio, ...(saved.portfolio || {}) },
      solutions: saved.solutions || {},
      topics: saved.topics || {},
    };
    // limpeza de campos de versões anteriores (ofensiva, vidas, gemas)
    for (const k of ['streak', 'bestStreak', 'freezes', 'lastActiveDay', 'hearts', 'heartsUpdatedAt', 'gems', 'frozeNotice', 'todayXp', 'todayDay']) delete state[k];
  } catch {
    state = defaults();
  }
  refresh();
  return state;
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* armazenamento indisponível */ }
}

// Vira o dia das missões.
export function refresh() {
  if (state.daily.day !== today()) state.daily = freshDaily();
  save();
}

export function addXp(amount) {
  const s = getState();
  const before = levelInfo(s.xp).index;
  s.xp += amount;
  s.daily.xp += amount;
  s.history[today()] = (s.history[today()] || 0) + amount;
  save();
  return levelInfo(s.xp).index > before; // subiu de nível?
}

export const daysStudied = () => Object.keys(getState().history).length;

export function completeLesson(lessonId, mistakes, { silent = false } = {}) {
  const s = getState();
  const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
  const prev = s.completed[lessonId];
  s.completed[lessonId] = {
    at: prev?.at ?? Date.now(),
    stars: Math.max(stars, prev?.stars ?? 0),
    bestMistakes: Math.min(mistakes, prev?.bestMistakes ?? Infinity),
  };
  if (!silent) {
    s.daily.lessons += 1;
    if (mistakes === 0) { s.daily.perfect += 1; s.totals.perfectLessons += 1; }
  }
  save();
  return stars;
}

export function passCheckpoint(unitId, score) {
  getState().checkpoints[unitId] = { at: Date.now(), score };
  save();
}

export function recordTheory() {
  const s = getState();
  s.daily.theory += 1;
  s.totals.theoryRead += 1;
  save();
}

// Registra cada resposta: alimenta missões, estatísticas por trilha e a revisão espaçada.
export function recordAnswer({ lessonId, stepIndex, type, correct, review = false, courseId = null }) {
  const s = getState();
  s.totals.answered += 1;
  if (courseId) {
    const t = (s.topics[courseId] ??= { correct: 0, answered: 0 });
    t.answered += 1;
    if (correct) t.correct += 1;
  }
  if (correct) {
    s.totals.correct += 1;
    s.daily.combo += 1;
    s.daily.maxCombo = Math.max(s.daily.maxCombo, s.daily.combo);
    s.totals.maxCombo = Math.max(s.totals.maxCombo, s.daily.combo);
    if (type === 'sql') s.daily.sql += 1;
    if (type === 'python') s.daily.python += 1;
    if (review) s.daily.review += 1;
  } else {
    s.daily.combo = 0;
  }
  if (lessonId) srsUpdate(`${lessonId}#${stepIndex}`, correct);
  save();
}

// ───────────── revisão espaçada (SM-2 simplificado)
function srsUpdate(key, correct) {
  const c = state.srs[key] || { ease: 2.5, interval: 0, due: 0, reps: 0, lapses: 0 };
  if (correct) {
    c.reps += 1;
    c.interval = c.reps === 1 ? 1 : c.reps === 2 ? 3 : Math.round(c.interval * c.ease);
    c.ease = Math.min(3.0, c.ease + 0.05);
  } else {
    c.lapses += 1;
    c.reps = 0;
    c.interval = 0;
    c.ease = Math.max(1.3, c.ease - 0.2);
  }
  c.due = Date.now() + c.interval * DAY;
  c.at = Date.now(); // quando foi respondido (desempate na sincronização)
  state.srs[key] = c;
}

export function dueCards(now = Date.now()) {
  return Object.entries(getState().srs)
    .filter(([, c]) => c.due <= now)
    .sort((a, b) => a[1].due - b[1].due)
    .map(([key, c]) => {
      const i = key.lastIndexOf('#');
      return { lessonId: key.slice(0, i), stepIndex: key.slice(i + 1), card: c };
    });
}

export function srsStrength(lessonIds) {
  // domínio médio (0–1) dos exercícios de um conjunto de lições
  const cards = Object.entries(getState().srs).filter(([k]) => lessonIds.includes(k.slice(0, k.lastIndexOf('#')))).map(([, c]) => c);
  if (!cards.length) return 0;
  return cards.reduce((a, c) => a + Math.min(1, (c.reps + 1) / 4) * (c.due > Date.now() ? 1 : 0.6), 0) / cards.length;
}

/**
 * Atualiza as referências de revisão espaçada e de erros para o identificador estável
 * dos passos e remove as que não apontam mais para um exercício.
 * resolve(lessonId, ref) → novo ref (string) ou null.
 */
export function migrateStepRefs(resolve) {
  const s = getState();
  let changed = false;
  const srs = {};
  for (const [key, card] of Object.entries(s.srs)) {
    const i = key.lastIndexOf('#');
    const lessonId = key.slice(0, i);
    const ref = resolve(lessonId, key.slice(i + 1));
    if (!ref) { changed = true; continue; }
    const nk = `${lessonId}#${ref}`;
    if (nk !== key) changed = true;
    // se dois cartões antigos caíram no mesmo exercício, fica o que vence primeiro
    if (!srs[nk] || card.due < srs[nk].due) srs[nk] = card;
  }
  const seen = new Set();
  const mistakes = [];
  for (const m of s.mistakes) {
    const ref = resolve(m.lessonId, String(m.stepIndex));
    if (ref !== m.stepIndex) changed = true;
    if (!ref || seen.has(`${m.lessonId}#${ref}`)) continue;
    seen.add(`${m.lessonId}#${ref}`);
    mistakes.push({ ...m, stepIndex: ref });
  }
  if (changed) { s.srs = srs; s.mistakes = mistakes; save(); }
  return changed;
}

// ───────────── soluções do aluno (portfólio e sincronização)
export function saveSolution(key, code, lang) {
  if (!key || !code?.trim()) return;
  getState().solutions[key] = { code: code.trim().slice(0, 20000), lang, at: Date.now() };
  save();
}

export function setPortfolio(patch) {
  const s = getState();
  s.portfolio = { ...s.portfolio, ...patch, at: Date.now() };
  save();
}

// ───────────── erros
export function recordMistake(lessonId, stepIndex) {
  const s = getState();
  s.mistakes = s.mistakes.filter((m) => !(m.lessonId === lessonId && m.stepIndex === stepIndex));
  s.mistakes.push({ lessonId, stepIndex, at: Date.now() });
  if (s.mistakes.length > 200) s.mistakes = s.mistakes.slice(-200);
  save();
}

export function clearMistake(lessonId, stepIndex) {
  const s = getState();
  s.mistakes = s.mistakes.filter((m) => !(m.lessonId === lessonId && m.stepIndex === stepIndex));
  save();
}

// ───────────── entrevista
export function solveInterview(id, secs) {
  const s = getState();
  const prev = s.interview[id];
  s.interview[id] = { solvedAt: prev?.solvedAt ?? Date.now(), bestSecs: Math.min(secs, prev?.bestSecs ?? Infinity) };
  save();
  return !prev;
}

// ───────────── missões e conquistas
export function claimMission(id) {
  const s = getState();
  if (s.daily.claimed.includes(id)) return false;
  s.daily.claimed.push(id);
  save();
  return true;
}

export function unlockAchievement(id) {
  const s = getState();
  if (s.achievements[id]) return false;
  s.achievements[id] = Date.now();
  save();
  return true;
}

// ───────────── configurações
export function setDailyGoal(xp) {
  getState().dailyGoal = xp;
  getState().prefsAt = Date.now();
  save();
}

export function setReminder(r) {
  const s = getState();
  s.reminder = { ...s.reminder, ...r };
  save();
}

export function setSetting(key, value) {
  getState().settings[key] = value;
  getState().prefsAt = Date.now();
  save();
}

export function setTutorProvider(id) {
  getState().tutor.provider = id;
  getState().prefsAt = Date.now();
  save();
}

export function setTutorKey(id, key) {
  const t = getState().tutor;
  if (key) t.keys[id] = key.trim();
  else delete t.keys[id];
  save();
}

export function setTutorModel(id, model) {
  const t = getState().tutor;
  getState().prefsAt = Date.now();
  if (model) t.models[id] = model.trim();
  else delete t.models[id];
  save();
}

export function setTutorBase(id, url) {
  getState().tutor.baseUrls[id] = url.trim();
  save();
}

export function countTutorQuestion() {
  getState().totals.tutorQuestions += 1;
  save();
}

// Progresso de exemplo para a versão de demonstração (window.DATALINGO_DEMO).
export function seedDemo(courseLessonIds, interviewIds) {
  const s = defaults();
  const now = Date.now();
  const [sqlIds, pyIds, statIds] = courseLessonIds;
  const done = [...sqlIds.slice(0, 11), ...pyIds.slice(0, 6), ...statIds.slice(0, 3)];
  done.forEach((id, i) => {
    s.completed[id] = { at: now - (done.length - i) * DAY * 2, stars: [3, 2, 3, 3, 1, 3, 2, 3][i % 8], bestMistakes: i % 3 };
    for (let k = 1; k < 6; k++) {
      s.srs[`${id}#${k}`] = { ease: 2.5, interval: 3, reps: 2, lapses: i % 4 === 0 ? 1 : 0, due: now + ((i + k) % 5 === 0 ? -DAY : DAY * ((i + k) % 7)) };
    }
  });
  for (let d = 0; d < 70; d++) {
    if (d < 6 || (d * 7) % 5 > 1) s.history[today(new Date(now - d * DAY))] = d === 0 ? 25 : 15 + ((d * 37) % 90);
  }
  s.xp = Object.values(s.history).reduce((a, b) => a + b, 0);
  s.daily = { ...freshDaily(), xp: 25, lessons: 1, sql: 4, python: 2, review: 3, theory: 3, combo: 4, maxCombo: 6 };
  s.totals = { correct: 214, answered: 251, perfectLessons: 5, maxCombo: 17, theoryRead: 48, tutorQuestions: 0 };
  s.topics = { sql: { correct: 121, answered: 138 }, python: { correct: 71, answered: 86 }, stats: { correct: 22, answered: 27 } };
  s.mistakes = [{ lessonId: sqlIds[4], stepIndex: 2, at: now }, { lessonId: sqlIds[9], stepIndex: 3, at: now }, { lessonId: pyIds[3], stepIndex: 1, at: now }];
  s.interview = { [interviewIds[0]]: { solvedAt: now - DAY, bestSecs: 142 }, [interviewIds[2]]: { solvedAt: now, bestSecs: 61 }, [interviewIds[4]]: { solvedAt: now, bestSecs: 205 } };
  s.demoSeeded = true;
  state = s;
  save();
}

export function resetProgress() {
  const keep = { demoSeeded: !!state?.demoSeeded, settings: state?.settings, tutor: state?.tutor };
  state = { ...defaults(), ...Object.fromEntries(Object.entries(keep).filter(([, v]) => v !== undefined)) };
  save();
}

// ───────────── backup / sincronização manual entre aparelhos
export function exportCode() {
  const { tutor, syncCfg, syncBase, ...rest } = getState(); // chaves e token nunca saem do aparelho
  return 'DL1:' + btoa(unescape(encodeURIComponent(JSON.stringify(rest))));
}

export function importCode(code) {
  const raw = code.trim();
  if (!raw.startsWith('DL1:')) throw new Error('Código inválido: ele deve começar com DL1:');
  const data = JSON.parse(decodeURIComponent(escape(atob(raw.slice(4)))));
  if (typeof data !== 'object' || data === null || typeof data.xp !== 'number') throw new Error('Código inválido.');
  data.tutor = getState().tutor;
  data.syncCfg = getState().syncCfg;
  data.syncBase = null;
  localStorage.setItem(KEY, JSON.stringify(data));
  state = null;
  return getState();
}

// ───────────── sincronização entre aparelhos (junção em 3 vias)
// O que viaja entre aparelhos: o progresso. Ficam no aparelho: chaves de IA, token,
// preferências (som, tema, lembrete) e a base da junção.
const LOCAL_ONLY = ['tutor', 'syncCfg', 'syncBase', 'settings', 'reminder', 'demoSeeded', 'prefsAt', 'dailyGoal'];
export function syncPayload() {
  const s = getState();
  const out = {};
  for (const [k, v] of Object.entries(s)) if (!LOCAL_ONLY.includes(k)) out[k] = v;
  // preferências (opcional): tema, som, vibração, meta diária e a IA escolhida — nunca as chaves
  if (s.syncCfg.syncPrefs !== false) {
    out.prefs = { at: s.prefsAt || 0, settings: s.settings, dailyGoal: s.dailyGoal, tutorProvider: s.tutor.provider, tutorModels: s.tutor.models };
  }
  return JSON.parse(JSON.stringify(out));
}

export const syncConfig = () => getState().syncCfg;
export function setSyncConfig(patch) {
  const s = getState();
  s.syncCfg = { ...s.syncCfg, ...patch };
  if (!s.syncCfg.token) { s.syncCfg = { token: '', gistId: '', login: '', lastSync: 0 }; s.syncBase = null; }
  save();
}

const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
// contador que os dois aparelhos podem ter aumentado desde a última sincronização
const counter = (base, a, b) => num(base) + Math.max(0, num(a) - num(base)) + Math.max(0, num(b) - num(base));
function mergeCounters(base = {}, a = {}, b = {}) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const va = a[k], vb = b[k];
    if (typeof va === 'number' || typeof vb === 'number') out[k] = counter(base[k], va, vb);
    else if ((va && typeof va === 'object') || (vb && typeof vb === 'object')) out[k] = mergeCounters(base[k] || {}, va || {}, vb || {});
  }
  return out;
}
function minTree(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return Math.min(a, b);
  if (typeof a === 'number' || typeof b === 'number') return 0;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a)) return Array.isArray(a) ? [] : {};
  const out = {};
  for (const k of Object.keys(a)) if (k in b) out[k] = minTree(a[k], b[k]);
  return out;
}
// lista em que itens podem ter sido adicionados ou removidos dos dois lados
function mergeSet(base = [], a = [], b = [], keyOf) {
  const kb = new Set(base.map(keyOf)), ka = new Set(a.map(keyOf)), kr = new Set(b.map(keyOf));
  const out = new Map();
  for (const item of [...b, ...a]) {
    const k = keyOf(item);
    const removed = (kb.has(k) && !ka.has(k)) || (kb.has(k) && !kr.has(k));
    if (!removed) out.set(k, item);
  }
  return [...out.values()];
}

/**
 * Junta o progresso de outro aparelho (remote) com o deste, usando a última versão
 * sincronizada como base: contadores somam o que cada lado ganhou, lições concluídas,
 * conquistas e entrevistas se unem, e a revisão espaçada fica com a resposta mais recente.
 * Devolve true se o estado local mudou.
 */
export function mergeSynced(remote) {
  const s = getState();
  const before = JSON.stringify(syncPayload());
  const local = syncPayload();
  if (!remote || typeof remote !== 'object') remote = {};
  // 1ª sincronização: não se sabe o que já era comum aos dois aparelhos (ex.: progresso
  // importado por código de backup). Usar o menor valor de cada contador como base faz o
  // resultado ser o MAIOR dos dois, sem somar duas vezes o mesmo progresso.
  const base = s.syncBase || minTree(local, remote);

  s.xp = counter(base.xp, local.xp, remote.xp);
  s.history = mergeCounters(base.history, local.history, remote.history);
  s.totals = { ...s.totals, ...mergeCounters(base.totals, local.totals, remote.totals) };
  for (const k of ['maxCombo']) s.totals[k] = Math.max(num(local.totals?.[k]), num(remote.totals?.[k]));
  s.topics = mergeCounters(base.topics, local.topics, remote.topics);

  const completed = { ...(remote.completed || {}) };
  for (const [id, c] of Object.entries(local.completed || {})) {
    const r = completed[id];
    completed[id] = r ? { at: Math.min(c.at ?? Infinity, r.at ?? Infinity), stars: Math.max(c.stars || 0, r.stars || 0), bestMistakes: Math.min(c.bestMistakes ?? Infinity, r.bestMistakes ?? Infinity) } : c;
  }
  s.completed = completed;

  const checkpoints = { ...(remote.checkpoints || {}) };
  for (const [id, c] of Object.entries(local.checkpoints || {})) {
    const r = checkpoints[id];
    checkpoints[id] = r ? { at: Math.min(c.at, r.at), score: Math.max(c.score || 0, r.score || 0) } : c;
  }
  s.checkpoints = checkpoints;

  const interview = { ...(remote.interview || {}) };
  for (const [id, c] of Object.entries(local.interview || {})) {
    const r = interview[id];
    interview[id] = r ? { solvedAt: Math.min(c.solvedAt ?? Infinity, r.solvedAt ?? Infinity), bestSecs: Math.min(c.bestSecs ?? Infinity, r.bestSecs ?? Infinity) } : c;
  }
  s.interview = interview;

  const achievements = { ...(remote.achievements || {}) };
  for (const [id, t] of Object.entries(local.achievements || {})) achievements[id] = Math.min(t, achievements[id] ?? Infinity);
  s.achievements = achievements;

  // revisão espaçada: vale a resposta mais recente de cada exercício
  const stamp = (c) => c?.at ?? (c ? c.due - (c.interval || 0) * DAY : -1);
  const srs = { ...(remote.srs || {}) };
  for (const [k, c] of Object.entries(local.srs || {})) if (!srs[k] || stamp(c) >= stamp(srs[k])) srs[k] = c;
  s.srs = srs;

  const mk = (m) => `${m.lessonId}#${m.stepIndex}`;
  s.mistakes = mergeSet(base.mistakes, local.mistakes || [], remote.mistakes || [], mk).sort((x, y) => (x.at || 0) - (y.at || 0)).slice(-200);

  // missões do dia: só se os dois aparelhos estão no mesmo dia
  if (remote.daily?.day === s.daily.day) {
    const bd = !s.syncBase ? minTree(local.daily, remote.daily) : (base.daily?.day === s.daily.day ? base.daily : {});
    const merged = mergeCounters(bd, local.daily, remote.daily);
    s.daily = { ...s.daily, ...merged, day: s.daily.day, claimed: [...new Set([...(local.daily.claimed || []), ...(remote.daily.claimed || [])])] };
    s.daily.maxCombo = Math.max(num(local.daily.maxCombo), num(remote.daily.maxCombo));
    s.daily.combo = num(local.daily.combo);
  }
  // soluções: vale a mais recente de cada exercício
  const solutions = { ...(remote.solutions || {}) };
  for (const [k, v] of Object.entries(local.solutions || {})) if (!solutions[k] || (v.at || 0) >= (solutions[k].at || 0)) solutions[k] = v;
  s.solutions = solutions;

  // portfólio: o mesmo Gist em todos os aparelhos (vale a configuração mais recente)
  if (remote.portfolio && (remote.portfolio.at || 0) > (s.portfolio.at || 0)) s.portfolio = { ...s.portfolio, ...remote.portfolio };

  // preferências: vale a alteração mais recente (se a opção estiver ligada neste aparelho)
  const rp = remote.prefs;
  if (s.syncCfg.syncPrefs !== false && rp && (rp.at || 0) > (s.prefsAt || 0)) {
    s.settings = { ...s.settings, ...(rp.settings || {}) };
    if (typeof rp.dailyGoal === 'number') s.dailyGoal = rp.dailyGoal;
    if (rp.tutorProvider !== undefined) s.tutor.provider = rp.tutorProvider;
    if (rp.tutorModels) s.tutor.models = { ...s.tutor.models, ...rp.tutorModels };
    s.prefsAt = rp.at;
  } else if (typeof remote.dailyGoal === 'number' && !s.syncBase && !rp) s.dailyGoal = remote.dailyGoal;

  s.syncBase = syncPayload();
  save();
  return JSON.stringify(syncPayload()) !== before;
}
