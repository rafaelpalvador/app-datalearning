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
