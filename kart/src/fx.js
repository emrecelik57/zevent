/* ============================================================
   Particles (GPU points, CPU simulated) + screen effects
   ============================================================ */
class Particles {
  constructor(max, additive) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.size = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.s0 = new Float32Array(max); this.s1 = new Float32Array(max);
    this.c0 = new Float32Array(max * 4); this.c1 = new Float32Array(max * 4);
    this.grav = new Float32Array(max); this.drag = new Float32Array(max);
    this.next = 0;
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos); g.setAttribute('aColor', this.aCol); g.setAttribute('aSize', this.aSize);
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { uScale: { value: 600 }, uSoft: { value: additive ? 0.0 : 0.15 } },
      vertexShader: `attribute float aSize; attribute vec4 aColor; varying vec4 vC; uniform float uScale;
        void main(){ vC = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = min(aSize * uScale / max(0.1, -mv.z), 256.0); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec4 vC; uniform float uSoft;
        void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5 || vC.a <= 0.003) discard; float a = 1.0 - smoothstep(uSoft, 0.5, d); gl_FragColor = vec4(vC.rgb, vC.a * a); }`,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }
  emit(x, y, z, vx, vy, vz, life, s0, s1, c0, c1, grav = 0, drag = 0) {
    const i = this.next; this.next = (this.next + 1) % this.max;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.life[i] = life; this.maxLife[i] = life; this.s0[i] = s0; this.s1[i] = s1;
    this.c0.set(c0, i * 4); this.c1.set(c1 || c0, i * 4);
    this.grav[i] = grav; this.drag[i] = drag;
  }
  update(dt) {
    const n = this.max;
    for (let i = 0; i < n; i++) {
      if (this.life[i] <= 0) { this.col[i * 4 + 3] = 0; this.size[i] = 0; continue; }
      this.life[i] -= dt;
      const t = 1 - Math.max(0, this.life[i]) / this.maxLife[i];
      const d = Math.exp(-this.drag[i] * dt);
      this.vel[i * 3] *= d; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * d - this.grav[i] * dt; this.vel[i * 3 + 2] *= d;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      for (let k = 0; k < 4; k++) this.col[i * 4 + k] = this.c0[i * 4 + k] + (this.c1[i * 4 + k] - this.c0[i * 4 + k]) * t;
      if (this.life[i] <= 0) { this.col[i * 4 + 3] = 0; this.size[i] = 0; }
    }
    this.aPos.needsUpdate = true; this.aCol.needsUpdate = true; this.aSize.needsUpdate = true;
  }
  clear() { this.life.fill(0); this.col.fill(0); this.size.fill(0); }
}

const FXCOL = {
  spark: [[0, 0, 0, 0], [0.35, 0.75, 1, 1], [1, 0.62, 0.15, 1], [0.85, 0.35, 1, 1]],
  white: [1, 1, 1, 1], fade: [1, 1, 1, 0],
};

class FX {
  constructor(scene, quality) {
    this.q = quality;
    this.add = new Particles(quality >= 2 ? 2600 : 1400, true);
    this.alpha = new Particles(quality >= 2 ? 1800 : 900, false);
    scene.add(this.add.points, this.alpha.points);
    this.shake = 0;
    this.flash = 0;
    this.flashEl = $('#flash');
  }
  setScale(h, camera) {
    const s = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    this.add.mat.uniforms.uScale.value = s; this.alpha.mat.uniforms.uScale.value = s;
  }
  update(dt) {
    this.add.update(dt); this.alpha.update(dt);
    this.shake = Math.max(0, this.shake - dt * 2.2);
    if (this.flash > 0) { this.flash = Math.max(0, this.flash - dt * 2.5); this.flashEl.style.opacity = String(this.flash * 0.8); }
  }
  clear() { this.add.clear(); this.alpha.clear(); this.flash = 0; this.flashEl.style.opacity = '0'; }
  /* presets */
  burst(x, y, z, n, speed, life, size, c0, c1, grav = 0, drag = 1.5, additive = true) {
    const P = additive ? this.add : this.alpha;
    for (let i = 0; i < n; i++) {
      const v = _v3.randomDirection().multiplyScalar(speed * rand(0.4, 1));
      P.emit(x, y, z, v.x, v.y + speed * 0.3, v.z, life * rand(0.6, 1.1), size, size * 0.2, c0, c1, grav, drag);
    }
  }
  explosion(x, y, z, scale = 1) {
    this.burst(x, y + 0.5, z, 60 * scale, 14 * scale, 0.7, 2.6 * scale, [1, 0.85, 0.35, 1], [1, 0.25, 0.05, 0], 2, 2.5);
    this.burst(x, y + 0.5, z, 30 * scale, 6 * scale, 1.4, 4 * scale, [0.25, 0.22, 0.25, 0.75], [0.4, 0.38, 0.4, 0], -1.5, 1.2, false);
    this.burst(x, y + 0.5, z, 30, 20 * scale, 0.5, 0.5, [1, 1, 0.8, 1], [1, 0.6, 0.2, 0], 12, 0.5);
  }
  confetti(x, y, z, n = 80) {
    const cols = [[1, 0.3, 0.3, 1], [1, 0.85, 0.2, 1], [0.3, 0.75, 1, 1], [0.45, 0.9, 0.4, 1], [1, 0.5, 0.85, 1]];
    for (let i = 0; i < n; i++) {
      const c = pick(cols);
      this.alpha.emit(x + rand(-8, 8), y + rand(0, 4), z + rand(-8, 8), rand(-3, 3), rand(4, 10), rand(-3, 3), rand(2.5, 4), 0.35, 0.35, c, [c[0], c[1], c[2], 0], 4, 1.2);
    }
  }
}
const _v3 = new THREE.Vector3();

/* speed lines overlay on a 2D canvas */
class SpeedLines {
  constructor(canvas) {
    this.c = canvas; this.g = canvas.getContext('2d');
    this.lines = Array.from({ length: 48 }, () => this._new());
    this.amount = 0;
  }
  _new() { return { a: rand(0, TAU), r: rand(0.25, 0.9), len: rand(0.08, 0.25), sp: rand(1.5, 3), w: rand(1, 3) }; }
  resize(w, h, dpr) { this.c.width = Math.floor(w * dpr * 0.5); this.c.height = Math.floor(h * dpr * 0.5); }
  update(dt, amount) {
    this.amount = damp(this.amount, amount, 6, dt);
    const g = this.g, W = this.c.width, H = this.c.height;
    g.clearRect(0, 0, W, H);
    if (this.amount < 0.02 || !Settings.speedFx) return;
    const cx = W / 2, cy = H * 0.46, R = Math.hypot(W, H) * 0.55;
    g.lineCap = 'round';
    for (const l of this.lines) {
      l.r += l.sp * dt * (0.6 + this.amount);
      if (l.r > 1.1) Object.assign(l, this._new(), { r: rand(0.25, 0.4) });
      const r0 = l.r * R, r1 = (l.r + l.len) * R;
      const alpha = this.amount * 0.5 * smoothstep(0.25, 0.5, l.r);
      g.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
      g.lineWidth = l.w * (W / 900);
      g.beginPath();
      g.moveTo(cx + Math.cos(l.a) * r0, cy + Math.sin(l.a) * r0 * 0.75);
      g.lineTo(cx + Math.cos(l.a) * r1, cy + Math.sin(l.a) * r1 * 0.75);
      g.stroke();
    }
  }
  clear() { this.amount = 0; this.g.clearRect(0, 0, this.c.width, this.c.height); }
}
