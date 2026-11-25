// Valida os exercícios e exemplos de cálculos do Tableau com o motor do app:
// a solução roda e gera resultado; o código inicial (ou vazio) NÃO passa; exemplos rodam sem erro.
import { COURSES } from '../js/content/index.js';
import { SUPERSTORE } from '../js/content/tableau-dataset.js';
import { runTableau, avaliarTableau } from '../js/engines/tableau-engine.js';

const dados = SUPERSTORE();
const erros = [];
let n = 0;
for (const course of COURSES) for (const unit of course.units) for (const lesson of unit.lessons) {
  lesson.steps.forEach((s, i) => {
    const onde = `${lesson.id} passo ${i + 1}`;
    if (s.type === 'example' && s.lang === 'tableau') {
      n++;
      try { runTableau({ dados, calc: s.code, nome: s.nome, dims: s.dims, campos: s.campos, filtro: s.filtro, particao: s.particao, mostrar: s.mostrar, usuario: s.usuario, ordenar: s.ordenar, filtroTabela: s.filtroTabela }); }
      catch (e) { erros.push(`${onde} (exemplo): ${e.message}`); }
    }
    if (s.type !== 'tableau') return;
    n++;
    const ok = avaliarTableau(s, s.solution, dados);
    if (!ok.ok) { erros.push(`${onde}: a solução não passa: ${ok.reason}`); return; }
    if (!ok.got.values.length) erros.push(`${onde}: a solução não gera nenhuma marca`);
    const ini = avaliarTableau(s, s.starter || '', dados);
    if (ini.ok) erros.push(`${onde}: o código inicial já passa`);
  });
}
console.log(`Cálculos Tableau verificados: ${n}`);
if (erros.length) { console.log(`\n❌ ${erros.length} problema(s):`); erros.forEach((e) => console.log('-', e)); process.exit(1); }
console.log('✅ Tableau OK');
