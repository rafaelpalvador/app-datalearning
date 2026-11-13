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
    mistakes: [],      // [{ lessonId, stepIndex, at }]
    srs: {},           // 'lessonId#stepIndex' -> { ease, interval, due, reps, lapses }
    interview: {},     // problemId -> { solvedAt, bestSecs, attempts }
    achievements: {},  // id -> timestamp
    history: {},       // 'AAAA-MM-DD' -> xp do dia
    topics: {},        // courseId -> { correct, answered } (estatísticas por trilha)
    daily: freshDaily(),
    reminder: { enabled: false, hour: 19, minute: 0 },
    settings: { sound: true, haptics: true, theme: 'system' },
    tutor: { provider: '', keys: {}, models: {}, baseUrls: {} },
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
  state.srs[key] = c;
}

export function dueCards(now = Date.now()) {
  return Object.entries(getState().srs)
    .filter(([, c]) => c.due <= now)
    .sort((a, b) => a[1].due - b[1].due)
    .map(([key, c]) => {
      const i = key.lastIndexOf('#');
      return { lessonId: key.slice(0, i), stepIndex: Number(key.slice(i + 1)), card: c };
    });
}

export function srsStrength(lessonIds) {
  // domínio médio (0–1) dos exercícios de um conjunto de lições
  const cards = Object.entries(getState().srs).filter(([k]) => lessonIds.includes(k.slice(0, k.lastIndexOf('#')))).map(([, c]) => c);
  if (!cards.length) return 0;
  return cards.reduce((a, c) => a + Math.min(1, (c.reps + 1) / 4) * (c.due > Date.now() ? 1 : 0.6), 0) / cards.length;
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
  save();
}

export function setReminder(r) {
  const s = getState();
  s.reminder = { ...s.reminder, ...r };
  save();
}

export function setSetting(key, value) {
  getState().settings[key] = value;
  save();
}

export function setTutorProvider(id) {
  getState().tutor.provider = id;
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
  const { tutor, ...rest } = getState(); // as chaves de API nunca saem do aparelho
  return 'DL1:' + btoa(unescape(encodeURIComponent(JSON.stringify(rest))));
}

export function importCode(code) {
  const raw = code.trim();
  if (!raw.startsWith('DL1:')) throw new Error('Código inválido: ele deve começar com DL1:');
  const data = JSON.parse(decodeURIComponent(escape(atob(raw.slice(4)))));
  if (typeof data !== 'object' || data === null || typeof data.xp !== 'number') throw new Error('Código inválido.');
  data.tutor = getState().tutor;
  localStorage.setItem(KEY, JSON.stringify(data));
  state = null;
  return getState();
}
