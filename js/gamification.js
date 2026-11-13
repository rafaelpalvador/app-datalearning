import { COURSES, allLessons } from './content/index.js';
import { INTERVIEW } from './content/interview.js';
import * as store from './state.js';

// ───────────── Missões diárias (3 por dia, sorteadas de forma determinística pela data)
const MISSION_POOL = [
  { id: 'xp', icon: '⚡', key: 'xp', target: 40, text: 'Ganhe 40 XP' },
  { id: 'lessons', icon: '📘', key: 'lessons', target: 2, text: 'Conclua 2 lições' },
  { id: 'perfect', icon: '💯', key: 'perfect', target: 1, text: 'Faça 1 lição sem errar' },
  { id: 'sql', icon: '🗄️', key: 'sql', target: 5, text: 'Acerte 5 exercícios de SQL' },
  { id: 'python', icon: '🐍', key: 'python', target: 3, text: 'Acerte 3 exercícios de Python' },
  { id: 'review', icon: '🔁', key: 'review', target: 5, text: 'Acerte 5 revisões' },
  { id: 'combo', icon: '🔥', key: 'maxCombo', target: 8, text: 'Acerte 8 seguidas' },
];
export const MISSION_REWARD = 10;

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

// Resgata automaticamente missões concluídas; devolve as recém-concluídas.
export function settleMissions() {
  return dailyMissions().filter((m) => m.done && !m.claimed && store.claimMission(m.id, MISSION_REWARD));
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
const nLessons = () => Object.keys(store.getState().completed).length;

export const ACHIEVEMENTS = [
  { id: 'first', icon: '🌱', title: 'Primeiro passo', desc: 'Conclua sua primeira lição', test: () => nLessons() >= 1 },
  { id: 'l10', icon: '📚', title: 'Estudante dedicado', desc: 'Conclua 10 lições', test: () => nLessons() >= 10 },
  { id: 'l25', icon: '🎓', title: 'Maratonista', desc: 'Conclua 25 lições', test: () => nLessons() >= 25 },
  { id: 'streak3', icon: '🔥', title: 'Pegando fogo', desc: 'Ofensiva de 3 dias', test: (s) => s.bestStreak >= 3 },
  { id: 'streak7', icon: '📅', title: 'Uma semana inteira', desc: 'Ofensiva de 7 dias', test: (s) => s.bestStreak >= 7 },
  { id: 'streak30', icon: '🏔️', title: 'Hábito formado', desc: 'Ofensiva de 30 dias', test: (s) => s.bestStreak >= 30 },
  { id: 'xp500', icon: '⚡', title: 'Energia pura', desc: 'Junte 500 XP', test: (s) => s.xp >= 500 },
  { id: 'xp2000', icon: '💎', title: 'Lenda dos dados', desc: 'Junte 2000 XP', test: (s) => s.xp >= 2000 },
  { id: 'perfect', icon: '💯', title: 'Perfeccionista', desc: 'Termine 5 lições sem errar', test: (s) => s.totals.perfectLessons >= 5 },
  { id: 'combo15', icon: '🎯', title: 'Mira certeira', desc: 'Acerte 15 exercícios seguidos', test: (s) => s.totals.maxCombo >= 15 },
  { id: 'joins', icon: '🔗', title: 'Mestre dos JOINs', desc: 'Conclua a unidade de JOINs', test: () => unitDone('sql-u4') },
  { id: 'window', icon: '🪟', title: 'Janela aberta', desc: 'Conclua a unidade de window functions', test: () => unitDone('sql-u6') },
  { id: 'pandas', icon: '🐼', title: 'Domador de pandas', desc: 'Conclua "pandas: agregar e combinar"', test: () => unitDone('py-u4') },
  { id: 'scraper', icon: '🕸️', title: 'Extrator', desc: 'Conclua a unidade de extração de dados', test: () => unitDone('py-u8') },
  { id: 'sqlall', icon: '🗄️', title: 'SQL completo', desc: 'Conclua toda a trilha de SQL', test: () => courseDone('sql') },
  { id: 'pyall', icon: '🐍', title: 'Pythonista de dados', desc: 'Conclua toda a trilha de Python', test: () => courseDone('python') },
  { id: 'checkpoint', icon: '🏁', title: 'Atalho merecido', desc: 'Passe em um checkpoint de unidade', test: (s) => Object.keys(s.checkpoints).length >= 1 },
  { id: 'interview1', icon: '💼', title: 'Primeira entrevista', desc: 'Resolva um problema do modo entrevista', test: (s) => Object.keys(s.interview).length >= 1 },
  { id: 'interviewAll', icon: '🏆', title: 'Contratado!', desc: `Resolva todos os ${INTERVIEW.length} problemas de entrevista`, test: (s) => INTERVIEW.every((p) => s.interview[p.id]) },
  { id: 'review20', icon: '🧠', title: 'Memória de elefante', desc: 'Tenha 20 exercícios na revisão espaçada', test: (s) => Object.keys(s.srs).length >= 20 },
];

// Verifica e desbloqueia; devolve as novas conquistas.
export function checkAchievements() {
  const s = store.getState();
  return ACHIEVEMENTS.filter((a) => !s.achievements[a.id] && a.test(s) && store.unlockAchievement(a.id));
}
