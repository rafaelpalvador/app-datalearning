// Monta dist/ com os arquivos do app (usado pelo Android/Capacitor).
// Inclui o Python offline (vendor/pyodide) se ele já tiver sido baixado.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const ENTRIES = ['index.html', 'manifest.webmanifest', 'css', 'js', 'vendor', 'icons'];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
for (const e of ENTRIES) {
  fs.cpSync(path.join(root, e), path.join(dist, e), { recursive: true, filter: (src) => !src.endsWith('.map') && !src.endsWith('.version') });
}

// Com o Pyodide local, aponta o app direto para ele (sem depender de requisição HEAD).
if (fs.existsSync(path.join(dist, 'vendor', 'pyodide', 'pyodide.js'))) {
  const html = path.join(dist, 'index.html');
  fs.writeFileSync(html, fs.readFileSync(html, 'utf8').replace(
    '<script src="vendor/sql-wasm.js"></script>',
    '<script>window.DATALINGO_PYODIDE_URL = new URL("vendor/pyodide/", location.href).href;</script>\n  <script src="vendor/sql-wasm.js"></script>',
  ));
  console.log('✔ Python offline incluído');
} else {
  console.log('⚠ vendor/pyodide ausente: o Python será baixado da internet no 1º uso (rode npm run fetch:pyodide)');
}
const size = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((a, d) => a + (d.isDirectory() ? size(path.join(dir, d.name)) : fs.statSync(path.join(dir, d.name)).size), 0);
console.log(`✅ dist/ pronto (${(size(dist) / 1e6).toFixed(1)} MB)`);
