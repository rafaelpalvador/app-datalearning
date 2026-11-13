import { COURSES, allLessons } from './content/index.js';
import { INTERVIEW, INTERVIEW_SQL, INTERVIEW_PY } from './content/interview.js';
import * as store from './state.js';

// ───────────── Missões diárias (3 por dia, sorteadas de forma determinística pela data)
const MISSION_POOL = [
  { id: 'xp', icon: 'bolt', key: 'xp', target: 40, text: 'Ganhe 40 XP' },
  { id: 'lessons', icon: 'book', key: 'lessons', target: 2, text: 'Conclua 2 lições' },
  { id: 'perfect', icon: 'target', key: 'perfect', target: 1, text: 'Termine 1 lição sem errar' },
  { id: 'sql', icon: 'database', key: 'sql', target: 5, text: 'Acerte 5 exercícios de SQL' },
  { id: 'python', icon: 'code', key: 'python', target: 3, text: 'Acerte 3 exercícios de Python' },
  { id: 'review', icon: 'repeat', key: 'review', target: 5, text: 'Acerte 5 revisões' },
  { id: 'theory', icon: 'reader', key: 'theory', target: 4, text: 'Estude 4 cards de teoria' },
  { id: 'combo', icon: 'spark', key: 'maxCombo', target: 8, text: 'Acerte 8 seguidas' },
];
export const MISSION_REWARD = 10; // XP de bônus por missão

function seededPick(arr, n, seed) {
  let x = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rand = () => ((x = (x * 1103515245 + 12345) >>> 0) / 2 ** 32);
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  return out;
}

export function dailyMissions() {
  const s = store.getState();
  return seededPick(MISSION_POOL, 3, s.daily.day).map((m) => {
    const value = s.daily[m.key] || 0;
    return { ...m, value: Math.min(value, m.target), done: value >= m.target, claimed: s.daily.claimed.includes(m.id) };
  });
}

// Resgata automaticamente missões concluídas (+XP); devolve as recém-concluídas.
export function settleMissions() {
  const done = dailyMissions().filter((m) => m.done && !m.claimed && store.claimMission(m.id));
  if (done.length) store.addXp(done.length * MISSION_REWARD);
  return done;
}

// ───────────── Conquistas
const unitDone = (unitId) => {
  const s = store.getState();
  for (const c of COURSES) {
    const u = c.units.find((x) => x.id === unitId);
    if (u) return u.lessons.every((l) => s.completed[l.id]);
  }
  return false;
};
const courseDone = (courseId) => {
  const s = store.getState();
  return allLessons(COURSES.find((c) => c.id === courseId)).every((l) => s.completed[l.id]);
};
const levelDone = (courseId, level) => {
  const s = store.getState();
  return COURSES.find((c) => c.id === courseId).units.filter((u) => u.level === level).every((u) => u.lessons.every((l) => s.completed[l.id]));
};
const nLessons = () => Object.keys(store.getState().completed).length;
const solvedIn = (list, level) => list.filter((p) => (!level || p.level === level) && store.getState().interview[p.id]).length;

export const ACHIEVEMENTS = [
  { id: 'first', icon: 'seed', title: 'Primeiro passo', desc: 'Conclua sua primeira lição', test: () => nLessons() >= 1 },
  { id: 'l10', icon: 'book', title: 'Estudante dedicado', desc: 'Conclua 10 lições', test: () => nLessons() >= 10 },
  { id: 'l30', icon: 'cap', title: 'Maratonista', desc: 'Conclua 30 lições', test: () => nLessons() >= 30 },
  { id: 'days7', icon: 'calendar', title: 'Constância', desc: 'Estude em 7 dias diferentes', test: () => store.daysStudied() >= 7 },
  { id: 'days30', icon: 'calendar', title: 'Hábito formado', desc: 'Estude em 30 dias diferentes', test: () => store.daysStudied() >= 30 },
  { id: 'theory50', icon: 'reader', title: 'Leitor voraz', desc: 'Estude 50 cards de teoria', test: (s) => s.totals.theoryRead >= 50 },
  { id: 'lvl4', icon: 'trend', title: 'Promovido a Pleno', desc: 'Alcance o nível Analista Pleno I', test: (s) => store.levelInfo(s.xp).index >= 4 },
  { id: 'lvl8', icon: 'crown', title: 'Especialista', desc: 'Alcance o nível Especialista em Dados', test: (s) => store.levelInfo(s.xp).index >= 8 },
  { id: 'perfect', icon: 'target', title: 'Perfeccionista', desc: 'Termine 5 lições sem errar', test: (s) => s.totals.perfectLessons >= 5 },
  { id: 'combo15', icon: 'spark', title: 'Mira certeira', desc: 'Acerte 15 exercícios seguidos', test: (s) => s.totals.maxCombo >= 15 },
  { id: 'joins', icon: 'link', title: 'Mestre dos JOINs', desc: 'Conclua a unidade de JOINs', test: () => unitDone('sql-u4') },
  { id: 'window', icon: 'window', title: 'Janela aberta', desc: 'Conclua a unidade de window functions', test: () => unitDone('sql-u6') },
  { id: 'pandas', icon: 'table', title: 'Domador de pandas', desc: 'Conclua "pandas: agregar e combinar"', test: () => unitDone('py-u4') },
  { id: 'abtest', icon: 'flask', title: 'Experimentador', desc: 'Conclua a unidade de testes A/B', test: () => unitDone('st-u4') },
  { id: 'sqlall', icon: 'database', title: 'SQL completo', desc: 'Conclua toda a trilha de SQL', test: () => courseDone('sql') },
  { id: 'pyall', icon: 'code', title: 'Pythonista de dados', desc: 'Conclua toda a trilha de Python', test: () => courseDone('python') },
  { id: 'statall', icon: 'sigma', title: 'Estatístico', desc: 'Conclua toda a trilha de Estatística', test: () => courseDone('stats') },
  { id: 'sqlL2', icon: 'database', title: 'SQL intermediário', desc: 'Conclua o nível Intermediário de SQL', test: () => levelDone('sql', 2) },
  { id: 'sqlL4', icon: 'crown', title: 'Especialista em SQL', desc: 'Conclua o nível Especialista de SQL', test: () => levelDone('sql', 4) },
  { id: 'pyL2', icon: 'code', title: 'Python intermediário', desc: 'Conclua o nível Intermediário de Python', test: () => levelDone('python', 2) },
  { id: 'pyL4', icon: 'crown', title: 'Especialista em Python', desc: 'Conclua o nível Especialista de Python', test: () => levelDone('python', 4) },
  { id: 'stL2', icon: 'sigma', title: 'Inferência dominada', desc: 'Conclua o nível Intermediário de Estatística', test: () => levelDone('stats', 2) },
  { id: 'stL3', icon: 'chart', title: 'Estatístico avançado', desc: 'Conclua o nível Avançado de Estatística', test: () => levelDone('stats', 3) },
  { id: 'stL4', icon: 'crown', title: 'Especialista em Estatística', desc: 'Conclua o nível Especialista de Estatística: bayesiana, causalidade e experimentação', test: () => levelDone('stats', 4) },
  { id: 'checkpoint', icon: 'flag', title: 'Atalho merecido', desc: 'Passe em um checkpoint de unidade', test: (s) => Object.keys(s.checkpoints).length >= 1 },
  { id: 'iv1', icon: 'briefcase', title: 'Primeira entrevista', desc: 'Resolva um problema de entrevista', test: (s) => Object.keys(s.interview).length >= 1 },
  { id: 'ivsql2', icon: 'database', title: 'Pleno em SQL', desc: 'Resolva todos os problemas de SQL nível Pleno', test: () => solvedIn(INTERVIEW_SQL, 2) === INTERVIEW_SQL.filter((p) => p.level === 2).length },
  { id: 'ivpy2', icon: 'code', title: 'Pleno em Python', desc: 'Resolva todos os problemas de Python nível Pleno', test: () => solvedIn(INTERVIEW_PY, 2) === INTERVIEW_PY.filter((p) => p.level === 2).length },
  { id: 'iv4', icon: 'medal', title: 'Pronto para sênior', desc: 'Resolva 5 problemas nível Especialista', test: () => solvedIn(INTERVIEW, 4) >= 5 },
  { id: 'ivall', icon: 'trophy', title: 'Contratado!', desc: `Resolva todos os ${INTERVIEW.length} problemas de entrevista`, test: (s) => INTERVIEW.every((p) => s.interview[p.id]) },
  { id: 'tutor', icon: 'chat', title: 'Curioso', desc: 'Tire uma dúvida com o tutor', test: (s) => s.totals.tutorQuestions >= 1 },
  { id: 'review20', icon: 'brain', title: 'Memória de elefante', desc: 'Tenha 20 exercícios na revisão espaçada', test: (s) => Object.keys(s.srs).length >= 20 },
];

// Verifica e desbloqueia; devolve as novas conquistas.
export function checkAchievements() {
  const s = store.getState();
  return ACHIEVEMENTS.filter((a) => !s.achievements[a.id] && a.test(s) && store.unlockAchievement(a.id));
}
