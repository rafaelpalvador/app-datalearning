// Atualizações do app de desktop a partir das Releases do GitHub.
// Windows (instalado): baixa o instalador novo, roda em modo silencioso e reabre o app.
// Linux — sempre pelo próprio app, conforme o jeito que o Datum foi instalado:
//   AppImage numa pasta gravável  → troca o arquivo pelo AppImage novo e reabre (sem senha)
//   pacote .deb (com dpkg)        → baixa o .deb e instala pela janela de senha do sistema
//   pacote do Arch (pacman)       → baixa o .pacman e instala pela janela de senha do sistema
//   qualquer outro caso (ou falha)→ instala o AppImage em ~/Aplicativos, cria o atalho no menu e abre
// Windows portátil: avisa e abre a página de download.
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
const appImagePath = () => process.env.APPIMAGE || null;
const existe = (p) => { try { return fs.existsSync(p); } catch { return false; } };
const pkexecPath = () => ['/usr/bin/pkexec', '/bin/pkexec'].find(existe) || null;
const gravavel = (dir) => { try { fs.accessSync(dir, fs.constants.W_OK); return true; } catch { return false; } };
const pastaAppImage = () => path.join(os.homedir(), 'Aplicativos');

// No Linux, como o Datum foi instalado? 'appimage' | 'deb' | 'pacman' | 'outro'
function linuxKind() {
  if (process.platform !== 'linux' || !app.isPackaged) return null;
  if (appImagePath()) return 'appimage';
  const sistema = process.execPath.startsWith('/opt/') || process.execPath.startsWith('/usr/');
  if (sistema && existe('/usr/bin/pacman')) return 'pacman';
  if (sistema && existe('/usr/bin/dpkg')) return 'deb';
  return 'outro';
}

/** Decide como atualizar no Linux: { modo, asset, motivo } */
function planoLinux(assets) {
  const appimage = assets.find((a) => /\.AppImage$/i.test(a.name));
  const deb = assets.find((a) => /linux-(amd64|x64)\.deb$/i.test(a.name));
  const pac = assets.find((a) => /\.pacman$/i.test(a.name));
  const kind = linuxKind();
  if (kind === 'appimage' && gravavel(path.dirname(appImagePath()))) return { modo: 'appimage', asset: appimage, motivo: 'O AppImage será trocado pela versão nova e o Datum vai reabrir.' };
  if (kind === 'pacman' && pac && pkexecPath()) return { modo: 'pacman', asset: pac, alternativo: appimage, motivo: 'O pacote do Arch será instalado com pacman: o sistema vai pedir a sua senha.' };
  if (kind === 'deb' && deb && pkexecPath()) return { modo: 'deb', asset: deb, alternativo: appimage, motivo: 'O pacote .deb será instalado: o sistema vai pedir a sua senha.' };
  return { modo: 'migrar', asset: appimage, motivo: `A versão nova será instalada como AppImage em ${pastaAppImage()} (sem senha) e entra no menu de aplicativos.` };
}

function canInstall(asset) {
  if (!app.isPackaged || !asset) return false;
  if (process.platform === 'win32') return !isPortable();
  return process.platform === 'linux';
}

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
  if (process.platform === 'linux') return planoLinux(assets).asset;
  return null;
}

let last = null;

async function check() {
  const res = await net.fetch(API, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Datum-desktop' } });
  if (!res.ok) throw new Error(res.status === 403 ? 'O GitHub limitou as consultas por agora. Tente de novo mais tarde.' : `GitHub respondeu ${res.status}.`);
  const rel = await res.json();
  const latest = String(rel.tag_name || '').replace(/^v/, '');
  const asset = pickAsset(rel.assets || []);
  const plano = process.platform === 'linux' ? planoLinux(rel.assets || []) : null;
  last = {
    assetsBrutos: rel.assets || [],
    current: app.getVersion(),
    latest,
    available: newer(latest, app.getVersion()),
    notes: rel.body || '',
    publishedAt: rel.published_at,
    page: rel.html_url || PAGE,
    asset: asset ? { name: asset.name, url: asset.browser_download_url, size: asset.size } : null,
    canInstall: canInstall(asset),
    plano: plano ? { modo: plano.modo, motivo: plano.motivo, alternativo: plano.alternativo ? { name: plano.alternativo.name, url: plano.alternativo.browser_download_url } : null } : null,
    portable: isPortable(),
    platform: process.platform,
    linux: linuxKind(),
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
  const progresso = (p, got, total) => win?.webContents.send('update:progress', { p, got, total });

  if (process.platform === 'linux') return instalarLinux(info, win, progresso);

  const dest = path.join(os.tmpdir(), info.asset.name);
  await download(info.asset.url, dest, progresso);
  // instalador NSIS em modo silencioso; --force-run reabre o Datum ao terminar
  const child = spawn(dest, ['/S', '--updated', '--force-run'], { detached: true, stdio: 'ignore' });
  child.unref();
  setTimeout(() => app.quit(), 600);
  return { ok: true, installing: true };
}

// Roda um comando como administrador pela janela de senha do sistema (pkexec).
function comoAdmin(args) {
  return new Promise((resolve) => {
    const child = spawn(pkexecPath(), args, { stdio: 'ignore' });
    child.on('error', () => resolve(-1));
    child.on('exit', (c) => resolve(c));
  });
}

// Instala o AppImage em ~/Aplicativos e abre por ele (o atalho no menu é criado ao abrir).
async function migrarParaAppImage(asset, progresso) {
  if (!asset) throw new Error('Esta versão não tem AppImage para Linux.');
  const dir = pastaAppImage();
  fs.mkdirSync(dir, { recursive: true });
  const destino = path.join(dir, 'Datum.AppImage');
  const tmp = path.join(dir, '.Datum.AppImage.novo');
  await download(asset.url || asset.browser_download_url, tmp, progresso);
  fs.chmodSync(tmp, 0o755);
  fs.renameSync(tmp, destino);
  app.relaunch({ execPath: destino, args: [] });
  setTimeout(() => app.exit(0), 600);
  return { ok: true, installing: true };
}

async function instalarLinux(info, win, progresso) {
  const plano = planoLinux(info.assetsBrutos || []);
  if (plano.modo === 'appimage') {
    // baixa ao lado do AppImage atual e troca o arquivo (no Linux dá para substituir o arquivo em uso)
    const atual = appImagePath();
    const tmp = path.join(path.dirname(atual), `.${path.basename(atual)}.novo`);
    await download(plano.asset.browser_download_url, tmp, progresso);
    fs.chmodSync(tmp, 0o755);
    fs.renameSync(tmp, atual);
    app.relaunch({ execPath: atual, args: [] });
    setTimeout(() => app.exit(0), 600);
    return { ok: true, installing: true };
  }
  if (plano.modo === 'pacman' || plano.modo === 'deb') {
    const dest = path.join(os.tmpdir(), plano.modo === 'pacman' ? `${info.latest}-datum.pkg.tar.zst` : plano.asset.name);
    await download(plano.asset.browser_download_url, dest, progresso);
    win?.webContents.send('update:progress', { p: 1, stage: 'senha' });
    const cmd = plano.modo === 'pacman'
      ? ['/usr/bin/pacman', '-U', '--noconfirm', dest]
      : (existe('/usr/bin/apt-get') ? ['/usr/bin/apt-get', 'install', '-y', dest] : ['/usr/bin/dpkg', '-i', dest]);
    const code = await comoAdmin(cmd);
    if (code === 0) {
      app.relaunch();
      setTimeout(() => app.exit(0), 600);
      return { ok: true, installing: true };
    }
    if (code === 126 || code === 127) return { ok: false, message: 'A instalação foi cancelada na janela de senha. Nada foi alterado.' };
    // o pacote não entrou (conflito com uma instalação feita de outro jeito, por exemplo): vai de AppImage
    win?.webContents.send('update:progress', { p: 0, stage: 'appimage' });
    return migrarParaAppImage(plano.alternativo, progresso);
  }
  return migrarParaAppImage(plano.asset, progresso);
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
