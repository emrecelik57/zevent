'use strict';
/* ============================================================
   Kartoon Grand Prix — core helpers
   ============================================================ */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const invLerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
const smooth = (t) => t * t * (3 - 2 * t);
const smoothstep = (a, b, v) => smooth(invLerp(a, b, v));
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
const sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);
const wrapAngle = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const dampAngle = (a, b, lambda, dt) => a + wrapAngle(b - a) * (1 - Math.exp(-lambda * dt));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let RNG = mulberry32(1234);
const rand = (a = 0, b = 1) => a + (b - a) * Math.random();
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* 2D value noise + fbm (deterministic per seed) */
function makeNoise(seed) {
  const r = mulberry32(seed);
  const P = new Uint8Array(512);
  const G = new Float32Array(256);
  for (let i = 0; i < 256; i++) { P[i] = i; G[i] = r() * 2 - 1; }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = P[i]; P[i] = P[j]; P[j] = t; }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const n2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const a = G[P[P[X] + Y]], b = G[P[P[X + 1] + Y]], c = G[P[P[X] + Y + 1]], d = G[P[P[X + 1] + Y + 1]];
    const u = smooth(xf), v = smooth(yf);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  };
  const fbm = (x, y, oct = 4) => {
    let s = 0, amp = 0.5, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) { s += n2(x * f, y * f) * amp; norm += amp; amp *= 0.5; f *= 2.03; }
    return s / norm;
  };
  return { n2, fbm };
}

/* localStorage wrapper — every access can throw (private mode, sandbox) */
const Store = {
  get(key, def) {
    try { const v = localStorage.getItem('kartoon.' + key); return v == null ? def : JSON.parse(v); }
    catch (e) { return def; }
  },
  set(key, val) {
    try { localStorage.setItem('kartoon.' + key, JSON.stringify(val)); } catch (e) { /* ignore */ }
  },
};

function fmtTime(t) {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60), s = Math.floor(t % 60), ms = Math.floor((t * 1000) % 1000);
  return `${m}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}
const ordinal = (n) => (n === 1 ? 'er' : 'e');

/* Small tween/timer scheduler driven by the game clock */
class Timers {
  constructor() { this.list = []; }
  after(sec, fn) { this.list.push({ t: sec, fn }); }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const it = this.list[i];
      it.t -= dt;
      if (it.t <= 0) { this.list.splice(i, 1); it.fn(); }
    }
  }
  clear() { this.list.length = 0; }
}

/* Settings with defaults */
const DEFAULT_SETTINGS = {
  music: 0.7, sfx: 0.8, quality: 2, autoAccel: false, showFps: false, camera: 1, speedFx: true,
};
const Settings = Object.assign({}, DEFAULT_SETTINGS, Store.get('settings', {}));
function saveSettings() { Store.set('settings', Settings); }
function hashString(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
