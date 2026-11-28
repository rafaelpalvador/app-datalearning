// Gera todos os ícones e splashes a partir dos SVGs de assets/ (usa o Chromium do Playwright).
// Símbolo "Sinal": eixo com um ponto de dado subindo. Fundo grafite, ponto laranja, curva ciano.
// uso: node scripts/render-icons.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const RES = path.join(root, 'android/app/src/main/res');
const GRAFITE = '#16181d';
const NOITE = '#0f1115';

const icon = fs.readFileSync(path.join(root, 'assets/icon.svg'), 'utf8');
const fg = fs.readFileSync(path.join(root, 'assets/icon-foreground.svg'), 'utf8');
const svgBox = (svg, size) => `<div style="width:${size}px;height:${size}px">${svg}</div>`;

// [saída, largura, altura, html do conteúdo]
const jobs = [
  ['assets/icon.png', 1024, 1024, svgBox(icon, 1024)],
  ['assets/icon-only.png', 1024, 1024, svgBox(icon, 1024)],
  ['assets/icon-foreground.png', 1024, 1024, svgBox(fg, 1024)],
  ['assets/icon-background.png', 1024, 1024, `<div style="width:1024px;height:1024px;background:${GRAFITE}"></div>`],
  ['icons/icon-192.png', 192, 192, svgBox(icon, 192)],
  ['icons/icon-512.png', 512, 512, svgBox(icon, 512)],
];
const splash = (w, h) => {
  const s = Math.round(Math.min(w, h) * 0.26);
  return `<div style="width:${w}px;height:${h}px;background:${NOITE};display:grid;place-items:center">${svgBox(icon, s)}</div>`;
};
jobs.push(['assets/splash.png', 2732, 2732, splash(2732, 2732)], ['assets/splash-dark.png', 2732, 2732, splash(2732, 2732)]);

// Android: tamanhos lidos dos PNGs existentes em res/
const pngSize = (f) => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
for (const dir of fs.readdirSync(RES)) {
  for (const file of fs.readdirSync(path.join(RES, dir)).filter((f) => f.endsWith('.png'))) {
    const rel = path.join('android/app/src/main/res', dir, file);
    const [w, h] = pngSize(path.join(root, rel));
    let html;
    if (file === 'splash.png') html = splash(w, h);
    else if (file === 'ic_launcher_background.png') html = `<div style="width:${w}px;height:${h}px;background:${GRAFITE}"></div>`;
    else if (file === 'ic_launcher_foreground.png') html = svgBox(fg, w);
    else if (file === 'ic_launcher_round.png') html = `<div style="width:${w}px;height:${w}px;border-radius:50%;background:${GRAFITE};overflow:hidden">${svgBox(fg, w)}</div>`;
    else if (file === 'ic_launcher.png') html = svgBox(icon, w);
    else continue;
    jobs.push([rel, w, h, html]);
  }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [out, w, h, html] of jobs) {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<html><body style="margin:0;background:transparent">${html}<style>svg{width:100%;height:100%;display:block}</style></body></html>`);
    fs.mkdirSync(path.dirname(path.join(root, out)), { recursive: true });
    await page.screenshot({ path: path.join(root, out), omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  }
  await browser.close();
  console.log(`✔ ${jobs.length} imagens geradas`);
})();
