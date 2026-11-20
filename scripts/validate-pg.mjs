// Valida os exercícios e exemplos da trilha de Bancos de Dados no PostgreSQL 18 (PGlite em Node):
//  - a solução executa e passa na própria correção (e retorna linhas, salvo allowEmpty)
//  - o código inicial NÃO passa
//  - os exemplos executam sem erro
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { COURSES } from '../js/content/index.js';
import { INTERVIEW } from '../js/content/interview.js';
import { pgBuildSql } from '../js/content/pg-dataset.js';
import { evaluatePg, runIsolated } from '../js/engines/pg-core.js';

const extensions = { pg_trgm };
const t0 = performance.now();
const db = await PGlite.create({ extensions });
await db.exec(pgBuildSql(1));
const dump = await db.dumpDataDir('none');
const getFresh = () => PGlite.create({ loadDataDir: dump, extensions });
const errors = [];
let n = 0;
const only = process.argv[2]; // opcional: id de lição para validar só ela

async function checkStep(step, where) {
  n++;
  const res = await evaluatePg(db, getFresh, step, step.solution);
  if (!res.ok) { errors.push(`${where}: a solução não passa: ${res.reason}`); return; }
  if (!step.allowEmpty && !res.expected.values.length) errors.push(`${where}: a solução retorna 0 linhas (exercício fraco)`);
  const starter = await evaluatePg(db, getFresh, step, step.starter || 'SELECT 1;');
  if (starter.ok) errors.push(`${where}: o código inicial já passa na correção`);
}

for (const c of COURSES) for (const u of c.units) for (const l of u.lessons) {
  if (only && l.id !== only) continue;
  for (const [i, s] of l.steps.entries()) {
    const where = `${l.id} passo ${i + 1}`;
    if (s.type === 'sql' && s.engine === 'pg') await checkStep(s, `${where} (pg)`);
    if (s.type === 'example' && s.lang === 'pg') {
      n++;
      try { await runIsolated(db, getFresh, s.code); } catch (e) { errors.push(`${where} (exemplo pg): ${e.message}`); }
    }
  }
}
for (const p of INTERVIEW) if (p.step.engine === 'pg' && (!only || only === p.id)) await checkStep(p.step, `entrevista ${p.id}`);

await db.close();
console.log(`Exercícios e exemplos PostgreSQL verificados: ${n} (${((performance.now() - t0) / 1000).toFixed(1)} s)`);
if (errors.length) {
  console.error(`\n❌ ${errors.length} problema(s):\n- ` + errors.join('\n- '));
  process.exit(1);
}
console.log('✅ PostgreSQL OK');
