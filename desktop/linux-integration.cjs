// Linux (AppImage): cria o atalho no menu de aplicativos e o ícone, apontando para o AppImage atual.
// Assim o Datum aparece no menu do Arch (GNOME, KDE, XFCE...) sem instalar nada pelo terminal.
// Como a atualização troca o AppImage no mesmo caminho, o atalho continua valendo.
const { app, nativeImage } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function integrarAppImage() {
  const appImage = process.env.APPIMAGE;
  if (process.platform !== 'linux' || !appImage || !app.isPackaged) return;
  try {
    const dados = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
    const dirApps = path.join(dados, 'applications');
    fs.mkdirSync(dirApps, { recursive: true });
    // Ícone em tamanhos padrão do tema hicolor + uma cópia com caminho absoluto, que o
    // .desktop usa direto (funciona em qualquer ambiente, mesmo sem cache de ícones).
    const origem = path.join(__dirname, '..', 'assets', 'icon.png');
    const img = nativeImage.createFromPath(origem);
    let icone = 'datum';
    if (!img.isEmpty()) {
      for (const tam of [512, 256, 128, 64, 48]) {
        const dir = path.join(dados, 'icons', 'hicolor', `${tam}x${tam}`, 'apps');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'datum.png'), img.resize({ width: tam, height: tam, quality: 'best' }).toPNG());
      }
      const dirProprio = path.join(dados, 'datum');
      fs.mkdirSync(dirProprio, { recursive: true });
      icone = path.join(dirProprio, 'datum.png');
      fs.writeFileSync(icone, img.resize({ width: 256, height: 256, quality: 'best' }).toPNG());
    }
    const aspas = (p) => `"${p.replace(/(["\\`$])/g, '\\$1')}"`;
    const desktop = [
      '[Desktop Entry]',
      'Type=Application',
      'Name=Datum',
      'Comment=SQL, Python, estatística e bancos de dados para quem trabalha com dados',
      `Exec=${aspas(appImage)} %U`,
      `TryExec=${appImage}`,
      `Icon=${icone}`,
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
