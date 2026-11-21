// Linux (AppImage): cria o atalho no menu de aplicativos e o ícone, apontando para o AppImage atual.
// Assim o Datum aparece no menu do Arch (GNOME, KDE, XFCE...) sem instalar nada pelo terminal.
// Como a atualização troca o AppImage no mesmo caminho, o atalho continua valendo.
const { app, nativeImage } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Remove atalhos de versões antigas do Datum (criados por Gear Lever, AppImageLauncher, appimaged...)
// que apontam para um AppImage diferente do atual e que não existe mais. Só mexe na pasta do usuário.
function limparAtalhosAntigos(dirApps, appImageAtual) {
  let arquivos = [];
  try { arquivos = fs.readdirSync(dirApps).filter((f) => f.endsWith('.desktop') && f !== 'datum.desktop'); } catch { return; }
  for (const f of arquivos) {
    const caminho = path.join(dirApps, f);
    try {
      const txt = fs.readFileSync(caminho, 'utf8');
      if (!/^Name=Datum\b/m.test(txt)) continue;
      const exec = (txt.match(/^Exec=(.+)$/m) || [])[1] || '';
      const alvo = (exec.match(/"([^"]+\.AppImage)"/i) || exec.match(/(\S+\.AppImage)/i) || [])[1];
      if (!alvo || alvo === appImageAtual) continue;
      if (!fs.existsSync(alvo)) fs.unlinkSync(caminho);
    } catch { /* ignora este arquivo */ }
  }
}

function integrarAppImage() {
  const appImage = process.env.APPIMAGE;
  if (process.platform !== 'linux' || !app.isPackaged) return;
  if (!appImage) {
    // instalado como pacote: remove um atalho antigo do AppImage que não existe mais (ele esconderia o do pacote)
    try {
      const dados = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
      const arq = path.join(dados, 'applications', 'datum.desktop');
      const alvo = fs.existsSync(arq) && (fs.readFileSync(arq, 'utf8').match(/^TryExec=(.+)$/m) || [])[1];
      if (alvo && !fs.existsSync(alvo)) fs.unlinkSync(arq);
    } catch { /* ignora */ }
    return;
  }
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
    limparAtalhosAntigos(dirApps, appImage);
    const arquivo = path.join(dirApps, 'datum.desktop');
    const atual = fs.existsSync(arquivo) ? fs.readFileSync(arquivo, 'utf8') : '';
    if (atual !== desktop) fs.writeFileSync(arquivo, desktop, { mode: 0o644 });
  } catch { /* sem permissão: segue sem atalho */ }
}

module.exports = { integrarAppImage };
