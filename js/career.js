// Cargo do aluno: reflete o CONTEÚDO DOMINADO (lições concluídas), não o XP.
// XP continua existindo como pontuação de esforço (prática, revisões, missões), mas não promove:
// antes, repetir práticas rendia XP sem limite e levava a "Analista Júnior" com 12% de um curso.
import { COURSES } from './content/index.js';
import { isSkipped } from './state.js';

// Cada lição concluída vale o seu nível na trilha (1 a 5): lições avançadas pesam mais.
// Referências: o Nível 1 inteiro de SQL vale 13 pontos; o currículo inteiro, ~530.
export const CAREER = [
  { pts: 0, title: 'Estagiário de Dados' },
  { pts: 13, title: 'Analista Júnior I' },      // ≈ o Nível 1 inteiro de uma trilha
  { pts: 35, title: 'Analista Júnior II' },     // ≈ Níveis 1 e 2 de uma trilha
  { pts: 70, title: 'Analista Pleno I' },       // ≈ uma trilha completa (SQL ou Python)
  { pts: 120, title: 'Analista Pleno II' },
  { pts: 180, title: 'Analista Sênior I' },
  { pts: 260, title: 'Analista Sênior II' },
  { pts: 360, title: 'Especialista em Dados' },
  { pts: 480, title: 'Head de Dados' },
];

let info = null;
function licoes() {
  if (info) return info;
  info = {};
  for (const c of COURSES) for (const u of c.units) for (const l of u.lessons) info[l.id] = { peso: u.level || 1, unit: u.id };
  return info;
}

/** A lição conta como pulada (checkpoint ou "desbloquear tudo") e não como estudada? */
export function skippedLesson(state, lessonId) {
  const l = licoes()[lessonId];
  return isSkipped(state.completed?.[lessonId], l ? state.checkpoints?.[l.unit]?.at : null);
}

/**
 * Pontos de competência: soma do nível de cada lição concluída.
 * Lições puladas (checkpoint ou "desbloquear tudo") não valem: o cargo mostra o que você ESTUDOU.
 */
export function competencePoints(state) {
  const w = licoes();
  let pts = 0;
  for (const [id, entry] of Object.entries(state.completed || {})) {
    if (!w[id]) continue;
    if (!skippedLesson(state, id)) pts += w[id].peso;
  }
  return pts;
}

export const careerOf = (state) => careerInfo(competencePoints(state));

export function careerInfo(pts = 0) {
  let i = 0;
  while (i + 1 < CAREER.length && pts >= CAREER[i + 1].pts) i++;
  const cur = CAREER[i];
  const next = CAREER[i + 1];
  return {
    index: i + 1,
    title: cur.title,
    pts,
    next: next?.title ?? null,
    progress: next ? (pts - cur.pts) / (next.pts - cur.pts) : 1,
    toNext: next ? next.pts - pts : 0,
  };
}

// ───────────── Cargo por trilha
// Cada trilha tem a sua escada, medida pela fração dos pontos da trilha que você estudou.
export const TRACK_ROLE = { sql: 'SQL', python: 'Python para dados', stats: 'Estatística', db: 'Bancos de Dados' };
export const TRACK_RANKS = [
  { pct: 0, title: 'Estagiário' },
  { pct: 8, title: 'Júnior I' },
  { pct: 18, title: 'Júnior II' },
  { pct: 30, title: 'Pleno I' },
  { pct: 42, title: 'Pleno II' },
  { pct: 56, title: 'Sênior I' },
  { pct: 72, title: 'Sênior II' },
  { pct: 90, title: 'Especialista' },
];

export function trackCareer(state, courseId) {
  const course = COURSES.find((c) => c.id === courseId);
  let total = 0;
  let pts = 0;
  for (const u of course?.units || []) {
    for (const l of u.lessons) {
      const peso = u.level || 1;
      total += peso;
      if (state.completed?.[l.id] && !skippedLesson(state, l.id)) pts += peso;
    }
  }
  const pct = total ? (pts / total) * 100 : 0;
  let i = 0;
  while (i + 1 < TRACK_RANKS.length && pct >= TRACK_RANKS[i + 1].pct) i++;
  const cur = TRACK_RANKS[i];
  const next = TRACK_RANKS[i + 1];
  const ptsNext = next ? Math.ceil((next.pct / 100) * total) : total;
  const ptsCur = Math.ceil((cur.pct / 100) * total);
  return {
    courseId,
    area: TRACK_ROLE[courseId] || course?.title || courseId,
    index: i + 1,
    rank: cur.title,
    title: `${cur.title} em ${TRACK_ROLE[courseId] || course?.title}`,
    pts,
    total,
    pct: Math.round(pct),
    next: next?.title ?? null,
    toNext: next ? Math.max(0, ptsNext - pts) : 0,
    progress: next ? Math.min(1, (pts - ptsCur) / Math.max(1, ptsNext - ptsCur)) : 1,
  };
}

export const trackCareers = (state) => COURSES.map((c) => trackCareer(state, c.id));
