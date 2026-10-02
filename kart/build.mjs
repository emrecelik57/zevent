// Assemble src/ into a single self-contained HTML page.
//   node build.mjs                 -> index.html (full document, open it in a browser)
//   node build.mjs --fragment out  -> also writes a body-only fragment (for hosts that add their own <html> skeleton)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => fs.readFileSync(path.join(dir, 'src', f), 'utf8');
const ORDER = ['core', 'audio', 'input', 'textures', 'models', 'tracks', 'track', 'decor', 'fx', 'kart', 'ai', 'items', 'camera', 'race', 'hud', 'menu', 'main'];
const js = ORDER.map((f) => `/* ---- ${f}.js ---- */\n${src(f + '.js')}`).join('\n');
if (js.includes('</script')) throw new Error('game code must not contain a closing script tag');

const shell = src('shell.html');
const split = shell.indexOf('<div id="app">');
const headPart = shell.slice(0, split).trim();
const bodyPart = shell.slice(split).trim();
const THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.159.0/three.min.js';
const THREE_FALLBACK = 'https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.min.js';
const scripts = `<script>window.__cw = console.warn; console.warn = function () {};</script>
<script src="${THREE_CDN}"></script>
<script>if (!window.THREE) document.write('<script src="${THREE_FALLBACK}"><\\/script>');</script>
<script>console.warn = window.__cw;</script>
<script>
${js}
</script>`;

const full = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${headPart}
</head>
<body>
${bodyPart}
${scripts}
</body>
</html>
`;
fs.writeFileSync(path.join(dir, 'index.html'), full);
console.log('index.html', (full.length / 1024).toFixed(1) + ' KB');

const fi = process.argv.indexOf('--fragment');
if (fi > 0 && process.argv[fi + 1]) {
  const frag = `${headPart}\n${bodyPart}\n${scripts}\n`;
  fs.writeFileSync(process.argv[fi + 1], frag);
  console.log('fragment', (frag.length / 1024).toFixed(1) + ' KB');
}
