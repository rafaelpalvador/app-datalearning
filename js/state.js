// Progresso do aluno salvo no aparelho (localStorage).
// Para sincronizar entre celular e PC sem servidor: Perfil → Backup (código de exportação).

const KEY = 'datalingo:v1';
export const MAX_HEARTS = 5;
export const MAX_FREEZES = 2;
export const FREEZE_PRICE = 50;
const HEART_REGEN_MS = 30 * 60 * 1000; // 1 vida a cada 30 min
const DAY = 86400000;

// data local (não UTC), para a ofensiva virar à meia-noite do aluno
export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / DAY);

function freshDaily() {
  return { day: today(), xp: 0, lessons: 0, perfect: 0, sql: 0, python: 0, review: 0, combo: 0, maxCombo: 0, claimed: [] };
}

function defaults() {
  return {
    xp: 0,
    gems: 20,
    streak: 0,
    bestStreak: 0,
    freezes: 0,
    lastActiveDay: null,
    dailyGoal: 30,
    hearts: MAX_HEARTS,
    heartsUpdatedAt: Date.now(),
    completed: {},     // lessonId -> { at, stars, bestMistakes }
    checkpoints: {},   // unitId -> { at, score }
    mistakes: [],      // [{ lessonId, stepIndex, at }]
    srs: {},           // 'lessonId#stepIndex' -> { ease, interval, due, reps, lapses }
    interview: {},     // problemId -> { solvedAt, bestSecs }
    achievements: {},  // id -> timestamp
    history: {},       // 'AAAA-MM-DD' -> xp do dia (heatmap)
    daily: freshDaily(),
    reminder: { enabled: false, hour: 19, minute: 0 },
    totals: { correct: 0, answered: 0, perfectLessons: 0, maxCombo: 0 },
  };
}

let state = null;
const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);

export function getState() {
  if (state) return state;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    const d = defaults();
    state = { ...d, ...saved, totals: { ...d.totals, ...(saved.totals || {}) }, daily: saved.daily || d.daily, reminder: { ...d.reminder, ...(saved.reminder || {}) } };
    // migração da v1 (todayXp/todayDay)
    if (saved.todayDay && !saved.daily) state.daily = { ...freshDaily(), day: saved.todayDay, xp: saved.todayXp || 0 };
  } catch {
    state = defaults();
  }
  refresh();
  return state;
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* armazenamento indisponível */ }
  listeners.forEach((fn) => fn(state));
}

// Regenera vidas, vira o dia e aplica protetores de ofensiva.
export function refresh() {
  const s = state;
  if (s.hearts < MAX_HEARTS) {
    const gained = Math.floor((Date.now() - s.heartsUpdatedAt) / HEART_REGEN_MS);
    if (gained > 0) {
      s.hearts = Math.min(MAX_HEARTS, s.hearts + gained);
      s.heartsUpdatedAt += gained * HEART_REGEN_MS;
    }
  } else {
    s.heartsUpdatedAt = Date.now();
  }
  if (s.daily.day !== today()) s.daily = freshDaily();
  if (s.lastActiveDay && s.streak > 0) {
    const missed = daysBetween(s.lastActiveDay, today()) - 1; // dias inteiros sem praticar
    if (missed > 0) {
      if (s.freezes >= missed) {
        s.freezes -= missed;
        // o protetor "preenche" os dias perdidos: a ofensiva continua viva
        s.lastActiveDay = today(new Date(Date.now() - DAY));
        s.frozeNotice = missed;
      } else {
        s.streak = 0;
      }
    }
  }
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* */ }
}

export function minutesToNextHeart() {
  const s = getState();
  if (s.hearts >= MAX_HEARTS) return 0;
  return Math.max(1, Math.ceil((HEART_REGEN_MS - (Date.now() - s.heartsUpdatedAt)) / 60000));
}

export function loseHeart() {
  const s = getState();
  if (s.hearts === MAX_HEARTS) s.heartsUpdatedAt = Date.now();
  s.hearts = Math.max(0, s.hearts - 1);
  save();
  return s.hearts;
}

export function gainHeart(n = 1) {
  const s = getState();
  s.hearts = Math.min(MAX_HEARTS, s.hearts + n);
  save();
}

export function refillHearts() {
  const s = getState();
  if (s.gems < 30 || s.hearts >= MAX_HEARTS) return false;
  s.gems -= 30;
  s.hearts = MAX_HEARTS;
  save();
  return true;
}

export function addXp(amount) {
  const s = getState();
  s.xp += amount;
  s.daily.xp += amount;
  s.history[today()] = (s.history[today()] || 0) + amount;
  if (s.lastActiveDay !== today()) {
    const diff = s.lastActiveDay ? daysBetween(s.lastActiveDay, today()) : null;
    s.streak = diff === 1 ? s.streak + 1 : 1;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    s.lastActiveDay = today();
  }
  save();
}

export function addGems(n) {
  getState().gems += n;
  save();
}

export function buyFreeze() {
  const s = getState();
  if (s.gems < FREEZE_PRICE || s.freezes >= MAX_FREEZES) return false;
  s.gems -= FREEZE_PRICE;
  s.freezes += 1;
  save();
  return true;
}

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

// Registra cada resposta: alimenta missões, combo e a revisão espaçada.
export function recordAnswer({ lessonId, stepIndex, type, correct, review = false }) {
  const s = getState();
  s.totals.answered += 1;
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
  const s = state;
  const c = s.srs[key] || { ease: 2.5, interval: 0, due: 0, reps: 0, lapses: 0 };
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
  s.srs[key] = c;
}

export function dueCards(now = Date.now()) {
  const s = getState();
  return Object.entries(s.srs)
    .filter(([, c]) => c.due <= now)
    .sort((a, b) => a[1].due - b[1].due)
    .map(([key, c]) => {
      const i = key.lastIndexOf('#');
      return { lessonId: key.slice(0, i), stepIndex: Number(key.slice(i + 1)), card: c };
    });
}

export function srsStrength(lessonIds) {
  // força média (0–1) dos cards de um conjunto de lições, para o radar de habilidades
  const s = getState();
  const cards = Object.entries(s.srs).filter(([k]) => lessonIds.includes(k.slice(0, k.lastIndexOf('#')))).map(([, c]) => c);
  if (!cards.length) return 0;
  const score = cards.reduce((a, c) => a + Math.min(1, (c.reps + 1) / 4) * (c.due > Date.now() ? 1 : 0.6), 0);
  return score / cards.length;
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
export function claimMission(id, gems) {
  const s = getState();
  if (s.daily.claimed.includes(id)) return false;
  s.daily.claimed.push(id);
  s.gems += gems;
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

export function consumeFrozeNotice() {
  const s = getState();
  const n = s.frozeNotice;
  delete s.frozeNotice;
  if (n) save();
  return n;
}

// Progresso de exemplo para a versão de demonstração (window.DATALINGO_DEMO).
export function seedDemo([sqlIds, pyIds], interviewIds) {
  const s = defaults();
  const now = Date.now();
  const done = [...sqlIds.slice(0, 11), ...pyIds.slice(0, 5)];
  done.forEach((id, i) => {
    s.completed[id] = { at: now - (done.length - i) * DAY * 2, stars: [3, 2, 3, 3, 1, 3, 2, 3][i % 8], bestMistakes: i % 3 };
    for (let k = 1; k < 6; k++) {
      s.srs[`${id}#${k}`] = { ease: 2.5, interval: 3, reps: 2, lapses: i % 4 === 0 ? 1 : 0, due: now + ((i + k) % 5 === 0 ? -DAY : DAY * ((i + k) % 7)) };
    }
  });
  for (let d = 0; d < 70; d++) {
    if (d < 6 || (d * 7) % 5 > 1) s.history[today(new Date(now - d * DAY))] = d === 0 ? 25 : 15 + ((d * 37) % 90);
  }
  Object.assign(s, {
    xp: Object.values(s.history).reduce((a, b) => a + b, 0), gems: 85, streak: 6, bestStreak: 12, freezes: 1,
    hearts: 4, lastActiveDay: today(), demoSeeded: true,
  });
  s.daily = { ...freshDaily(), xp: 25, lessons: 1, sql: 4, python: 2, review: 3, combo: 4, maxCombo: 6 };
  s.totals = { correct: 214, answered: 251, perfectLessons: 5, maxCombo: 17 };
  s.mistakes = [{ lessonId: sqlIds[4], stepIndex: 2, at: now }, { lessonId: sqlIds[9], stepIndex: 3, at: now }, { lessonId: pyIds[3], stepIndex: 1, at: now }];
  s.interview = { [interviewIds[0]]: { solvedAt: now - DAY, bestSecs: 142 }, [interviewIds[2]]: { solvedAt: now, bestSecs: 61 } };
  state = s;
  save();
}

export function resetProgress() {
  state = { ...defaults(), demoSeeded: !!state?.demoSeeded };
  save();
}

// ───────────── backup / sincronização manual entre aparelhos
export function exportCode() {
  const json = JSON.stringify(getState());
  return 'DL1:' + btoa(unescape(encodeURIComponent(json)));
}

export function importCode(code) {
  const raw = code.trim();
  if (!raw.startsWith('DL1:')) throw new Error('Código inválido: ele deve começar com DL1:');
  const data = JSON.parse(decodeURIComponent(escape(atob(raw.slice(4)))));
  if (typeof data !== 'object' || data === null || typeof data.xp !== 'number') throw new Error('Código inválido.');
  localStorage.setItem(KEY, JSON.stringify(data));
  state = null;
  return getState();
}
