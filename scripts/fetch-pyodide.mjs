// Baixa o Pyodide e extrai SÓ o necessário para o DataLingo funcionar offline
// (núcleo do Python + pandas, NumPy, matplotlib, BeautifulSoup, sqlite3 e dependências).
// Resultado: vendor/pyodide/  (~40 MB). Usado pelos apps de desktop e Android.
//
// uso: node scripts/fetch-pyodide.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const VERSION = '0.27.2';
const PACKAGES = ['numpy', 'pandas', 'matplotlib', 'beautifulsoup4', 'sqlite3', 'micropip'];
const CORE = ['pyodide.js', 'pyodide.mjs', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = path.join(root, '.cache');
const outDir = path.join(root, 'vendor', 'pyodide');
const tarball = path.join(cacheDir, `pyodide-${VERSION}.tar.bz2`);
const url = `https://github.com/pyodide/pyodide/releases/download/${VERSION}/pyodide-${VERSION}.tar.bz2`;

if (fs.existsSync(path.join(outDir, '.version')) && fs.readFileSync(path.join(outDir, '.version'), 'utf8').trim() === VERSION) {
  console.log(`Pyodide ${VERSION} já está em vendor/pyodide`);
  process.exit(0);
}

fs.mkdirSync(cacheDir, { recursive: true });
if (!fs.existsSync(tarball)) {
  console.log(`Baixando ${url} ...`);
  execFileSync('curl', ['-fL', '--retry', '4', '-o', tarball, url], { stdio: 'inherit' });
}

// lê o lockfile de dentro do tar para resolver as dependências
const lock = JSON.parse(execFileSync('tar', ['-xjOf', tarball, 'pyodide/pyodide-lock.json'], { maxBuffer: 64 * 1024 * 1024 }).toString());
const byName = Object.fromEntries(Object.values(lock.packages).map((p) => [p.name.toLowerCase(), p]));
const wanted = new Set();
const visit = (name) => {
  const p = byName[name.toLowerCase()];
  if (!p) throw new Error(`Pacote não encontrado no Pyodide: ${name}`);
  if (wanted.has(p.name)) return;
  wanted.add(p.name);
  (p.depends || []).forEach(visit);
};
PACKAGES.forEach(visit);

const files = [...CORE, ...[...wanted].map((n) => byName[n.toLowerCase()].file_name)];
console.log(`Extraindo ${files.length} arquivos: ${[...wanted].sort().join(', ')}`);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
execFileSync('tar', ['-xjf', tarball, '-C', outDir, '--strip-components=1', ...files.map((f) => `pyodide/${f}`)], { stdio: 'inherit' });
fs.writeFileSync(path.join(outDir, '.version'), VERSION);

const size = files.reduce((a, f) => a + fs.statSync(path.join(outDir, f)).size, 0);
console.log(`✅ vendor/pyodide pronto (${(size / 1e6).toFixed(1)} MB)`);
