import { SQL_COURSE } from './sql-course.js';
import { PYTHON_COURSE } from './python-course.js';
import { STATS_COURSE } from './stats-course.js';
import { SQL_THEORY } from './theory-sql.js';
import { PY_THEORY } from './theory-python.js';
import { STATS_THEORY } from './theory-stats.js';
import { SQL_PLUS } from './sql-plus.js';
import { PY_PLUS } from './py-plus.js';
import { STATS_PLUS } from './stats-plus.js';

export const COURSES = [SQL_COURSE, PYTHON_COURSE, STATS_COURSE];

// Teoria antes da prática: os cards de aprofundamento entram logo depois da teoria
// de abertura da lição, antes do primeiro exercício. Um card com { before: n } entra
// antes do passo n (índice original), para explicar um exercício do meio da lição.
// Conteúdo adicional (*-plus.js): { examples: {lessonId: [passos]}, lessons: [{unit, after?, lesson}], units: [{after|before, unit}] }
const PLUS = { sql: SQL_PLUS, python: PY_PLUS, stats: STATS_PLUS };
for (const course of COURSES) {
  const plus = PLUS[course.id];
  if (!plus || course._plusMerged) continue;
  course._plusMerged = true;
  for (const { after, before, unit } of plus.units || []) {
    const i = course.units.findIndex((u) => u.id === (after || before));
    if (i < 0) throw new Error(`unidade de referência não encontrada: ${after || before}`);
    course.units.splice(after ? i + 1 : i, 0, unit);
  }
  for (const { unit: unitId, after, first, lesson } of plus.lessons || []) {
    const unit = course.units.find((u) => u.id === unitId);
    if (!unit) throw new Error(`unidade não encontrada: ${unitId}`);
    if (first) unit.lessons.unshift(lesson);
    else if (after) unit.lessons.splice(unit.lessons.findIndex((l) => l.id === after) + 1, 0, lesson);
    else unit.lessons.push(lesson);
  }
}
const mergeMaps = (...maps) => {
  const out = {};
  for (const m of maps) for (const [k, v] of Object.entries(m || {})) out[k] = [...(out[k] || []), ...v];
  return out;
};
const EXTRA_THEORY = mergeMaps(SQL_THEORY, PY_THEORY, STATS_THEORY, SQL_PLUS.examples, PY_PLUS.examples, STATS_PLUS.examples);
for (const course of COURSES) {
  for (const unit of course.units) {
    for (const lesson of unit.lessons) {
      const extra = EXTRA_THEORY[lesson.id];
      if (!extra || lesson._theoryMerged) continue;
      const original = lesson.steps;
      const firstEx = original.findIndex((s) => s.type !== 'theory');
      const at = (card) => (card.before ?? (firstEx < 0 ? original.length : firstEx));
      const steps = [];
      original.forEach((step, i) => {
        for (const card of extra) if (at(card) === i) steps.push(card);
        steps.push(step);
      });
      for (const card of extra) if (at(card) >= original.length) steps.push(card);
      lesson.steps = steps;
      lesson._theoryMerged = true;
    }
  }
}

export function findLesson(lessonId) {
  for (const course of COURSES) {
    for (const unit of course.units) {
      const idx = unit.lessons.findIndex((l) => l.id === lessonId);
      if (idx >= 0) return { course, unit, lesson: unit.lessons[idx] };
    }
  }
  return null;
}

export function allLessons(course) {
  return course.units.flatMap((u) => u.lessons.map((l) => ({ ...l, unitId: u.id })));
}

// Níveis das trilhas (do básico ao especialista)
export const TRACK_LEVELS = [
  { id: 1, name: 'Básico' },
  { id: 2, name: 'Intermediário' },
  { id: 3, name: 'Avançado' },
  { id: 4, name: 'Especialista' },
];

export const LEVEL_DESC = {
  sql: { 1: 'SELECT, filtros e agregações', 2: 'JOINs, subqueries e CTEs', 3: 'Window functions, datas, modelagem e transações', 4: 'Performance, análises de negócio e padrões de engenharia de dados' },
  python: { 1: 'Python essencial e NumPy', 2: 'pandas: seleção, agregação, junção e limpeza', 3: 'Séries temporais, visualização, extração de dados e estatística', 4: 'Desempenho, dados maiores que a memória e código de produção' },
  stats: { 1: 'Conceitos, estatística descritiva e probabilidade', 2: 'Intervalos de confiança, testes A/B, regressão e ANOVA', 3: 'Séries temporais, não paramétricos, regressão avançada e poder', 4: 'Bayesiana, verossimilhança, inferência causal e experimentação avançada' },
};

export const levelOfLesson = (lessonId) => {
  const f = findLesson(lessonId);
  return f ? TRACK_LEVELS.find((l) => l.id === f.unit.level) : null;
};
