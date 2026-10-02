/* ============================================================
   Track — spline sampling, spatial queries, road/wall/terrain meshes
   Lateral offsets are positive to the LEFT of the driving direction.
   ============================================================ */
const THEMES = {
  meadow: {
    sky: ['#2f86ff', '#c8e8ff', '#e8f6ff'], sunDir: [0.45, 0.8, 0.4], sun: '#fff1d4', sunI: 2.7,
    hemi: ['#cfe8ff', '#6f9a3c', 1.25], fog: ['#cfe9ff', 180, 1100], env: 0.75,
    terrain: ['#5fb84a', '#4a9e3c', '#8fcf5a'], shoulder: '#5aad46', clouds: 16, mountains: ['#5d8f6a', '#9cc7a8', '#cfe3ff'],
  },
  canyon: {
    sky: ['#4a4fb0', '#ffb470', '#ffd9b0'], sunDir: [-0.55, 0.42, 0.6], sun: '#ffd2a0', sunI: 2.9,
    hemi: ['#ffcf9a', '#a3593a', 1.15], fog: ['#f6b27a', 160, 1050], env: 0.7,
    terrain: ['#e3a465', '#cf8a52', '#f0bb7c'], shoulder: '#dda062', clouds: 6, mountains: ['#b0583a', '#d98a5a', '#f2b07a'],
  },
  snow: {
    sky: ['#4f86d6', '#e6f0ff', '#ffffff'], sunDir: [0.3, 0.62, -0.55], sun: '#ffffff', sunI: 2.4,
    hemi: ['#e0ecff', '#9db2d6', 1.3], fog: ['#e4eeff', 140, 950], env: 0.8,
    terrain: ['#f4f8ff', '#e2ebfa', '#ffffff'], shoulder: '#eef4ff', clouds: 10, mountains: ['#7d8aa6', '#c9d6ec', '#ffffff'],
  },
  city: {
    sky: ['#05071a', '#3a1d5c', '#0b0a16'], sunDir: [0.25, 0.85, 0.3], sun: '#a6b8ff', sunI: 0.9,
    hemi: ['#7a68d0', '#2a2440', 1.5], fog: ['#24123f', 90, 720], env: 0.55,
    terrain: ['#3a3a4a', '#30303e', '#44445a'], shoulder: '#6a6a80', clouds: 0, mountains: null,
  },
  space: {
    sky: ['#03040f', '#1d0b45', '#000000'], sunDir: [0.3, 0.9, 0.25], sun: '#ffffff', sunI: 1.9,
    hemi: ['#9a8aff', '#2a0f4a', 1.0], fog: ['#120830', 260, 1600], env: 0.6,
    terrain: null, shoulder: null, clouds: 0, mountains: null,
  },
};

class Track {
  constructor(def, quality = 2) {
    this.def = def;
    this.quality = quality;
    this.theme = THEMES[def.theme];
    this.group = new THREE.Group();
    this.updaters = [];
    this.followers = [];
    this.seed = hashString(def.id);
    this.rng = mulberry32(this.seed);
    this.noise = makeNoise(this.seed + 7);
    this._sample();
    this._racingLine();
    this._buildGrid();
    this._defineFeatures();
    this._buildRoad();
    this._buildWalls();
    if (this.theme.terrain) this._buildTerrain();
    this._buildStart();
    this._buildFeatureMeshes();
    this._buildSky();
    buildDecor(this);
  }

  /* ---------- sampling ---------- */
  _sample() {
    const def = this.def, S = def.scale || 1;
    const ctrl = def.pts.map((p) => new THREE.Vector3(p[0] * S, p[2] || 0, p[1] * S));
    const curve = new THREE.CatmullRomCurve3(ctrl, true, 'centripetal', 0.5);
    const wcurve = new THREE.CatmullRomCurve3(def.pts.map((p) => new THREE.Vector3(p[3] || def.width, 0, 0)), true, 'catmullrom', 0.5);
    const L0 = curve.getLength();
    const N = Math.round(L0 / 2);
    this.N = N;
    const P = this.P = new Float32Array(N * 3), T = this.T = new Float32Array(N * 3);
    const LAT = this.LAT = new Float32Array(N * 3), UP = this.UP = new Float32Array(N * 3);
    const W = this.W = new Float32Array(N), D = this.D = new Float32Array(N + 1), K = this.K = new Float32Array(N);
    const WD = this.WD = new Float32Array(N), B = this.B = new Float32Array(N);
    const p = new THREE.Vector3(), t = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const u = i / N, ct = curve.getUtoTmapping(u);
      curve.getPoint(ct, p); curve.getTangent(ct, t);
      P[i * 3] = p.x; P[i * 3 + 1] = p.y; P[i * 3 + 2] = p.z;
      T[i * 3] = t.x; T[i * 3 + 1] = t.y; T[i * 3 + 2] = t.z;
      W[i] = wcurve.getPoint(ct).x;
    }
    D[0] = 0;
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      D[i + 1] = D[i] + Math.hypot(P[j * 3] - P[i * 3], P[j * 3 + 1] - P[i * 3 + 1], P[j * 3 + 2] - P[i * 3 + 2]);
    }
    this.L = D[N];
    this.spacing = this.L / N;
    // signed curvature (positive = turning left)
    const raw = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const a = ((i - 2) % N + N) % N, b = (i + 2) % N;
      const ha = Math.atan2(T[a * 3], T[a * 3 + 2]), hb = Math.atan2(T[b * 3], T[b * 3 + 2]);
      raw[i] = wrapAngle(hb - ha) / (4 * this.spacing);
    }
    for (let i = 0; i < N; i++) {
      let s = 0; for (let k = -4; k <= 4; k++) s += raw[((i + k) % N + N) % N];
      K[i] = s / 9;
    }
    const bankF = def.bank ?? (def.theme === 'city' ? 0 : 2.4);
    for (let i = 0; i < N; i++) B[i] = clamp(-K[i] * bankF, -0.16, 0.16);
    for (let i = 0; i < N; i++) {
      const tx = T[i * 3], ty = T[i * 3 + 1], tz = T[i * 3 + 2];
      let lx = tz, lz = -tx; const lh = Math.hypot(lx, lz) || 1; lx /= lh; lz /= lh;
      const c = Math.cos(B[i]), s = Math.sin(B[i]);
      LAT[i * 3] = lx * c; LAT[i * 3 + 1] = s; LAT[i * 3 + 2] = lz * c;
      // up = T x LAT
      const ax = LAT[i * 3], ay = LAT[i * 3 + 1], az = LAT[i * 3 + 2];
      let ux = ty * az - tz * ay, uy = tz * ax - tx * az, uz = tx * ay - ty * ax;
      const ul = Math.hypot(ux, uy, uz) || 1;
      UP[i * 3] = ux / ul; UP[i * 3 + 1] = uy / ul; UP[i * 3 + 2] = uz / ul;
    }
    // wall distance from the centre line (Infinity = no wall)
    const rails = def.rails || null;
    for (let i = 0; i < N; i++) {
      if (def.void) {
        const f = i / N;
        WD[i] = rails && rails.some(([a, b]) => f >= a && f <= b) ? W[i] / 2 + 0.9 : Infinity;
      } else WD[i] = W[i] / 2 + (def.wall ?? 6);
    }
    let mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9;
    for (let i = 0; i < N; i++) { mnx = Math.min(mnx, P[i * 3]); mxx = Math.max(mxx, P[i * 3]); mnz = Math.min(mnz, P[i * 3 + 2]); mxz = Math.max(mxz, P[i * 3 + 2]); }
    this.bounds = { mnx, mxx, mnz, mxz, cx: (mnx + mxx) / 2, cz: (mnz + mxz) / 2, r: Math.max(mxx - mnx, mxz - mnz) / 2 };
  }

  _racingLine() {
    const N = this.N, P = this.P, LAT = this.LAT, W = this.W;
    const off = new Float32Array(N);
    const nx = new Float32Array(N), nz = new Float32Array(N);
    for (let i = 0; i < N; i++) { const h = Math.hypot(LAT[i * 3], LAT[i * 3 + 2]); nx[i] = LAT[i * 3] / h; nz[i] = LAT[i * 3 + 2] / h; }
    for (let it = 0; it < 400; it++) {
      for (let i = 0; i < N; i++) {
        const a = (i - 4 + N) % N, b = (i + 4) % N;
        const ax = P[a * 3] + nx[a] * off[a], az = P[a * 3 + 2] + nz[a] * off[a];
        const bx = P[b * 3] + nx[b] * off[b], bz = P[b * 3 + 2] + nz[b] * off[b];
        const mx = (ax + bx) / 2, mz = (az + bz) / 2;
        const d = (mx - P[i * 3]) * nx[i] + (mz - P[i * 3 + 2]) * nz[i];
        const lim = W[i] / 2 - 3.2;
        off[i] = clamp(lerp(off[i], d, 0.5), -lim, lim);
      }
    }
    this.RL = off;
  }

  _buildGrid() {
    this.cell = 20;
    this.grid = new Map();
    for (let i = 0; i < this.N; i++) {
      const k = this._cellKey(Math.floor(this.P[i * 3] / this.cell), Math.floor(this.P[i * 3 + 2] / this.cell));
      if (!this.grid.has(k)) this.grid.set(k, []);
      this.grid.get(k).push(i);
    }
  }
  _cellKey(cx, cz) { return cx * 73856 + cz; }

  /* nearest centre-line info for arbitrary world points (decor / terrain) */
  nearest(x, z, maxR = 80) {
    const c = this.cell, r = Math.ceil(maxR / c);
    const cx = Math.floor(x / c), cz = Math.floor(z / c);
    let best = -1, bestD = maxR * maxR;
    for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
      const list = this.grid.get(this._cellKey(cx + a, cz + b));
      if (!list) continue;
      for (const i of list) {
        const dx = x - this.P[i * 3], dz = z - this.P[i * 3 + 2];
        const d = dx * dx + dz * dz;
        if (d < bestD) { bestD = d; best = i; }
      }
    }
    if (best < 0) return null;
    const q = this._nq || (this._nq = {});
    this._project(x, this.P[best * 3 + 1], z, best, q);
    q.dist = Math.abs(q.lateral);
    return q;
  }

  /* ---------- per-frame physics query ---------- */
  query(x, y, z, hint, out) {
    const N = this.N, P = this.P;
    let best = hint, bestD = Infinity;
    for (let k = -8; k <= 12; k++) {
      let i = hint + k; if (i < 0) i += N; else if (i >= N) i -= N;
      const dx = x - P[i * 3], dy = y - P[i * 3 + 1], dz = z - P[i * 3 + 2];
      const d = dx * dx + dz * dz + dy * dy * 0.3;
      if (d < bestD) { bestD = d; best = i; }
    }
    this._project(x, y, z, best, out);
    return out;
  }
  queryGlobal(x, y, z, out) {
    const N = this.N, P = this.P;
    let best = 0, bestD = Infinity;
    for (let i = 0; i < N; i++) {
      const dx = x - P[i * 3], dy = y - P[i * 3 + 1], dz = z - P[i * 3 + 2];
      const d = dx * dx + dz * dz + dy * dy * 0.3;
      if (d < bestD) { bestD = d; best = i; }
    }
    this._project(x, y, z, best, out);
    return out;
  }
  _segT(x, z, i0, i1) {
    const P = this.P;
    const ax = P[i0 * 3], az = P[i0 * 3 + 2], bx = P[i1 * 3], bz = P[i1 * 3 + 2];
    const dx = bx - ax, dz = bz - az;
    return ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1);
  }
  _project(x, y, z, best, out) {
    const N = this.N, P = this.P, LT = this.LAT, T = this.T;
    let i0 = best, i1 = (best + 1) % N;
    let t = this._segT(x, z, i0, i1);
    if (t < 0) { i1 = i0; i0 = (best - 1 + N) % N; t = this._segT(x, z, i0, i1); }
    t = clamp(t, 0, 1);
    const a = i0 * 3, b = i1 * 3;
    const cx = P[a] + (P[b] - P[a]) * t, cy = P[a + 1] + (P[b + 1] - P[a + 1]) * t, cz = P[a + 2] + (P[b + 2] - P[a + 2]) * t;
    const lx = LT[a] + (LT[b] - LT[a]) * t, ly = LT[a + 1] + (LT[b + 1] - LT[a + 1]) * t, lz = LT[a + 2] + (LT[b + 2] - LT[a + 2]) * t;
    const lh = Math.hypot(lx, lz) || 1;
    const nx = lx / lh, nz = lz / lh;
    const lateral = (x - cx) * nx + (z - cz) * nz;
    let tx = T[a] + (T[b] - T[a]) * t, tz = T[a + 2] + (T[b + 2] - T[a + 2]) * t;
    const th = Math.hypot(tx, tz) || 1; tx /= th; tz /= th;
    const d0 = this.D[i0], d1 = i1 === 0 ? this.L : this.D[i1];
    out.i0 = i0; out.i1 = i1; out.t = t; out.idx = t < 0.5 ? i0 : i1;
    out.s = d0 + (d1 - d0) * t;
    out.cx = cx; out.cy = cy; out.cz = cz; out.nx = nx; out.nz = nz; out.tx = tx; out.tz = tz;
    out.lateral = lateral;
    out.slopeY = ly / lh;
    out.width = this.W[i0] + (this.W[i1] - this.W[i0]) * t;
    out.wall = Math.min(this.WD[i0], this.WD[i1]);
    out.groundY = cy + lateral * out.slopeY;
    const half = out.width / 2, al = Math.abs(lateral);
    out.onCurb = al > half && al <= half + 1.3;
    out.offroad = al > half + 1.3;
    out.void = this.def.void && al > half + 0.8;
    out.ramp = null; out.boost = false;
    for (const r of this.ramps) {
      const ds = this.wrapDS(out.s - r.s);
      if (ds >= 0 && ds <= r.len && Math.abs(lateral - r.lat) < r.w / 2) { out.groundY += r.h * (ds / r.len); out.ramp = r; out.void = false; }
    }
    for (const bp of this.boosts) {
      const ds = this.wrapDS(out.s - bp.s);
      if (ds >= 0 && ds <= bp.len && Math.abs(lateral - bp.lat) < bp.w / 2) out.boost = true;
    }
    return out;
  }
  wrapDS(ds) { const L = this.L; if (ds < -L / 2) ds += L; else if (ds > L / 2) ds -= L; return ds; }
  wrapS(s) { const L = this.L; s %= L; return s < 0 ? s + L : s; }

  /* interpolated frame at arc length s */
  frameAt(s, out = {}) {
    s = this.wrapS(s);
    const D = this.D, N = this.N;
    let lo = 0, hi = N;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (D[m] <= s) lo = m; else hi = m; }
    const i0 = lo, i1 = (lo + 1) % N;
    const t = (s - D[lo]) / ((D[lo + 1] - D[lo]) || 1);
    const f = (A, k) => A[i0 * 3 + k] + (A[i1 * 3 + k] - A[i0 * 3 + k]) * t;
    out.px = f(this.P, 0); out.py = f(this.P, 1); out.pz = f(this.P, 2);
    out.lx = f(this.LAT, 0); out.ly = f(this.LAT, 1); out.lz = f(this.LAT, 2);
    out.ux = f(this.UP, 0); out.uy = f(this.UP, 1); out.uz = f(this.UP, 2);
    out.tx = f(this.T, 0); out.ty = f(this.T, 1); out.tz = f(this.T, 2);
    out.w = this.W[i0] + (this.W[i1] - this.W[i0]) * t;
    out.rl = this.RL[i0] + (this.RL[i1] - this.RL[i0]) * t;
    out.k = this.K[i0] + (this.K[i1] - this.K[i0]) * t;
    out.wall = Math.min(this.WD[i0], this.WD[i1]);
    out.d = s; out.idx = t < 0.5 ? i0 : i1;
    out.heading = Math.atan2(out.tx, out.tz);
    return out;
  }
  pointAt(s, lat, up = 0, v = new THREE.Vector3()) {
    const f = this.frameAt(s, this._fa || (this._fa = {}));
    return v.set(f.px + f.lx * lat + f.ux * up, f.py + f.ly * lat + f.uy * up, f.pz + f.lz * lat + f.uz * up);
  }
  sampleFrame(i, out = {}) {
    const N = this.N, j = ((i % N) + N) % N, a = j * 3;
    out.px = this.P[a]; out.py = this.P[a + 1]; out.pz = this.P[a + 2];
    out.lx = this.LAT[a]; out.ly = this.LAT[a + 1]; out.lz = this.LAT[a + 2];
    out.ux = this.UP[a]; out.uy = this.UP[a + 1]; out.uz = this.UP[a + 2];
    out.tx = this.T[a]; out.ty = this.T[a + 1]; out.tz = this.T[a + 2];
    out.w = this.W[j]; out.wall = this.WD[j]; out.d = this.D[j] + Math.floor(i / N) * this.L; out.idx = j;
    return out;
  }
  /* curvature ahead, for AI: max |k| and mean signed k over [s, s+len] */
  curveAhead(s, len) {
    let maxK = 0, sum = 0, n = 0;
    for (let d = 0; d <= len; d += 4) {
      const f = this.frameAt(s + d, this._ca || (this._ca = {}));
      maxK = Math.max(maxK, Math.abs(f.k)); sum += f.k; n++;
    }
    return { maxK, meanK: sum / n };
  }

  /* ---------- features ---------- */
  _defineFeatures() {
    const def = this.def, L = this.L;
    this.boosts = (def.boosts || []).map(([t, lf]) => {
      const f = this.frameAt(t * L);
      return { s: t * L, len: 8, w: 4.6, lat: lf * (f.w / 2 - 3) };
    });
    this.ramps = (def.ramps || []).map(([t, lf, wf]) => {
      const f = this.frameAt(t * L);
      return { s: t * L, len: 7, h: 1.25, w: f.w * wf, lat: lf * (f.w / 2 - 3) };
    });
  }

  /* ---------- geometry helpers ---------- */
  framesRange(s0, s1, step) {
    const frames = [];
    const n = Math.max(1, Math.ceil((s1 - s0) / step));
    for (let k = 0; k <= n; k++) { const s = s0 + (s1 - s0) * (k / n); const f = this.frameAt(s); f.d = s; frames.push(f); }
    return frames;
  }
  framesLoop() {
    const frames = [];
    for (let i = 0; i <= this.N; i++) frames.push(this.sampleFrame(i));
    return frames;
  }
  sweep(frames, profile, faces, opts = {}) {
    const n = frames.length, nv = faces.length * n * 2;
    const pos = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
    const col = opts.color ? new Float32Array(nv * 3) : null;
    const cc = opts.color ? new THREE.Color(opts.color) : null;
    const idx = [];
    let vi = 0;
    for (const f of faces) {
      const base = vi;
      for (let k = 0; k < n; k++) {
        const fr = frames[k];
        const prof = profile(fr);
        for (let e = 0; e < 2; e++) {
          const [lat, up] = prof[e ? f.b : f.a];
          const u = e ? f.u1 : f.u0;
          const x = fr.px + fr.lx * lat + fr.ux * up, y = fr.py + fr.ly * lat + fr.uy * up, z = fr.pz + fr.lz * lat + fr.uz * up;
          pos[vi * 3] = x; pos[vi * 3 + 1] = y; pos[vi * 3 + 2] = z;
          if (opts.worldUV) { uv[vi * 2] = x / opts.worldUV; uv[vi * 2 + 1] = z / opts.worldUV; }
          else if (opts.swapUV) { uv[vi * 2] = fr.d / opts.vLen; uv[vi * 2 + 1] = u; }
          else { uv[vi * 2] = u; uv[vi * 2 + 1] = fr.d / opts.vLen; }
          if (col) {
            const sh = opts.shade ? opts.shade(x, z) : 1;
            col[vi * 3] = cc.r * sh; col[vi * 3 + 1] = cc.g * sh; col[vi * 3 + 2] = cc.b * sh;
          }
          vi++;
        }
      }
      for (let k = 0; k < n - 1; k++) { const a0 = base + k * 2, b0 = a0 + 1, a1 = a0 + 2, b1 = a0 + 3; idx.push(a0, b0, a1, b0, b1, a1); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  add(obj, shadowCast = false, shadowRecv = true) {
    obj.castShadow = shadowCast; obj.receiveShadow = shadowRecv;
    this.group.add(obj);
    return obj;
  }

  /* ---------- road ---------- */
  _buildRoad() {
    const def = this.def;
    const frames = this.framesLoop();
    const roadTex = Tex.road(def.road);
    const isNeon = def.road === 'neon', isCosmic = def.road === 'cosmic';
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex, roughness: isCosmic ? 0.35 : def.road === 'ice' ? 0.55 : 0.85, metalness: isCosmic ? 0.1 : 0,
      emissive: isNeon ? 0xffffff : isCosmic ? 0xffffff : 0x000000,
      emissiveMap: isNeon ? Tex.roadGlow('neon') : isCosmic ? roadTex : null,
      emissiveIntensity: isNeon ? 1.4 : isCosmic ? 0.55 : 0,
      transparent: isCosmic, opacity: isCosmic ? 0.94 : 1,
    });
    const road = new THREE.Mesh(this.sweep(frames, (f) => [[f.w / 2, 0], [-f.w / 2, 0]], [{ a: 0, b: 1, u0: 0, u1: 1 }], { vLen: isCosmic ? 24 : 14 }), roadMat);
    this.add(road, false, true);
    if (isCosmic) {
      // glowing underside + edge strips
      const under = new THREE.Mesh(this.sweep(frames, (f) => [[f.w / 2, -0.3], [-f.w / 2, -0.3]], [{ a: 1, b: 0, u0: 1, u1: 0 }], { vLen: 24 }),
        new THREE.MeshBasicMaterial({ color: 0x7a4dff, transparent: true, opacity: 0.55 }));
      this.add(under, false, false);
      const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      for (const s of [1, -1]) {
        const prof = (f) => [[s * (f.w / 2 + 0.25), 0.12], [s * (f.w / 2 - 0.05), 0.12], [s * (f.w / 2 + 0.25), -0.3], [s * (f.w / 2 - 0.05), -0.3]];
        const faces = s > 0 ? [{ a: 0, b: 1, u0: 0, u1: 1 }, { a: 2, b: 0, u0: 0, u1: 1 }] : [{ a: 1, b: 0, u0: 0, u1: 1 }, { a: 0, b: 2, u0: 0, u1: 1 }];
        this.add(new THREE.Mesh(this.sweep(frames, prof, faces, { vLen: 10 }), edgeMat), false, false);
      }
      return;
    }
    // curbs: outer edge slightly raised
    const curbMat = new THREE.MeshStandardMaterial({ map: Tex.curb(def.curb[0], def.curb[1]), roughness: 0.7,
      emissive: isNeon ? 0xffffff : 0, emissiveMap: isNeon ? Tex.curb(def.curb[0], def.curb[1]) : null, emissiveIntensity: isNeon ? 0.6 : 0 });
    for (const s of [1, -1]) {
      const prof = (f) => [[s * f.w / 2, 0.015], [s * (f.w / 2 + 1.3), 0.13]];
      const face = s > 0 ? { a: 1, b: 0, u0: 1, u1: 0 } : { a: 0, b: 1, u0: 0, u1: 1 };
      this.add(new THREE.Mesh(this.sweep(frames, prof, [face], { vLen: 6 }), curbMat), false, true);
    }
    // shoulders between curb and wall (match terrain look)
    const th = this.theme;
    const shoulderMat = new THREE.MeshLambertMaterial({ map: Tex.ground(def.ground), vertexColors: true });
    shoulderMat.map.repeat.set(1, 1);
    for (const s of [1, -1]) {
      const prof = (f) => [[s * (f.w / 2 + 1.25), 0.1], [s * (f.wall + 1.6), -0.05]];
      const face = s > 0 ? { a: 1, b: 0, u0: 0, u1: 1 } : { a: 0, b: 1, u0: 0, u1: 1 };
      const shade = (x, z) => 0.92 + this.noise.n2(x * 0.08, z * 0.08) * 0.1;
      this.add(new THREE.Mesh(this.sweep(frames, prof, [face], { worldUV: 8, color: th.shoulder, shade }), shoulderMat), false, true);
    }
  }

  /* ---------- walls / rails ---------- */
  _buildWalls() {
    const def = this.def;
    const style = def.wallStyle;
    const H = { blocks: 1.25, rock: 2.4, snow: 1.5, neon: 1.15, rail: 0.75, wood: 1.2 }[style] || 1.2;
    const half = style === 'rock' ? 0.9 : style === 'snow' ? 0.8 : 0.35;
    let mat;
    if (style === 'neon') mat = new THREE.MeshStandardMaterial({ map: Tex.wall('neon'), emissive: 0xffffff, emissiveMap: Tex.wallGlow('neon'), emissiveIntensity: 1.6, roughness: 0.5 });
    else if (style === 'rail') mat = new THREE.MeshBasicMaterial({ color: 0xff7ae8 });
    else mat = new THREE.MeshLambertMaterial({ map: Tex.wall(style) });
    const vLen = style === 'blocks' ? 6 : style === 'rock' ? 18 : 10;
    const mk = (frames) => {
      for (const s of [1, -1]) {
        const prof = (f) => {
          const wd = f.wall, inner = s * (wd - half), outer = s * (wd + half);
          return [[inner, H], [inner, -0.6], [outer, H], [outer, -0.6]];
        };
        const faces = s > 0
          ? [{ a: 0, b: 1, u0: 1, u1: 0 }, { a: 2, b: 0, u0: 1, u1: 1 }, { a: 3, b: 2, u0: 0, u1: 1 }]
          : [{ a: 1, b: 0, u0: 0, u1: 1 }, { a: 0, b: 2, u0: 1, u1: 1 }, { a: 2, b: 3, u0: 1, u1: 0 }];
        const m = new THREE.Mesh(this.sweep(frames, prof, faces, { vLen, swapUV: true }), mat);
        this.add(m, style === 'rock', true);
      }
    };
    if (def.void) {
      for (const [a, b] of def.rails || []) mk(this.framesRange(a * this.L, b * this.L, 2));
      // posts under the rails
    } else mk(this.framesLoop());
    // chevron boards on the outside of tight corners
    if (!def.void) {
      const chevGeo = new THREE.PlaneGeometry(4, 1);
      const chevMat = new THREE.MeshBasicMaterial({ map: Tex.chevron(style === 'neon' ? '#29e4ff' : '#ffd02b'), side: THREE.DoubleSide });
      let last = -1e9;
      for (let i = 0; i < this.N; i += 2) {
        const k = this.K[i];
        if (Math.abs(k) < 1 / 26 || this.D[i] - last < 14) continue;
        last = this.D[i];
        const side = k > 0 ? -1 : 1; // outside of the corner
        const f = this.sampleFrame(i);
        const lat = side * (f.wall + half + 0.05);
        const m = new THREE.Mesh(chevGeo, chevMat);
        m.position.set(f.px + f.lx * lat, f.py + f.ly * lat + H + 0.55, f.pz + f.lz * lat);
        m.rotation.y = Math.atan2(f.tx, f.tz) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
        if (k > 0) m.scale.x = -1;
        this.group.add(m);
      }
    }
  }

  /* ---------- terrain ---------- */
  terrainNatural(x, z, dEdge) {
    const n = this.noise, th = this.def.theme;
    if (th === 'meadow') {
      let h = n.fbm(x * 0.008, z * 0.008, 4) * 5 + 0.5;
      h += smoothstep(90, 320, dEdge) * (n.fbm(x * 0.003 + 40, z * 0.003, 3) * 24 + 14);
      const lk = this.lake;
      if (lk) { const d = Math.hypot(x - lk.x, z - lk.z); h = lerp(h, -7, smoothstep(lk.r * 1.15, lk.r * 0.55, d)); }
      return h;
    }
    if (th === 'canyon') {
      let h = n.fbm(x * 0.012, z * 0.012, 3) * 2.5;
      const ridge = smoothstep(26, 70, dEdge);
      h += ridge * (34 + n.fbm(x * 0.015, z * 0.015, 4) * 16);
      const tt = h / 3.4, terr = (Math.floor(tt) + smoothstep(0.3, 0.7, tt - Math.floor(tt))) * 3.4;
      return lerp(h, terr, ridge);
    }
    if (th === 'snow') {
      let h = n.fbm(x * 0.008, z * 0.008, 4) * 6;
      h += smoothstep(40, 170, dEdge) * (n.fbm(x * 0.004 + 9, z * 0.004, 4) * 40 + 34);
      return h;
    }
    if (th === 'city') return -0.12;
    return 0;
  }
  _buildTerrain() {
    const def = this.def, b = this.bounds;
    if (def.lake) { const S = def.scale || 1; this.lake = { x: def.lake[0] * S, z: def.lake[1] * S, r: def.lake[2] * S }; }
    const margin = def.theme === 'city' ? 140 : 260;
    const step = this.quality >= 2 ? 3 : 4.5;
    const x0 = b.mnx - margin, z0 = b.mnz - margin;
    const nx = Math.ceil((b.mxx - b.mnx + 2 * margin) / step), nz = Math.ceil((b.mxz - b.mnz + 2 * margin) / step);
    this.tg = { x0, z0, step, nx, nz, h: new Float32Array((nx + 1) * (nz + 1)) };
    const H = this.tg.h;
    const pos = new Float32Array((nx + 1) * (nz + 1) * 3);
    const uv = new Float32Array((nx + 1) * (nz + 1) * 2);
    // splat each centre-line sample onto nearby grid vertices to find the nearest sample fast
    const R = 90, R2 = R * R, W1 = nx + 1;
    const bestD = new Float32Array(W1 * (nz + 1)).fill(R2), bestI = new Int32Array(W1 * (nz + 1)).fill(-1);
    for (let s = 0; s < this.N; s++) {
      const px = this.P[s * 3], pz = this.P[s * 3 + 2];
      const ia = Math.max(0, Math.floor((px - R - x0) / step)), ib = Math.min(nx, Math.ceil((px + R - x0) / step));
      const ja = Math.max(0, Math.floor((pz - R - z0) / step)), jb = Math.min(nz, Math.ceil((pz + R - z0) / step));
      for (let j = ja; j <= jb; j++) {
        const dz = z0 + j * step - pz, dz2 = dz * dz;
        if (dz2 > R2) continue;
        for (let i = ia; i <= ib; i++) {
          const dx = x0 + i * step - px, d = dx * dx + dz2, k = j * W1 + i;
          if (d < bestD[k]) { bestD[k] = d; bestI[k] = s; }
        }
      }
    }
    // coarse distance field for vertices beyond the splat radius
    const cs = 16, cnx = Math.ceil((nx * step) / cs) + 1, cnz = Math.ceil((nz * step) / cs) + 1;
    const cd = new Float32Array(cnx * cnz);
    for (let cj = 0; cj < cnz; cj++) for (let ci = 0; ci < cnx; ci++) {
      const x = x0 + ci * cs, z = z0 + cj * cs;
      let m = Infinity;
      for (let s = 0; s < this.N; s += 2) { const dx = x - this.P[s * 3], dz = z - this.P[s * 3 + 2]; const d = dx * dx + dz * dz; if (d < m) m = d; }
      cd[cj * cnx + ci] = Math.sqrt(m);
    }
    const farDist = (x, z) => {
      const fx = (x - x0) / cs, fz = (z - z0) / cs;
      const i = clamp(Math.floor(fx), 0, cnx - 2), j = clamp(Math.floor(fz), 0, cnz - 2);
      const u = clamp(fx - i, 0, 1), v = clamp(fz - j, 0, 1);
      return lerp(lerp(cd[j * cnx + i], cd[j * cnx + i + 1], u), lerp(cd[(j + 1) * cnx + i], cd[(j + 1) * cnx + i + 1], u), v);
    };
    const edgeAvg = (def.width || 20) / 2 + (def.wall ?? 6);
    const q = {};
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const x = x0 + i * step, z = z0 + j * step;
      const k = j * W1 + i;
      let h;
      if (bestI[k] >= 0) {
        this._project(x, this.P[bestI[k] * 3 + 1], z, bestI[k], q);
        const edge = q.wall === Infinity ? q.width / 2 + 6 : q.wall;
        const dEdge = Math.abs(q.lateral) - edge;
        const latC = clamp(q.lateral, -(edge + 2), edge + 2);
        const base = q.cy + latC * q.slopeY - 0.42;
        const blendEnd = def.theme === 'meadow' || def.theme === 'snow' ? 68 : 48;
        if (dEdge < 5) h = base;
        else h = lerp(base, this.terrainNatural(x, z, dEdge), smoothstep(5, blendEnd, dEdge));
      } else h = this.terrainNatural(x, z, Math.max(R - edgeAvg, farDist(x, z) - edgeAvg));
      H[k] = h;
      pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
      uv[k * 2] = x / 8; uv[k * 2 + 1] = z / 8;
    }
    const idx = new Uint32Array(nx * nz * 6);
    let o = 0;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b2 = a + 1, c = a + nx + 1, d = c + 1;
      idx[o++] = a; idx[o++] = c; idx[o++] = b2; idx[o++] = b2; idx[o++] = c; idx[o++] = d;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();
    // vertex colours by theme, height and slope
    const nrm = g.attributes.normal.array;
    const col = new Float32Array(pos.length);
    const T = this.theme.terrain.map((c) => new THREE.Color(c));
    const c = new THREE.Color(), tmp = new THREE.Color();
    const th = def.theme, n = this.noise;
    for (let k = 0; k < pos.length / 3; k++) {
      const x = pos[k * 3], y = pos[k * 3 + 1], z = pos[k * 3 + 2], ny = nrm[k * 3 + 1];
      const v = n.fbm(x * 0.02, z * 0.02, 3);
      c.copy(T[0]).lerp(v > 0 ? T[2] : T[1], Math.abs(v) * 1.6);
      if (th === 'meadow') {
        if (y < -0.6) c.lerp(tmp.set('#d9c78f'), smoothstep(-0.6, -2.2, y));
        if (ny < 0.7) c.lerp(tmp.set('#8a7d6a'), smoothstep(0.7, 0.5, ny));
        if (y > 30) c.lerp(tmp.set('#7fa86a'), smoothstep(30, 45, y));
      } else if (th === 'canyon') {
        const band = Math.sin(y * 0.9) * 0.5 + 0.5;
        const rockC = tmp.set(band > 0.6 ? '#b65a38' : band > 0.3 ? '#cf7a4a' : '#e0995e');
        c.lerp(rockC, smoothstep(0.9, 0.55, ny) * 0.9 + smoothstep(4, 14, y) * 0.5);
      } else if (th === 'snow') {
        if (ny < 0.78) c.lerp(tmp.set('#8d97ab'), smoothstep(0.78, 0.5, ny));
        c.lerp(tmp.set('#cfdcf5'), smoothstep(0.98, 0.85, ny) * 0.3);
      }
      col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, map: Tex.ground(def.ground) });
    const terrain = new THREE.Mesh(g, mat);
    this.add(terrain, false, true);
    if (this.lake) this._buildWater(this.lake.x, this.lake.z, this.lake.r * 1.6, -1.6);
  }
  heightAt(x, z) {
    const tg = this.tg;
    if (!tg) return 0;
    const fx = (x - tg.x0) / tg.step, fz = (z - tg.z0) / tg.step;
    const i = clamp(Math.floor(fx), 0, tg.nx - 1), j = clamp(Math.floor(fz), 0, tg.nz - 1);
    const u = clamp(fx - i, 0, 1), v = clamp(fz - j, 0, 1);
    const H = tg.h, w = tg.nx + 1;
    const a = H[j * w + i], b = H[j * w + i + 1], c = H[(j + 1) * w + i], d = H[(j + 1) * w + i + 1];
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  }
  _buildWater(x, z, r, y) {
    const geo = new THREE.CircleGeometry(r, 48);
    geo.rotateX(-Math.PI / 2);
    const fog = this.theme.fog;
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTime: { value: 0 }, uDeep: { value: new THREE.Color('#1f6fb8') }, uShallow: { value: new THREE.Color('#45b6e8') },
        uSky: { value: new THREE.Color(this.theme.sky[1]) }, uSun: { value: new THREE.Vector3(...this.theme.sunDir).normalize() },
        uFog: { value: new THREE.Color(fog[0]) }, uFogNear: { value: fog[1] }, uFogFar: { value: fog[2] }, uCenter: { value: new THREE.Vector2(x, z) }, uR: { value: r },
      },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform float uTime, uFogNear, uFogFar, uR; uniform vec3 uDeep, uShallow, uSky, uSun, uFog; uniform vec2 uCenter; varying vec3 vW;
        void main(){
          vec2 p = vW.xz;
          float w1 = sin(p.x*0.35 + uTime*1.3) * cos(p.y*0.31 - uTime*1.1);
          float w2 = sin(p.x*0.9 - p.y*0.7 + uTime*2.1);
          vec3 N = normalize(vec3(w1*0.08 + w2*0.04, 1.0, w2*0.05 - w1*0.03));
          vec3 V = normalize(cameraPosition - vW);
          float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
          float edge = smoothstep(uR*0.55, uR*0.95, length(p - uCenter));
          vec3 col = mix(uDeep, uShallow, edge*0.7 + 0.15);
          col = mix(col, uSky, fres*0.75);
          vec3 H = normalize(uSun + V);
          col += vec3(1.0,0.97,0.9) * pow(max(dot(N,H),0.0), 180.0) * 1.6;
          float sparkle = step(0.985, fract(sin(dot(floor(p*3.0), vec2(12.9898,78.233)))*43758.5453 + uTime*0.6));
          col += sparkle * 0.25;
          float fd = length(cameraPosition - vW);
          col = mix(col, uFog, smoothstep(uFogNear, uFogFar, fd));
          gl_FragColor = vec4(col, 0.9);
        }`,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    this.group.add(m);
    this.updaters.push((dt, t) => { mat.uniforms.uTime.value = t; });
  }

  /* ---------- start line, gantry, grid ---------- */
  _buildStart() {
    const def = this.def;
    const f0 = this.frameAt(0);
    // checkered strip
    const frames = this.framesRange(-1.4, 1.4, 2.8);
    const chk = Tex.checker().clone(); chk.needsUpdate = true;
    chk.repeat.set(f0.w / 11.2, 1);
    const strip = new THREE.Mesh(this.sweep(frames, (f) => [[f.w / 2, 0.03], [-f.w / 2, 0.03]], [{ a: 0, b: 1, u0: 0, u1: 1 }], { vLen: 2.8 }),
      new THREE.MeshStandardMaterial({ map: chk, roughness: 0.6 }));
    strip.geometry.attributes.uv.array.forEach((v, i, arr) => { if (i % 2 === 1) arr[i] = v - frames[0].d / 2.8; });
    this.add(strip, false, true);
    // grid slot markings
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (let k = 0; k < 8; k++) {
      const g = this.gridSlot(k);
      const fr = this.framesRange(g.s + 1.6, g.s + 1.9, 0.3);
      const m = new THREE.Mesh(this.sweep(fr, (f) => [[g.lat + 1.3, 0.03], [g.lat - 1.3, 0.03]], [{ a: 0, b: 1, u0: 0, u1: 1 }], { vLen: 1 }), lineMat);
      this.group.add(m);
    }
    // gantry
    const gantry = new THREE.Group();
    const half = def.void ? f0.w / 2 + 1.2 : f0.wall + 0.9;
    const pillarM = Mats.std(def.theme === 'city' ? 0x2a2a3a : 0xf4f2ee, { r: 0.5 });
    const H = 7.6;
    for (const s of [1, -1]) {
      const p = mesh(roundedBoxGeo(1.1, H + 1, 1.1, 0.2), pillarM, s * half, (H + 1) / 2 - 1, 0, gantry);
      const band = mesh(G.box(1.16, 0.6, 1.16), Mats.std(0xe8392f, { r: 0.5 }), s * half, H - 1.4, 0, gantry);
    }
    const beam = mesh(roundedBoxGeo(half * 2 + 1.2, 1.8, 0.9, 0.2), Mats.std(0x1f2354, { r: 0.5 }), 0, H + 0.3, 0, gantry);
    for (const side of [1, -1]) {
      const ban = new THREE.Mesh(new THREE.PlaneGeometry(half * 1.5, 1.4), new THREE.MeshBasicMaterial({ map: Tex.banner('KARTOON GRAND PRIX', '#1f2354', '#ffd02b', 1024, 128) }));
      ban.position.set(0, H + 0.3, side * 0.46); ban.rotation.y = side > 0 ? 0 : Math.PI;
      gantry.add(ban);
    }
    const chkTop = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 1.2, 0.5), new THREE.MeshBasicMaterial({ map: Tex.checker(), side: THREE.DoubleSide }));
    chkTop.position.set(0, H + 1.45, 0); gantry.add(chkTop);
    // countdown lights (face the approaching karts: -Z side of the gantry)
    this.startLights = [];
    for (let i = 0; i < 3; i++) {
      const lm = new THREE.MeshStandardMaterial({ color: 0x331111, emissive: 0x000000, roughness: 0.3 });
      const l = mesh(G.sphere(0.42, 16, 12), lm, (i - 1) * 1.3, H - 1.0, -0.4, gantry);
      mesh(G.cyl(0.55, 0.55, 0.2, 16), Mats.std(0x111118), (i - 1) * 1.3, H - 1.0, -0.25, gantry).rotation.x = Math.PI / 2;
      this.startLights.push(lm);
    }
    gantry.position.set(f0.px, f0.py, f0.pz);
    gantry.rotation.y = Math.atan2(f0.tx, f0.tz);
    gantry.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.group.add(gantry);
    this.gantry = gantry;
    // grandstands near the start
    if (!def.void && def.theme !== 'city') {
      const crowd = Tex.crowd(this.seed % 97);
      for (const [s0, side] of [[-34, 1], [10, -1]]) {
        const f = this.frameAt(s0 + 12);
        const lat = side * (f.wall + 7);
        const stand = new THREE.Group();
        const steps = mesh(G.box(24, 1, 8), Mats.std(0x8b93a8), 0, 0.5, 0, stand);
        const slope = new THREE.Mesh(new THREE.PlaneGeometry(24, 9.4), new THREE.MeshLambertMaterial({ map: crowd }));
        slope.position.set(0, 3.6, 0.2); slope.rotation.x = -1.0; stand.add(slope);
        crowd.repeat.set(2, 1);
        mesh(G.box(24, 6.5, 0.6), Mats.std(0x6a7288), 0, 3.25, -4, stand);
        const roof = mesh(G.box(26, 0.4, 9.5), Mats.std(0xe8392f), 0, 8.6, -0.4, stand);
        roof.rotation.x = 0.08;
        for (const x of [-12, 0, 12]) mesh(G.box(0.4, 8.6, 0.4), Mats.std(0xf4f2ee), x, 4.3, -3.8, stand);
        const sx = f.px + f.lx * lat, sz = f.pz + f.lz * lat;
        stand.position.set(sx, this.tg ? Math.min(this.heightAt(sx, sz), f.py) - 0.2 : f.py, sz);
        stand.rotation.y = Math.atan2(f.tx, f.tz) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
        stand.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        this.group.add(stand);
        this.updaters.push((dt, t) => { crowd.offset.y = Math.abs(Math.sin(t * 9)) * 0.012; });
      }
    }
  }
  /* starting grid slot k (0 = pole position) */
  gridSlot(k) {
    const f = this.frameAt(0);
    const row = Math.floor(k / 2), col = k % 2;
    const s = -7 - row * 6 - col * 3;
    return { s, lat: (col ? -1 : 1) * Math.min(4.2, f.w / 4) };
  }
  setStartLights(n) { // n: 0 off, 1..3 red, 4 green
    this.startLights.forEach((m, i) => {
      if (n === 4) { m.color.set(0x113311); m.emissive.set(0x33ff55); m.emissiveIntensity = 2.2; }
      else if (i < n) { m.color.set(0x331111); m.emissive.set(0xff2a1a); m.emissiveIntensity = 2.2; }
      else { m.color.set(0x331111); m.emissive.set(0x000000); }
    });
  }

  /* ---------- boost pads / ramps ---------- */
  _buildFeatureMeshes() {
    const padTex = Tex.boostPad().clone(); padTex.needsUpdate = true;
    const padMat = new THREE.MeshBasicMaterial({ map: padTex, transparent: true, opacity: 0.95 });
    for (const b of this.boosts) {
      const fr = this.framesRange(b.s, b.s + b.len, 1);
      const g = this.sweep(fr, (f) => [[b.lat + b.w / 2, 0.04], [b.lat - b.w / 2, 0.04]], [{ a: 0, b: 1, u0: 0, u1: 1 }], { vLen: b.len / 2 });
      const uvs = g.attributes.uv.array;
      for (let i = 1; i < uvs.length; i += 2) uvs[i] -= fr[0].d / (b.len / 2);
      this.group.add(new THREE.Mesh(g, padMat));
      // glow light
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.glow(), color: 0xffa020, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      const p = this.pointAt(b.s + b.len / 2, b.lat, 0.6); glow.position.copy(p); glow.scale.set(7, 3, 1);
      this.group.add(glow);
    }
    this.updaters.push((dt) => { padTex.offset.y -= dt * 1.6; });
    const rampTop = new THREE.MeshStandardMaterial({ map: Tex.chevron('#ffd02b', '#1f2354'), roughness: 0.6, emissive: 0x332200 });
    const rampSide = Mats.std(0x2a2f6a, { r: 0.6 });
    for (const r of this.ramps) {
      const fr = this.framesRange(r.s, r.s + r.len, 1);
      fr.forEach((f) => { f.rh = r.h * ((f.d - r.s) / r.len); });
      const L = r.lat + r.w / 2, R = r.lat - r.w / 2;
      const top = this.sweep(fr, (f) => [[L, f.rh + 0.02], [R, f.rh + 0.02]], [{ a: 0, b: 1, u0: 0, u1: 1 }], { vLen: 1.6, swapUV: true });
      const sides = this.sweep(fr, (f) => [[L, f.rh], [L, -0.2], [R, f.rh], [R, -0.2]], [{ a: 1, b: 0, u0: 0, u1: 1 }, { a: 2, b: 3, u0: 1, u1: 0 }], { vLen: 4 });
      this.add(new THREE.Mesh(top, rampTop), true, true);
      this.add(new THREE.Mesh(sides, rampSide), true, true);
      const end = this.frameAt(r.s + r.len);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.h + 0.2), rampSide);
      back.position.set(end.px + end.lx * r.lat, end.py + r.h / 2 - 0.1, end.pz + end.lz * r.lat);
      back.rotation.y = Math.atan2(end.tx, end.tz);
      this.group.add(back);
    }
  }

  /* ---------- sky ---------- */
  _buildSky() {
    const th = this.theme;
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: new THREE.Color(th.sky[0]) }, mid: { value: new THREE.Color(th.sky[1]) }, bot: { value: new THREE.Color(th.sky[2]) },
        sunDir: { value: new THREE.Vector3(...th.sunDir).normalize() }, sunCol: { value: new THREE.Color(th.sun) },
        night: { value: this.def.theme === 'city' || this.def.theme === 'space' ? 1 : 0 },
      },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }',
      fragmentShader: `uniform vec3 top, mid, bot, sunDir, sunCol; uniform float night; varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir); float h = d.y;
          vec3 col = h > 0.0 ? mix(mid, top, pow(clamp(h,0.0,1.0), 0.55)) : mix(mid, bot, pow(clamp(-h,0.0,1.0), 0.35));
          float sd = max(dot(d, sunDir), 0.0);
          col += sunCol * (pow(sd, 900.0) * 3.0 * (1.0 - night*0.4) + pow(sd, 40.0) * 0.25 + pow(sd, 6.0) * 0.08 * (1.0 - night));
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), mat);
    sky.renderOrder = -10; sky.frustumCulled = false;
    this.sky = sky;
    this.followers.push({ obj: sky });
    this.group.add(sky);
  }

  update(dt, t, camera) {
    for (const u of this.updaters) u(dt, t, camera);
    if (camera) this.followCamera(camera);
  }
  /* sky, stars and moon stay centred on whichever camera is rendering */
  followCamera(cam) {
    for (const f of this.followers) {
      f.obj.position.copy(cam.position);
      if (f.offset) f.obj.position.add(f.offset);
    }
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) { if (!Mats.shared.has(m)) m.dispose(); }
      }
    });
  }
}
