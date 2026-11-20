// Gera os arquivos do laboratório local (labs/postgres) a partir do conteúdo do curso:
//   - initdb/10_erp.sql: a mesma base do app, em escala maior (padrão 10 ≈ 2 milhões de itens de pedido)
//   - projetos/*.sql: as soluções de referência dos projetos de cada nível, comentadas
// Uso: node scripts/gerar-lab.mjs [escala]
//   escala 10  → ≈ 800 mil pedidos e 2 milhões de itens (Níveis 2 e 3)
//   escala 100 → ≈ 8 milhões de pedidos e 20 milhões de itens (tuning do Nível 4)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pgBuildSql } from '../js/content/pg-dataset.js';
import { DB_COURSE } from '../js/content/db-course.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lab = path.join(root, 'labs', 'postgres');
const escala = Number(process.argv[2] || 10);
if (!(escala >= 1)) { console.error('Escala inválida'); process.exit(1); }

fs.mkdirSync(path.join(lab, 'initdb'), { recursive: true });
fs.mkdirSync(path.join(lab, 'projetos'), { recursive: true });

const cabecalho = `-- Gerado por scripts/gerar-lab.mjs (escala ${escala}). Não edite: rode o gerador de novo.\n`;
fs.writeFileSync(path.join(lab, 'initdb', '10_erp.sql'), `${cabecalho}\\timing on\n${pgBuildSql(escala)}\n`);

const limpa = (md) => String(md || '').replace(/[`*]/g, '').replace(/\s+/g, ' ').trim();
const projetos = {
  'db-1-8': 'nivel1_erp.sql',
  'db-2-8': 'nivel2_saneamento_relatorios.sql',
  'db-3-8': 'nivel3_ledger.sql',
  'db-4-11': 'nivel4_tuning.sql',
  'db-5-8': 'nivel5_analitico.sql',
};
for (const unit of DB_COURSE.units) {
  for (const lesson of unit.lessons) {
    const arquivo = projetos[lesson.id];
    if (!arquivo) continue;
    const partes = [`${cabecalho}-- Nível ${unit.level} · ${lesson.title}\n-- Cada bloco é independente: rode um de cada vez no psql (\\i) ou no DBeaver.\n`];
    lesson.steps.forEach((s, i) => {
      if (s.type === 'example' && s.lang === 'pg') partes.push(`\n-- ===== Exemplo: ${limpa(s.title)} =====\nBEGIN;\n${s.code.trim()}\nROLLBACK;\n`);
      if (s.type === 'sql' && s.engine === 'pg') {
        partes.push(`\n-- ===== Passo ${i + 1}: ${limpa(s.prompt).slice(0, 300)} =====\nBEGIN;\n${s.solution.trim()}\n${s.check ? `-- conferência usada pelo app:\n${s.check.trim()}\n` : ''}ROLLBACK;  -- troque por COMMIT para manter\n`);
      }
    });
    fs.writeFileSync(path.join(lab, 'projetos', arquivo), partes.join(''));
  }
}
console.log(`✅ labs/postgres gerado (escala ${escala})`);
