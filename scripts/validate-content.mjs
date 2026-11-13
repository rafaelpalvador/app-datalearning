// Valida todo o conteúdo dos cursos:
//  - estrutura (ids únicos, respostas de quiz válidas, lacunas, etc.)
//  - exercícios SQL: a solução executa e passa na própria correção; o código inicial NÃO passa
//  - exporta os exercícios Python para scripts/validate_python.py validar com CPython
import fs from 'node:fs';
import initSqlJs from 'sql.js';
import { COURSES } from '../js/content/index.js';
import { createDb, evaluateSql } from '../js/engines/sql-engine.js';

const SQL = await initSqlJs();
const errors = [];
const ids = new Set();
const pySteps = [];
const counts = { lessons: 0, steps: 0 };

for (const course of COURSES) {
  for (const unit of course.units) {
    for (const lesson of unit.lessons) {
      counts.lessons++;
      if (ids.has(lesson.id)) errors.push(`id duplicado: ${lesson.id}`);
      ids.add(lesson.id);
      lesson.steps.forEach((step, i) => {
        counts.steps++;
        counts[step.type] = (counts[step.type] || 0) + 1;
        const where = `${lesson.id} passo ${i + 1} (${step.type})`;
        switch (step.type) {
          case 'theory':
            if (!step.title || !step.md) errors.push(`${where}: teoria sem título/conteúdo`);
            break;
          case 'quiz':
            if (!(step.answer >= 0 && step.answer < step.options.length)) errors.push(`${where}: resposta fora do intervalo`);
            break;
          case 'order':
            if (!step.tokens.length) errors.push(`${where}: sem tokens`);
            if (new Set(step.tokens).size !== step.tokens.length) errors.push(`${where}: tokens repetidos tornam a correção ambígua`);
            break;
          case 'fill': {
            const n = step.code.split('___').length - 1;
            if (n !== step.blanks.length) errors.push(`${where}: ${n} lacunas mas ${step.blanks.length} respostas`);
            break;
          }
          case 'sql': {
            const res = evaluateSql(() => createDb(SQL), step, step.solution);
            if (!res.ok) errors.push(`${where}: a solução não passa: ${res.reason}`);
            else if (!res.expected.values.length) errors.push(`${where}: a solução retorna 0 linhas (exercício fraco)`);
            const starter = evaluateSql(() => createDb(SQL), step, step.starter || 'SELECT 1;');
            if (starter.ok) errors.push(`${where}: o código inicial já passa na correção`);
            break;
          }
          case 'python':
            pySteps.push({ where, setup: step.setup, solution: step.solution, starter: step.starter, tests: step.tests });
            break;
          default:
            errors.push(`${where}: tipo desconhecido`);
        }
      });
    }
  }
}

fs.writeFileSync(new URL('./.python-steps.json', import.meta.url), JSON.stringify(pySteps, null, 1));
console.log('Conteúdo:', JSON.stringify(counts));
if (errors.length) {
  console.error(`\n❌ ${errors.length} problema(s):\n- ` + errors.join('\n- '));
  process.exit(1);
}
console.log('✅ Estrutura e exercícios SQL OK');
