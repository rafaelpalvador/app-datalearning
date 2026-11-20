// Copia o PostgreSQL em WebAssembly (PGlite) de node_modules para vendor/pglite,
// para o app funcionar offline. Rode depois de `npm ci` (o CI faz isso antes de cada build).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'node_modules', '@electric-sql', 'pglite', 'dist');
const out = path.join(root, 'vendor', 'pglite');
if (!fs.existsSync(src)) { console.error('PGlite não encontrado: rode npm ci primeiro.'); process.exit(1); }
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'contrib'), { recursive: true });
const keep = (f) => /^(index\.js|chunk-[A-Z0-9]+\.js|pglite\.wasm|pglite\.data|initdb\.wasm|initdb\.js|pg_trgm\.tar\.gz)$/.test(f);
let bytes = 0;
for (const f of fs.readdirSync(src)) {
  if (!keep(f)) continue;
  fs.copyFileSync(path.join(src, f), path.join(out, f));
  bytes += fs.statSync(path.join(out, f)).size;
}
fs.copyFileSync(path.join(src, 'contrib', 'pg_trgm.js'), path.join(out, 'contrib', 'pg_trgm.js'));
const version = JSON.parse(fs.readFileSync(path.join(src, '..', 'package.json'), 'utf8')).version;
fs.writeFileSync(path.join(out, 'VERSION'), version + '\n');
console.log(`✔ PGlite ${version} copiado para vendor/pglite (${(bytes / 1e6).toFixed(1)} MB)`);
