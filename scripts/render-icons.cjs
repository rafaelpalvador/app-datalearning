// Renderiza os SVGs de assets/ em PNG (usa o Chromium do Playwright).
// uso: node scripts/render-icons.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const jobs = [
  ['assets/icon.svg', 'assets/icon.png', 1024, null],
  ['assets/icon-foreground.svg', 'assets/icon-foreground.png', 1024, null],
  ['assets/icon-foreground.svg', 'assets/splash.png', 2732, '#11161c'],
  ['assets/icon-foreground.svg', 'assets/splash-dark.png', 2732, '#0b0d10'],
  ['assets/icon.svg', 'icons/icon-192.png', 192, null],
  ['assets/icon.svg', 'icons/icon-512.png', 512, null],
];
(async () => {
  const browser = await chromium.launch();
  for (const [src, out, size, bg] of jobs) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    const svg = fs.readFileSync(path.join(root, src), 'utf8');
    const inner = bg ? `<div style="width:${size}px;height:${size}px;background:${bg};display:grid;place-items:center"><div style="width:${size * 0.3}px;height:${size * 0.3}px">${svg}</div></div>` : svg;
    await page.setContent(`<html><body style="margin:0;background:transparent">${inner}<style>svg{width:100%;height:100%;display:block}</style></body></html>`);
    fs.mkdirSync(path.dirname(path.join(root, out)), { recursive: true });
    await page.screenshot({ path: path.join(root, out), omitBackground: !bg });
    await page.close();
    console.log('✔', out);
  }
  await browser.close();
})();
