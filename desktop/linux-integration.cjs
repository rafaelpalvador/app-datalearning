// Linux (AppImage): cria o atalho no menu de aplicativos e o ícone, apontando para o AppImage atual.
// Assim o Datum aparece no menu do Arch (GNOME, KDE, XFCE...) sem instalar nada pelo terminal.
// Como a atualização troca o AppImage no mesmo caminho, o atalho continua valendo.
const { app } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function integrarAppImage() {
  const appImage = process.env.APPIMAGE;
  if (process.platform !== 'linux' || !appImage || !app.isPackaged) return;
  try {
    const dados = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
    const dirApps = path.join(dados, 'applications');
    const dirIcone = path.join(dados, 'icons', 'hicolor', '512x512', 'apps');
    fs.mkdirSync(dirApps, { recursive: true });
    fs.mkdirSync(dirIcone, { recursive: true });
    const icone = path.join(dirIcone, 'datum.png');
    const origem = path.join(__dirname, '..', 'assets', 'icon.png');
    if (fs.existsSync(origem)) fs.writeFileSync(icone, fs.readFileSync(origem));
    const aspas = (p) => `"${p.replace(/(["\\`$])/g, '\\$1')}"`;
    const desktop = [
      '[Desktop Entry]',
      'Type=Application',
      'Name=Datum',
      'Comment=SQL, Python, estatística e bancos de dados para quem trabalha com dados',
      `Exec=${aspas(appImage)} %U`,
      `TryExec=${appImage}`,
      'Icon=datum',
      'Terminal=false',
      'Categories=Education;Development;',
      'StartupWMClass=Datum',
      '',
    ].join('\n');
    const arquivo = path.join(dirApps, 'datum.desktop');
    const atual = fs.existsSync(arquivo) ? fs.readFileSync(arquivo, 'utf8') : '';
    if (atual !== desktop) fs.writeFileSync(arquivo, desktop, { mode: 0o644 });
  } catch { /* sem permissão: segue sem atalho */ }
}

module.exports = { integrarAppImage };
