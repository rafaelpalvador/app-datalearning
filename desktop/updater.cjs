// Atualizações do app de desktop a partir das Releases do GitHub.
// Windows (instalado): baixa o instalador novo, roda em modo silencioso e reabre o app.
// Windows portátil e Linux: avisa e abre a página de download.
const { app, ipcMain, net, shell } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const REPO = 'rafaelpalvador/app-datalearning';
const API = `https://api.github.com/repos/${REPO}/releases/latest`;
const PAGE = `https://github.com/${REPO}/releases/latest`;
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;

const isPortable = () => !!process.env.PORTABLE_EXECUTABLE_FILE;
const canInstall = () => process.platform === 'win32' && !isPortable() && app.isPackaged;

// compara versões "1.6.2" (ignora o "v" e sufixos)
function newer(a, b) {
  const pa = String(a).replace(/^v/, '').split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  const pb = String(b).replace(/^v/, '').split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

function pickAsset(assets) {
  if (process.platform === 'win32') {
    const re = isPortable() ? /windows-portable\.exe$/i : /windows-instalador\.exe$/i;
    return assets.find((a) => re.test(a.name));
  }
  if (process.platform === 'linux') return assets.find((a) => /\.AppImage$/i.test(a.name));
  return null;
}

let last = null;

async function check() {
  const res = await net.fetch(API, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Datum-desktop' } });
  if (!res.ok) throw new Error(res.status === 403 ? 'O GitHub limitou as consultas por agora. Tente de novo mais tarde.' : `GitHub respondeu ${res.status}.`);
  const rel = await res.json();
  const latest = String(rel.tag_name || '').replace(/^v/, '');
  const asset = pickAsset(rel.assets || []);
  last = {
    current: app.getVersion(),
    latest,
    available: newer(latest, app.getVersion()),
    notes: rel.body || '',
    publishedAt: rel.published_at,
    page: rel.html_url || PAGE,
    asset: asset ? { name: asset.name, url: asset.browser_download_url, size: asset.size } : null,
    canInstall: canInstall() && !!asset,
    portable: isPortable(),
    platform: process.platform,
  };
  return last;
}

async function download(url, dest, onProgress) {
  const res = await net.fetch(url, { headers: { 'User-Agent': 'Datum-desktop' } });
  if (!res.ok || !res.body) throw new Error(`Falha no download (${res.status}).`);
  const total = Number(res.headers.get('content-length')) || 0;
  const out = fs.createWriteStream(dest);
  const reader = res.body.getReader();
  let got = 0;
  let lastSent = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      got += value.length;
      if (!out.write(Buffer.from(value))) await new Promise((r) => out.once('drain', r));
      const now = Date.now();
      if (now - lastSent > 150) { lastSent = now; onProgress(total ? got / total : 0, got, total); }
    }
  } finally {
    await new Promise((r) => out.end(r));
  }
  if (total && got !== total) throw new Error('O download foi interrompido. Tente de novo.');
  onProgress(1, got, total);
}

async function install(win) {
  const info = last || await check();
  if (!info.available) return { ok: false, message: 'Você já está na versão mais recente.' };
  if (!info.canInstall) {
    shell.openExternal(info.page);
    return { ok: true, opened: true };
  }
  const dest = path.join(os.tmpdir(), info.asset.name);
  await download(info.asset.url, dest, (p, got, total) => win?.webContents.send('update:progress', { p, got, total }));
  // instalador NSIS em modo silencioso; --force-run reabre o Datum ao terminar
  const child = spawn(dest, ['/S', '--updated', '--force-run'], { detached: true, stdio: 'ignore' });
  child.unref();
  setTimeout(() => app.quit(), 600);
  return { ok: true, installing: true };
}

function setup(getWin) {
  ipcMain.on('app:version', (e) => { e.returnValue = app.getVersion(); });
  ipcMain.handle('update:check', async () => {
    try { return await check(); } catch (e) { return { error: e.message || String(e) }; }
  });
  ipcMain.handle('update:install', async () => {
    try { return await install(getWin()); } catch (e) { return { ok: false, message: e.message || String(e) }; }
  });
  ipcMain.handle('update:open', () => { shell.openExternal(last?.page || PAGE); return true; });

  // verificação automática: alguns segundos depois de abrir e a cada 6 horas
  const auto = async () => {
    try {
      const info = await check();
      if (info.available) getWin()?.webContents.send('update:available', info);
    } catch { /* sem internet: tenta na próxima */ }
  };
  if (app.isPackaged) {
    setTimeout(auto, 8000);
    setInterval(auto, CHECK_EVERY_MS);
  }
}

module.exports = { setup, check, newer, download };
