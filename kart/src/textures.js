/* ============================================================
   Procedural canvas textures
   ============================================================ */
let MAX_ANISO = 4;
const TexCache = new Map();

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
/* CPU-backed 2D context for canvases we read back with getImageData (much faster than GPU readback) */
const ctx2d = (c) => c.getContext('2d', { willReadFrequently: true });
function canvasTexture(c, opts = {}) {
  const t = new THREE.CanvasTexture(c);
  if (opts.color !== false) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = opts.clampS ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.wrapT = opts.clampT ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.anisotropy = opts.aniso === false ? 1 : MAX_ANISO;
  if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1]);
  t.needsUpdate = true;
  return t;
}
function cached(key, fn) { if (!TexCache.has(key)) TexCache.set(key, fn()); return TexCache.get(key); }

/* per-pixel noise on top of a base colour */
function speckle(g, w, h, rgb, amp, seed = 1, grain = 1) {
  const r = mulberry32(seed);
  const img = g.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amp * grain;
    d[i] = clamp(d[i] + n, 0, 255); d[i + 1] = clamp(d[i + 1] + n, 0, 255); d[i + 2] = clamp(d[i + 2] + n, 0, 255);
  }
  g.putImageData(img, 0, 0);
}
function blotches(g, w, h, colors, count, rMin, rMax, alpha, seed = 2) {
  const r = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const x = r() * w, y = r() * h, rad = lerp(rMin, rMax, r());
    g.globalAlpha = alpha * (0.4 + r() * 0.6);
    g.fillStyle = colors[Math.floor(r() * colors.length)];
    for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
      g.beginPath(); g.ellipse(x + ox, y + oy, rad, rad * (0.5 + r() * 0.5), r() * 3, 0, TAU); g.fill();
    }
  }
  g.globalAlpha = 1;
}

const Tex = {
  road(style) {
    return cached('road-' + style, () => {
      const W = 512, H = 512, c = makeCanvas(W, H), g = ctx2d(c);
      const S = {
        asphalt: { base: '#5b5e66', spots: ['#4c4f57', '#6a6d75', '#55585f'], line: '#f4f1e8', edge: 0.035 },
        dirt: { base: '#b9774b', spots: ['#a8683f', '#c98a5c', '#9c5f39'], line: null },
        ice: { base: '#6c7586', spots: ['#646d7d', '#747d8e', '#7a8496'], line: '#e8f4ff', edge: 0.035 },
        neon: { base: '#24242f', spots: ['#1c1c26', '#2d2d3a'], line: null },
        cosmic: { base: '#000000', spots: [], line: null },
      }[style];
      g.fillStyle = S.base; g.fillRect(0, 0, W, H);
      if (style === 'cosmic') {
        const bands = ['#ff3b5c', '#ff8a2a', '#ffd23a', '#4be36b', '#2fd0ff', '#4a6bff', '#b25bff'];
        const bw = W / bands.length;
        bands.forEach((col, i) => {
          const gr = g.createLinearGradient(i * bw, 0, (i + 1) * bw, 0);
          gr.addColorStop(0, col); gr.addColorStop(0.5, col); gr.addColorStop(1, col);
          g.fillStyle = gr; g.fillRect(i * bw, 0, bw, H);
          g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(i * bw + bw * 0.42, 0, bw * 0.16, H);
        });
        g.fillStyle = 'rgba(0,0,0,0.35)';
        for (let i = 1; i < bands.length; i++) g.fillRect(i * bw - 2, 0, 4, H);
        g.fillStyle = 'rgba(255,255,255,0.8)';
        for (let y = 0; y < H; y += 64) g.fillRect(0, y, W, 3);
        const r = mulberry32(5);
        for (let i = 0; i < 400; i++) { g.globalAlpha = r(); g.fillRect(r() * W, r() * H, 2, 2); }
        g.globalAlpha = 1;
        return canvasTexture(c);
      }
      blotches(g, W, H, S.spots, 140, 6, 40, 0.35, 3);
      speckle(g, W, H, null, style === 'dirt' ? 34 : 26, 7);
      if (style === 'dirt') {
        // tyre ruts + pebbles
        g.fillStyle = 'rgba(90,50,25,0.22)';
        for (const u of [0.3, 0.38, 0.62, 0.7]) g.fillRect(u * W, 0, W * 0.035, H);
        const r = mulberry32(9);
        for (let i = 0; i < 260; i++) {
          g.fillStyle = r() < 0.5 ? 'rgba(80,45,25,0.6)' : 'rgba(235,200,160,0.55)';
          g.beginPath(); g.arc(r() * W, r() * H, 1 + r() * 2.5, 0, TAU); g.fill();
        }
        const eg = g.createLinearGradient(0, 0, W, 0);
        eg.addColorStop(0, 'rgba(120,70,35,0.55)'); eg.addColorStop(0.06, 'rgba(120,70,35,0)');
        eg.addColorStop(0.94, 'rgba(120,70,35,0)'); eg.addColorStop(1, 'rgba(120,70,35,0.55)');
        g.fillStyle = eg; g.fillRect(0, 0, W, H);
      }
      if (style === 'asphalt' || style === 'ice') {
        // darker racing line + cracks
        g.fillStyle = 'rgba(30,30,35,0.12)';
        g.fillRect(W * 0.25, 0, W * 0.5, H);
        g.strokeStyle = 'rgba(30,30,35,0.35)'; g.lineWidth = 1.2;
        const r = mulberry32(11);
        for (let i = 0; i < 10; i++) {
          let x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y);
          for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 30; y += r() * 18; g.lineTo(x, y); }
          g.stroke();
        }
      }
      if (style === 'ice') {
        const eg = g.createLinearGradient(0, 0, W, 0);
        eg.addColorStop(0, 'rgba(245,250,255,0.95)'); eg.addColorStop(0.09, 'rgba(245,250,255,0)');
        eg.addColorStop(0.91, 'rgba(245,250,255,0)'); eg.addColorStop(1, 'rgba(245,250,255,0.95)');
        g.fillStyle = eg; g.fillRect(0, 0, W, H);
        blotches(g, W, H, ['rgba(240,248,255,0.5)'], 14, 3, 10, 0.25, 13);
      }
      if (S.line) {
        g.fillStyle = S.line;
        g.fillRect(W * 0.03, 0, W * S.edge * 0.6, H);
        g.fillRect(W * (0.97 - S.edge * 0.6), 0, W * S.edge * 0.6, H);
      }
      if (style === 'neon') {
        g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 2;
        for (let y = 0; y < H; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
        g.fillStyle = '#ff3fd1'; g.fillRect(W * 0.025, 0, W * 0.022, H);
        g.fillStyle = '#29e4ff'; g.fillRect(W * 0.953, 0, W * 0.022, H);
        g.fillStyle = '#ffe14d';
        for (let y = 0; y < H; y += 128) g.fillRect(W * 0.494, y, W * 0.012, 64);
      }
      return canvasTexture(c);
    });
  },
  roadGlow(style) {
    return cached('roadglow-' + style, () => {
      const W = 512, H = 512, c = makeCanvas(W, H), g = c.getContext('2d');
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      if (style === 'neon') {
        g.fillStyle = '#ff3fd1'; g.fillRect(W * 0.025, 0, W * 0.022, H);
        g.fillStyle = '#29e4ff'; g.fillRect(W * 0.953, 0, W * 0.022, H);
        g.fillStyle = '#8a7a20';
        for (let y = 0; y < H; y += 128) g.fillRect(W * 0.494, y, W * 0.012, 64);
      }
      return canvasTexture(c);
    });
  },
  curb(a, b) {
    return cached('curb-' + a + b, () => {
      const c = makeCanvas(64, 256), g = ctx2d(c);
      for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(0, i * 64, 64, 64); }
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 0, 6, 256);
      speckle(g, 64, 256, null, 14, 21);
      return canvasTexture(c);
    });
  },
  ground(style) {
    return cached('ground-' + style, () => {
      const W = 256, c = makeCanvas(W, W), g = ctx2d(c);
      const S = {
        grass: ['#ffffff', ['#e6f0dc', '#f5fff0', '#d8e8cc'], 30],
        sand: ['#ffffff', ['#f2e4d4', '#fff4e8', '#e8d6c2'], 22],
        snow: ['#ffffff', ['#eef4ff', '#f8fbff', '#e2ebfa'], 12],
        rock: ['#ffffff', ['#e0dcd8', '#f4f0ec', '#cfc8c2'], 26],
        city: ['#ffffff', ['#e8e8ee', '#f4f4f8', '#dcdce4'], 18],
      }[style] || ['#fff', ['#eee'], 10];
      g.fillStyle = S[0]; g.fillRect(0, 0, W, W);
      blotches(g, W, W, S[1], 90, 4, 22, 0.6, 31);
      speckle(g, W, W, null, S[2], 33);
      if (style === 'grass') {
        const r = mulberry32(35);
        for (let i = 0; i < 900; i++) {
          g.strokeStyle = r() < 0.5 ? 'rgba(120,160,90,0.35)' : 'rgba(255,255,255,0.35)';
          const x = r() * W, y = r() * W;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 4); g.stroke();
        }
      }
      if (style === 'sand') {
        g.strokeStyle = 'rgba(190,150,110,0.25)'; g.lineWidth = 2;
        for (let y = 0; y < W; y += 16) {
          g.beginPath();
          for (let x = 0; x <= W; x += 8) g.lineTo(x, y + Math.sin(x * 0.05 + y) * 3);
          g.stroke();
        }
      }
      if (style === 'city') {
        g.strokeStyle = 'rgba(80,80,100,0.25)'; g.lineWidth = 2;
        for (let i = 0; i <= W; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, W); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(W, i); g.stroke(); }
      }
      return canvasTexture(c);
    });
  },
  wall(style) {
    return cached('wall-' + style, () => {
      const c = makeCanvas(256, 64), g = ctx2d(c);
      if (style === 'blocks') {
        for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#f4f2ee' : '#e8392f'; g.fillRect(i * 64, 0, 64, 64); }
        g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(0, 56, 256, 8);
        g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(0, 0, 256, 6);
        speckle(g, 256, 64, null, 12, 41);
      } else if (style === 'rock') {
        const cols = ['#c0744a', '#a95f3a', '#d48a5a', '#9a5434', '#c98055'];
        for (let i = 0; i < 8; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(0, i * 8, 256, 8); }
        blotches(g, 256, 64, ['#8d4c2f', '#e0a072'], 50, 3, 12, 0.4, 43);
        speckle(g, 256, 64, null, 30, 44);
      } else if (style === 'snow') {
        const gr = g.createLinearGradient(0, 0, 0, 64);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.7, '#e4eefc'); gr.addColorStop(1, '#b8cbe8');
        g.fillStyle = gr; g.fillRect(0, 0, 256, 64);
        blotches(g, 256, 64, ['#dfe9f9', '#ffffff'], 40, 3, 10, 0.6, 45);
      } else if (style === 'neon') {
        g.fillStyle = '#1b1b28'; g.fillRect(0, 0, 256, 64);
        g.fillStyle = '#2a2a3c'; for (let i = 0; i < 256; i += 32) g.fillRect(i, 0, 3, 64);
        g.fillStyle = '#29e4ff'; g.fillRect(0, 26, 256, 8);
      } else if (style === 'rail') {
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 64);
      } else if (style === 'wood') {
        g.fillStyle = '#9c6a3c'; g.fillRect(0, 0, 256, 64);
        g.fillStyle = '#7c5028';
        for (let y = 0; y < 64; y += 16) g.fillRect(0, y, 256, 3);
        for (let x = 0; x < 256; x += 64) g.fillRect(x, 0, 4, 64);
        speckle(g, 256, 64, null, 24, 46);
      }
      return canvasTexture(c);
    });
  },
  wallGlow(style) {
    return cached('wallglow-' + style, () => {
      const c = makeCanvas(256, 64), g = c.getContext('2d');
      g.fillStyle = '#000'; g.fillRect(0, 0, 256, 64);
      if (style === 'neon') { g.fillStyle = '#29e4ff'; g.fillRect(0, 26, 256, 8); }
      return canvasTexture(c);
    });
  },
  checker() {
    return cached('checker', () => {
      const c = makeCanvas(128, 32), g = c.getContext('2d');
      for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fafafa'; g.fillRect(x * 8, y * 8, 8, 8); }
      const t = canvasTexture(c, { aniso: true });
      t.magFilter = THREE.NearestFilter;
      return t;
    });
  },
  boostPad() {
    return cached('boost', () => {
      const c = makeCanvas(128, 256), g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, '#ff8a00'); gr.addColorStop(1, '#ffd000');
      g.fillStyle = '#3a2000'; g.fillRect(0, 0, 128, 256);
      for (let i = 0; i < 4; i++) {
        const y = i * 64 + 8;
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(10, y + 46); g.lineTo(64, y); g.lineTo(118, y + 46); g.lineTo(118, y + 60); g.lineTo(64, y + 18); g.lineTo(10, y + 60); g.closePath(); g.fill();
      }
      g.strokeStyle = '#ffe66b'; g.lineWidth = 6; g.strokeRect(3, -10, 122, 276);
      return canvasTexture(c);
    });
  },
  question() {
    return cached('question', () => {
      const c = makeCanvas(128, 128), g = c.getContext('2d');
      g.clearRect(0, 0, 128, 128);
      g.font = '900 104px "Lilita One", "Arial Black", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 12; g.strokeStyle = '#2a1d5e'; g.strokeText('?', 64, 70);
      g.fillStyle = '#ffffff'; g.fillText('?', 64, 70);
      return canvasTexture(c, { clampS: true, clampT: true });
    });
  },
  windows(seed, tint = 0) {
    return cached('win-' + seed + '-' + tint, () => {
      const W = 128, H = 256, c = makeCanvas(W, H), g = c.getContext('2d');
      const r = mulberry32(seed);
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      const pal = [['#ffd27a', '#ffe9b0', '#ffc35a'], ['#7ae6ff', '#b4f2ff', '#4cc8ff'], ['#ff8ad8', '#ffc0ec', '#d36bff']][tint];
      for (let y = 6; y < H - 6; y += 16) for (let x = 6; x < W - 6; x += 14) {
        if (r() < 0.55) { g.fillStyle = pal[Math.floor(r() * 3)]; g.globalAlpha = 0.6 + r() * 0.4; g.fillRect(x, y, 8, 10); }
      }
      g.globalAlpha = 1;
      return canvasTexture(c);
    });
  },
  facade(seed) {
    return cached('facade-' + seed, () => {
      const W = 128, H = 256, c = makeCanvas(W, H), g = c.getContext('2d');
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#1a1d2e';
      for (let y = 6; y < H - 6; y += 16) for (let x = 6; x < W - 6; x += 14) g.fillRect(x, y, 8, 10);
      return canvasTexture(c);
    });
  },
  tread() {
    return cached('tread', () => {
      const c = makeCanvas(256, 32), g = c.getContext('2d');
      g.fillStyle = '#2a2a30'; g.fillRect(0, 0, 256, 32);
      g.strokeStyle = '#15151a'; g.lineWidth = 5;
      for (let x = 0; x < 256; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 8, 16); g.lineTo(x, 32); g.stroke(); }
      return canvasTexture(c);
    });
  },
  banner(text, bg, fg, w = 512, h = 128) {
    return cached('banner-' + text + bg + fg + w, () => {
      const c = makeCanvas(w, h), g = c.getContext('2d');
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, 0, w, h * 0.45);
      g.font = `${Math.floor(h * 0.62)}px "Lilita One", "Arial Black", sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = h * 0.08; g.strokeStyle = 'rgba(0,0,0,0.35)'; g.strokeText(text, w / 2, h * 0.54);
      g.fillStyle = fg; g.fillText(text, w / 2, h * 0.54);
      return canvasTexture(c, { clampS: true, clampT: true });
    });
  },
  chevron(color = '#ffd02b', bg = '#16162a') {
    return cached('chev' + color, () => {
      const c = makeCanvas(256, 64), g = c.getContext('2d');
      g.fillStyle = bg; g.fillRect(0, 0, 256, 64);
      g.fillStyle = color;
      for (let x = -20; x < 256; x += 64) {
        g.beginPath(); g.moveTo(x, 6); g.lineTo(x + 26, 6); g.lineTo(x + 50, 32); g.lineTo(x + 26, 58); g.lineTo(x, 58); g.lineTo(x + 24, 32); g.closePath(); g.fill();
      }
      return canvasTexture(c, { clampT: true });
    });
  },
  crowd(seed) {
    return cached('crowd' + seed, () => {
      const W = 256, H = 128, c = makeCanvas(W, H), g = c.getContext('2d');
      const r = mulberry32(seed);
      g.fillStyle = '#3a3f5c'; g.fillRect(0, 0, W, H);
      const cols = ['#ff5a4e', '#ffd34a', '#4fc3ff', '#7be26b', '#ff8ad8', '#ffffff', '#b57bff', '#ff9f43'];
      for (let row = 0; row < 8; row++) {
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, row * 16 + 13, W, 3);
        for (let x = 2; x < W; x += 8) {
          const y = row * 16 + 4 + r() * 3;
          g.fillStyle = cols[Math.floor(r() * cols.length)];
          g.fillRect(x, y + 4, 6, 7);
          g.fillStyle = ['#f2c8a0', '#c58a5c', '#8a5a3c', '#f6d5b5'][Math.floor(r() * 4)];
          g.beginPath(); g.arc(x + 3, y + 2, 2.6, 0, TAU); g.fill();
        }
      }
      return canvasTexture(c);
    });
  },
  blob() {
    return cached('blob', () => {
      const c = makeCanvas(64, 64), g = c.getContext('2d');
      const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
      gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return canvasTexture(c, { clampS: true, clampT: true });
    });
  },
  glow() {
    return cached('glow', () => {
      const c = makeCanvas(64, 64), g = c.getContext('2d');
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return canvasTexture(c, { clampS: true, clampT: true });
    });
  },
  number(n, bg = '#ffffff', fg = '#141632') {
    return cached('num' + n + bg, () => {
      const c = makeCanvas(64, 64), g = c.getContext('2d');
      g.fillStyle = bg; g.beginPath(); g.arc(32, 32, 30, 0, TAU); g.fill();
      g.font = '44px "Lilita One", "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = fg; g.fillText(String(n), 32, 35);
      return canvasTexture(c, { clampS: true, clampT: true });
    });
  },
};
