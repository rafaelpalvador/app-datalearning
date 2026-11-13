// Progresso do aluno salvo no navegador (localStorage).
// Num app de produção isso iria para um backend (ver docs/IDEIAS.md).

const KEY = 'datalingo:v1';
export const MAX_HEARTS = 5;
const HEART_REGEN_MS = 30 * 60 * 1000; // 1 vida a cada 30 min

const today = () => new Date().toISOString().slice(0, 10);

function defaults() {
  return {
    xp: 0,
    streak: 0,
    bestStreak: 0,
    lastActiveDay: null,
    todayXp: 0,
    todayDay: today(),
    dailyGoal: 30,
    hearts: MAX_HEARTS,
    heartsUpdatedAt: Date.now(),
    completed: {},   // lessonId -> { at, stars, bestMistakes }
    mistakes: [],    // [{ lessonId, stepIndex, at }]  → base para o modo Revisão
    history: {},     // 'AAAA-MM-DD' -> xp do dia (heatmap)
  };
}

let state = null;

export function getState() {
  if (state) return state;
  try {
    state = { ...defaults(), ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    state = defaults();
  }
  refresh();
  return state;
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* modo privado */ }
}

// Regenera vidas e zera contadores diários quando o dia muda.
export function refresh() {
  const s = state;
  if (s.hearts < MAX_HEARTS) {
    const gained = Math.floor((Date.now() - s.heartsUpdatedAt) / HEART_REGEN_MS);
    if (gained > 0) {
      s.hearts = Math.min(MAX_HEARTS, s.hearts + gained);
      s.heartsUpdatedAt = Date.now();
    }
  } else {
    s.heartsUpdatedAt = Date.now();
  }
  if (s.todayDay !== today()) {
    s.todayDay = today();
    s.todayXp = 0;
  }
  // ofensiva quebra se ficou mais de 1 dia sem praticar
  if (s.lastActiveDay) {
    const diff = (new Date(today()) - new Date(s.lastActiveDay)) / 86400000;
    if (diff > 1) s.streak = 0;
  }
  save();
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

export function addXp(amount) {
  const s = getState();
  s.xp += amount;
  s.todayXp += amount;
  s.history[today()] = (s.history[today()] || 0) + amount;
  if (s.lastActiveDay !== today()) {
    const diff = s.lastActiveDay ? (new Date(today()) - new Date(s.lastActiveDay)) / 86400000 : null;
    s.streak = diff === 1 ? s.streak + 1 : 1;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    s.lastActiveDay = today();
  }
  save();
}

export function completeLesson(lessonId, mistakes) {
  const s = getState();
  const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
  const prev = s.completed[lessonId];
  s.completed[lessonId] = {
    at: Date.now(),
    stars: Math.max(stars, prev?.stars ?? 0),
    bestMistakes: Math.min(mistakes, prev?.bestMistakes ?? Infinity),
  };
  save();
  return stars;
}

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

export function setDailyGoal(xp) {
  getState().dailyGoal = xp;
  save();
}

export function resetProgress() {
  state = defaults();
  save();
}
