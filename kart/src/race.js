/* ============================================================
   Race — builds a scene for one race and runs it (1 or 2 humans)
   ============================================================ */
const GP_POINTS = [15, 12, 10, 8, 6, 4, 2, 1];

class Race {
  constructor(game, opts) {
    this.game = game; this.opts = opts;
    this.mode = opts.mode; this.cc = opts.cc || 150;
    this.def = TRACKS[opts.trackIndex];
    this.laps = this.def.laps || 3;
    this.camera = game.camera;
    const humanChars = opts.playerChars || [opts.playerChar];
    this.split = humanChars.length > 1;
    Input.setPlayers(humanChars.length);
    this.scene = new THREE.Scene();
    this.track = new Track(this.def, Settings.quality);
    this.scene.add(this.track.group);
    this._lights();
    this.fx = new FX(this.scene, Settings.quality);
    this.time = 0; this.clock = 0; this.state = 'intro'; this.started = false; this.paused = false;
    this.finishOrder = [];
    this.stats = { mt: [0, 0, 0, 0], hits: {}, items: {}, falls: 0, walls: 0, pads: 0, tricks: 0 };
    this.timers = new Timers();
    this.drones = new Map();
    // karts
    this.karts = []; this.humans = [];
    if (this.mode === 'tt') {
      const k = new Kart(this, CHARACTERS[humanChars[0]], 0, true);
      k.human = 0; this.humans.push(k); this.karts.push(k);
    } else {
      const order = opts.gridOrder || this._defaultGrid(humanChars);
      order.forEach((ci, slot) => {
        const hi = humanChars.indexOf(ci);
        const k = new Kart(this, CHARACTERS[ci], slot, hi >= 0);
        if (hi >= 0) { k.human = hi; this.humans[hi] = k; }
        this.karts.push(k);
      });
    }
    this.player = this.humans[0];
    this.karts.forEach((k, slot) => { const g = this.track.gridSlot(this.mode === 'tt' ? 0 : slot); k.placeAt(g.s, g.lat); k.place = slot + 1; });
    // AI drivers
    const baseSkill = { 50: 0.32, 100: 0.55, 150: 0.76, 200: 0.9 }[this.cc];
    for (const k of this.karts) {
      if (k.human != null) continue;
      const v = rand(-0.14, 0.14);
      k.ai = new AIDriver(k, this, baseSkill + v);
      k.aiBase = CC[this.cc].ai * (1 + v * 0.12);
      k.aiMul = k.aiBase;
    }
    this.ranking = this.karts.slice();
    // one view (camera + HUD + voices) per human
    this.views = this.humans.map((k, i) => {
      const cam = i === 0 ? game.camera : game.camera2;
      const v = { kart: k, cam, chase: new ChaseCam(cam), orbit: new OrbitCam(cam), hud: i === 0 ? game.hud : game.hud2, steerS: 0, pressT: -1, lookBack: false };
      v.engine = Sound.engine(this.split ? 0.4 : 0.5);
      v.driftLoop = Sound.loopNoise('bandpass', 2600, 2.5);
      v.offLoop = Sound.loopNoise('lowpass', 380, 1);
      k.view = v; k.hud = v.hud;
      v.chase.reset(k);
      return v;
    });
    this.chase = this.views[0].chase;
    this.items = new Items(this);
    if (this.mode === 'tt') this.items.giveItem(this.player, 'nitro3');
    this.intro = new IntroCam(this.camera, this.track, this.player);
    // ghost (time trial)
    this.ghostRec = []; this.ghostT = 0;
    if (this.mode === 'tt') this._setupGhost();
    this._envMap();
    this.aiEngines = [Sound.engine(0.3), Sound.engine(0.3)].filter(Boolean);
    this.views.forEach((v, i) => {
      v.hud.setupRace(this, v.kart);
      v.hud.setLayout('full');
      if (i > 0) v.hud.show(false);
    });
    if (this.ghostData) this.views[0].hud.ghostInfo(this.ghostData.time);
    this.camRight = new THREE.Vector3();
    Sound.music(this.def.music, { restart: true });
  }
  get isSplitView() { return this.split && this.state !== 'intro'; }

  _defaultGrid(humanChars) {
    const others = CHARACTERS.map((_, i) => i).filter((i) => !humanChars.includes(i));
    for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
    return [...others, ...humanChars];
  }

  _lights() {
    const th = this.track.theme, q = Settings.quality;
    this.scene.fog = new THREE.Fog(th.fog[0], th.fog[1], th.fog[2]);
    this.scene.background = new THREE.Color(th.fog[0]);
    const hemi = new THREE.HemisphereLight(th.hemi[0], th.hemi[1], th.hemi[2]);
    this.scene.add(hemi);
    this.sun = new THREE.DirectionalLight(th.sun, th.sunI);
    this.sunDir = new THREE.Vector3(...th.sunDir).normalize();
    this.sun.castShadow = q >= 1 && !this.split;
    if (this.sun.castShadow) {
      const sz = q >= 2 ? 2048 : 1024;
      this.sun.shadow.mapSize.set(sz, sz);
      const c = this.sun.shadow.camera;
      c.left = -48; c.right = 48; c.top = 48; c.bottom = -48; c.near = 1; c.far = 260;
      this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.04;
    }
    this.sun.position.copy(this.sunDir).multiplyScalar(200);
    this.scene.add(this.sun, this.sun.target);
    if (this.def.theme === 'city' || this.def.theme === 'space') {
      this.kartLight = new THREE.PointLight(this.def.theme === 'city' ? 0xffd9a8 : 0xd8c8ff, 60, 30, 2);
      this.scene.add(this.kartLight);
    }
  }
  _envMap() {
    try {
      const r = this.game.renderer;
      const pm = new THREE.PMREMGenerator(r);
      const envScene = new THREE.Scene();
      const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), this.track.sky.material);
      envScene.add(sky);
      const hemi = new THREE.Mesh(new THREE.SphereGeometry(40, 16, 8, 0, TAU, Math.PI * 0.55, Math.PI * 0.45), new THREE.MeshBasicMaterial({ color: this.track.theme.hemi[1], side: THREE.BackSide }));
      envScene.add(hemi);
      this.envRT = pm.fromScene(envScene, 0.04, 0.1, 200);
      this.scene.environment = this.envRT.texture;
      pm.dispose();
      sky.geometry.dispose(); hemi.geometry.dispose(); hemi.material.dispose();
      const I = this.track.theme.env;
      this.scene.traverse((o) => { if (o.material && o.material.isMeshStandardMaterial) o.material.envMapIntensity = I; });
    } catch (e) { /* environment map is optional */ }
  }

  _setupGhost() {
    const best = Store.get('ghost.' + this.def.id, null);
    if (best && best.frames && best.frames.length > 10) {
      this.ghostData = best;
      const m = buildKart(CHARACTERS[best.char] || CHARACTERS[0], 0);
      m.root.traverse((o) => {
        if (o.material) {
          o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.38; o.material.depthWrite = false;
        }
        o.castShadow = false;
      });
      m.blob.visible = false;
      this.ghost = m;
      this.scene.add(m.root);
    }
  }

  /* ---------------- helpers used by karts / items ---------------- */
  nearestCam(p) {
    let best = this.views[0].cam, bd = Infinity;
    for (const v of this.views) { const d = v.cam.position.distanceToSquared(p); if (d < bd) { bd = d; best = v.cam; } }
    return best;
  }
  isNear(o) {
    for (const v of this.views) if (o.pos.distanceToSquared(v.cam.position) < 95 * 95) return true;
    return false;
  }
  shakeNear(x, y, z, amt) {
    for (const v of this.views) {
      const d = v.kart.pos.distanceTo(_iv.set(x, y, z));
      if (d < 28) v.chase.shake = Math.max(v.chase.shake, amt * (1 - d / 28));
    }
  }
  sfxAt(name, obj, vol = 1) {
    const p = obj.pos, cam = this.nearestCam(p).position;
    const dx = p.x - cam.x, dz = p.z - cam.z, dist = Math.hypot(dx, dz);
    if (dist > 85) return;
    const att = clamp(1 - dist / 85, 0, 1) * vol;
    if (att < 0.06) return;
    const pan = this.split ? 0 : clamp((dx * this.camRight.x + dz * this.camRight.z) / Math.max(8, dist), -1, 1) * 0.8;
    if (name === 'wall') Sound.sfx('wall', att, pan);
    else if (name === 'explosion') Sound.sfx('explosion', Math.min(1.2, att * 1.2), pan);
    else if (name === 'boost') Sound.sfx('boost', att * 0.7);
    else if (att > 0.25) Sound.sfx(name, pan);
  }
  kartAhead(k, range) {
    let best = null, bestD = range;
    const sh = Math.sin(k.heading), ch = Math.cos(k.heading);
    for (const o of this.karts) {
      if (o === k || o.respawning > 0) continue;
      const rx = o.pos.x - k.pos.x, rz = o.pos.z - k.pos.z;
      const fwd = rx * sh + rz * ch;
      if (fwd <= 0 || fwd > bestD) continue;
      const side = -rx * ch + rz * sh;
      if (Math.abs(side) > fwd * 0.6 + 2) continue;
      bestD = fwd; best = { kart: o, dist: fwd, aligned: Math.abs(Math.atan2(side, fwd)) < 0.16 };
    }
    return best;
  }
  kartBehind(k, range) {
    let best = null, bestD = range;
    const sh = Math.sin(k.heading), ch = Math.cos(k.heading);
    for (const o of this.karts) {
      if (o === k || o.respawning > 0) continue;
      const rx = o.pos.x - k.pos.x, rz = o.pos.z - k.pos.z;
      const fwd = rx * sh + rz * ch;
      if (fwd >= 0 || -fwd > bestD) continue;
      bestD = -fwd; best = { kart: o, dist: -fwd };
    }
    return best;
  }

  /* ---------------- events ---------------- */
  hitKart(k, type, src) {
    const ok = k.hit(type, src);
    if (!ok) return false;
    this.stats.hits[type] = (this.stats.hits[type] || 0) + 1;
    this.items.dropAll(k);
    if (k.view) { k.view.chase.shake = Math.max(k.view.chase.shake, type === 'tumble' ? 1 : 0.5); Sound.sfx(type === 'spin' ? 'spin' : 'hit'); }
    else this.sfxAt(type === 'spin' || type === 'squash' ? 'spin' : 'hit', k, 1.2);
    return true;
  }
  onKartHit(k, type, src, coinsLost) {
    for (let i = 0; i < coinsLost * 3; i++) {
      this.fx.add.emit(k.pos.x, k.pos.y + 1, k.pos.z, rand(-5, 5), rand(5, 9), rand(-5, 5), 0.9, 0.7, 0.5, [1, 0.8, 0.15, 1], [1, 0.9, 0.3, 0], 18, 0.5);
    }
  }
  onWallHit(k, impact, q) {
    this.stats.walls++;
    const x = k.pos.x + q.nx * Math.sign(q.lateral) * 1.0, z = k.pos.z + q.nz * Math.sign(q.lateral) * 1.0;
    if (this.isNear(k)) this.fx.burst(x, k.pos.y + 0.5, z, Math.min(18, impact), 7, 0.35, 0.4, [1, 0.85, 0.4, 1], [1, 0.4, 0.1, 0], 14, 1);
    if (k.view) { Sound.sfx('wall', clamp(impact / 22, 0.25, 1)); k.view.chase.shake = Math.max(k.view.chase.shake, clamp(impact / 40, 0.1, 0.6)); }
    else this.sfxAt('wall', k, clamp(impact / 22, 0.2, 1));
  }
  onBoostPad(k) {
    this.stats.pads++;
    if (this.isNear(k)) this.fx.burst(k.pos.x, k.pos.y + 0.4, k.pos.z, 10, 5, 0.4, 0.7, [1, 0.7, 0.2, 1], [1, 0.3, 0, 0], 2, 2);
    if (!k.isPlayer) this.sfxAt('boost', k, 0.5);
  }
  onMiniTurbo(k, level) {
    this.stats.mt[level]++;
    if (this.isNear(k)) this.fx.burst(k.pos.x, k.pos.y + 0.5, k.pos.z, 8 + level * 6, 6, 0.35, 0.6, FXCOL.spark[level], [1, 1, 1, 0], 6, 2);
  }
  onFall(k, stuck) {
    if (k.respawning > 0) return;
    this.stats.falls++;
    if (k.drift) k.endDrift(false);
    this.items.dropAll(k);
    if (!stuck && this.def.void && this.isNear(k)) this.fx.burst(k.pos.x, k.pos.y, k.pos.z, 20, 6, 0.8, 1.2, [0.7, 0.5, 1, 1], [0.3, 0.6, 1, 0], -2, 1);
    k.startRespawn();
    if (k.isPlayer) Sound.sfx('respawn');
    const d = ItemModels.drone();
    d.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.scene.add(d);
    this.drones.set(k, d);
  }
  onLap(k) {
    if (k.lap >= this.laps && !k.finished) { this.finishKart(k); return; }
    if (k.human == null || k.lap < 1) return;
    const lt = k.lapTimes[k.lapTimes.length - 1];
    k.hud.lapDone(k.lap + 1, this.laps, lt);
    if (k.lap === this.laps - 1) {
      k.hud.message('TOUR FINAL !', 2.2, true);
      Sound.jingle('finalLap');
      if (!this.finalLapMusic) {
        this.finalLapMusic = true;
        this.timers.after(1.2, () => { if (!this.humans.some((h) => h.star > 0)) Sound.musicTempo(1.12); });
      }
    } else Sound.jingle('lap');
  }
  finishKart(k) {
    k.finished = true; k.finishTime = this.time;
    this.finishOrder.push(k);
    k.lapTimes.length = Math.min(k.lapTimes.length, this.laps);
    if (k.human == null) return;
    const tt = this.mode === 'tt';
    const place = tt ? 1 : this.finishOrder.length;
    k.hud.finish(place, tt);
    Sound.jingle(tt ? 'good' : place === 1 ? 'win' : place <= 3 ? 'good' : 'lose');
    if (place <= 3 || tt) { Sound.sfx('cheer'); this.fx.confetti(k.pos.x, k.pos.y + 6, k.pos.z, 120); }
    // the AI takes the wheel for the cool-down lap
    k.ai = new AIDriver(k, this, 0.6);
    k.view.orbit.target.copy(k.pos);
    k.view.orbit.a = k.heading + Math.PI;
    if (this.humans.every((h) => h.finished)) {
      this.state = 'finished';
      Sound.musicTempo(1);
      Sound.stopMusic();
      if (tt) this._saveGhost();
      this.timers.after(4.2, () => this.game.raceFinished(this));
    }
  }
  onStar() { }
  onLightning(user) {
    Sound.sfx('lightning');
    this.fx.flash = 1;
    for (const k of this.karts) {
      if (k === user || k.star > 0 || k.respawning > 0 || k.finished) continue;
      k.invuln = 0;
      if (k.hit('spin', user)) this.items.dropAll(k);
      k.shrink = 3 + (8 - k.place) * 0.45;
      if (k.isPlayer) Sound.sfx('shrink');
    }
  }
  onUnshrink(k) { if (k.isPlayer) Sound.sfx('hop'); }

  _saveGhost() {
    const P = this.player, total = P.finishTime;
    const best = Store.get('ghost.' + this.def.id, null);
    this.newRecord = !best || total < best.time;
    if (this.newRecord) {
      const frames = this.ghostRec.map((f) => f.map((v) => Math.round(v * 100) / 100));
      Store.set('ghost.' + this.def.id, { time: total, char: CHARACTERS.indexOf(P.def), frames, laps: P.lapTimes.slice() });
    }
  }

  /* ---------------- frame update ---------------- */
  readHuman(v, dt) {
    const k = v.kart, inp = k.input;
    inp.driftPressed = false; inp.itemPressed = false; inp.itemReleased = false;
    v.lookBack = false;
    if (k.ai) { k.ai.update(dt); return; }
    if (this.state !== 'race' && this.state !== 'countdown') return;
    const c = Input.ctrl(k.human);
    const brake = c.isDown('brake');
    inp.accel = Settings.autoAccel ? (brake ? 0 : 1) : c.accel();
    inp.brake = brake ? 1 : 0;
    // keyboard steering eases in over ~0.1 s so small taps stay precise
    const target = c.steer();
    const growing = Math.abs(target) > Math.abs(v.steerS) && Math.sign(target) === Math.sign(v.steerS || target);
    const rate = c.analog() ? 30 : growing ? 9 : 16;
    v.steerS += clamp(target - v.steerS, -rate * dt, rate * dt);
    inp.steer = v.steerS;
    inp.drift = c.isDown('drift'); inp.driftPressed = c.wasPressed('drift');
    inp.item = c.isDown('item'); inp.itemPressed = c.wasPressed('item'); inp.itemReleased = c.wasReleased('item');
    v.lookBack = c.isDown('look');
    inp.back = brake || v.lookBack;
  }
  update(dt) {
    if (this.paused) return;
    this.clock += dt;
    this.timers.update(dt);
    const P = this.player;
    for (const v of this.views) this.readHuman(v, dt);
    if (this.state === 'intro') {
      if (Input.wasPressed('ok') || Input.wasPressed('item') || Input.wasPressed('drift')) this.intro.t = Math.max(this.intro.t, this.intro.dur - 0.6);
      if (this.intro.update(dt, this.chase)) this.startCountdown();
    } else if (this.state === 'countdown') {
      this.updateCountdown(dt);
    } else {
      this.time += dt;
    }
    for (const k of this.karts) if (k.ai && k.human == null) k.ai.update(dt);

    // physics
    if (this.started) {
      const n = Math.min(8, Math.ceil(dt / (1 / 120)));
      const h = dt / n;
      for (let i = 0; i < n; i++) {
        for (const k of this.karts) k.step(h);
        this.collideKarts();
        if (i === 0) for (const k of this.karts) k.input.driftPressed = false;
      }
    }
    this.items.update(dt, this.clock);
    this.rank();
    this.rubberBand(dt);
    for (const k of this.karts) k.updateVisual(dt, this.clock);
    this.updateDrones(dt);
    if (this.ghost) this.updateGhost();
    if (this.mode === 'tt' && this.started && !P.finished) {
      this.ghostT += dt;
      if (this.ghostT >= 0.05) { this.ghostT -= 0.05; this.ghostRec.push([P.pos.x, P.pos.y, P.pos.z, P.heading, P.vis.driftYaw]); }
    }
    this.fx.update(dt);

    // cameras
    if (this.state !== 'intro') {
      for (const v of this.views) {
        if (v.kart.finished) v.orbit.update(dt, v.kart.pos);
        else if (this.state !== 'countdown') v.chase.update(dt, v.kart, this.track, v.lookBack);
      }
    }
    this.track.update(dt, this.clock, this.camera);
    this.camRight.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    if (this.sun.castShadow) {
      const tx = Math.round(P.pos.x / 2) * 2, tz = Math.round(P.pos.z / 2) * 2;
      this.sun.target.position.set(tx, P.pos.y, tz);
      this.sun.position.set(tx + this.sunDir.x * 120, P.pos.y + this.sunDir.y * 120, tz + this.sunDir.z * 120);
    }
    if (this.kartLight) this.kartLight.position.set(P.pos.x, P.pos.y + 5, P.pos.z);
    this.updateAudio(dt);
    // music swaps for the star
    const starOn = this.humans.some((h) => h.star > 0 && !h.finished);
    if (starOn && Sound.musicName() !== 'star' && this.state === 'race') Sound.music('star');
    else if (!starOn && Sound.musicName() === 'star') Sound.music(this.def.music, { restart: true, tempo: this.finalLapMusic ? 1.12 : 1 });
    for (const v of this.views) v.hud.update(dt, this);
  }

  startCountdown() {
    this.state = 'countdown';
    this.countT = 0; this.countStep = -1;
    this.views.forEach((v, i) => {
      v.chase.reset(v.kart);
      v.hud.countdownStart();
      if (this.split) { v.hud.setLayout(i === 0 ? 'top' : 'bottom'); v.hud.show(true); }
    });
    this.game.onViewsChanged();
    for (const k of this.karts) if (k.ai && k.human == null) k.startPlan = Math.random() < k.ai.skill * 0.75 ? 'boost' : Math.random() < 0.12 ? 'burn' : 'normal';
  }
  updateCountdown(dt) {
    this.countT += dt;
    const step = Math.floor(this.countT);
    if (step !== this.countStep) {
      this.countStep = step;
      if (step < 3) { this.track.setStartLights(step + 1); for (const v of this.views) v.hud.count(3 - step); Sound.sfx('count', false); }
      else if (step === 3) { this.go(); return; }
    }
    // rocket start window, per human
    for (const v of this.views) {
      const k = v.kart;
      if (!k.ai) {
        const c = Input.ctrl(k.human);
        const acc = Settings.autoAccel ? c.isDown('accel') : c.accel() > 0.2;
        if (acc) { if (v.pressT < 0) v.pressT = this.countT; } else v.pressT = -1;
        k.input.accel = acc ? 1 : 0;
      }
      v.chase.update(dt, k, this.track, false);
    }
    for (const k of this.karts) {
      if (k.human != null) continue;
      k.input.accel = (k.startPlan === 'boost' && this.countT > 1.7) || (k.startPlan === 'burn' && this.countT > 0.4) ? 1 : 0;
    }
  }
  go() {
    this.state = 'race'; this.started = true; this.time = 0;
    this.track.setStartLights(4);
    Sound.sfx('count', true);
    for (const k of this.karts) k.lapStart = 0;
    for (const v of this.views) {
      v.hud.count(0);
      const k = v.kart, pt = v.pressT;
      if (k.ai) continue;
      if (pt >= 1.55 && pt <= 2.45) { k.applyBoost(pt >= 1.75 && pt <= 2.25 ? 1.5 : 1.0, 'nitro'); Sound.sfx('rocket'); v.hud.message('DÉPART CANON !', 1.2); }
      else if (pt >= 0 && pt < 1.0) { k.spin = 0.9; Sound.sfx('burnout'); v.hud.message('PATINAGE…', 1); }
    }
    for (const k of this.karts) {
      if (k.human != null) continue;
      if (k.startPlan === 'boost') k.applyBoost(rand(0.9, 1.4), 'nitro');
      else if (k.startPlan === 'burn') k.spin = 0.8;
    }
    this.timers.after(1.4, () => this.track.setStartLights(0));
  }

  collideKarts() {
    const ks = this.karts;
    for (let i = 0; i < ks.length; i++) {
      const a = ks[i];
      if (a.respawning > 0) continue;
      for (let j = i + 1; j < ks.length; j++) {
        const b = ks[j];
        if (b.respawning > 0) continue;
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, dy = b.pos.y - a.pos.y;
        if (Math.abs(dy) > 1.6) continue;
        const min = a.radius * a.vis.scale + b.radius * b.vis.scale;
        const d2 = dx * dx + dz * dz;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 0.01, nx = dx / d, nz = dz / d, overlap = min - d;
        if (a.star > 0 && b.star <= 0) this.hitKart(b, 'tumble', a);
        if (b.star > 0 && a.star <= 0) this.hitKart(a, 'tumble', b);
        if (a.shrink > 0 && b.shrink <= 0 && b.star <= 0) this.hitKart(a, 'squash', b);
        if (b.shrink > 0 && a.shrink <= 0 && a.star <= 0) this.hitKart(b, 'squash', a);
        const ma = a.mass * a.vis.scale, mb = b.mass * b.vis.scale, tot = ma + mb;
        a.pos.x -= nx * overlap * mb / tot; a.pos.z -= nz * overlap * mb / tot;
        b.pos.x += nx * overlap * ma / tot; b.pos.z += nz * overlap * ma / tot;
        const rv = (b.vel.x - a.vel.x) * nx + (b.vel.z - a.vel.z) * nz;
        if (rv < 0) {
          const jImp = -(1 + 0.75) * rv / (1 / ma + 1 / mb);
          a.vel.x -= nx * jImp / ma; a.vel.z -= nz * jImp / ma;
          b.vel.x += nx * jImp / mb; b.vel.z += nz * jImp / mb;
          if (-rv > 2.5 && (a.view || b.view)) {
            Sound.sfx('bump');
            for (const v of [a.view, b.view]) if (v) v.chase.shake = Math.max(v.chase.shake, 0.25);
            this.fx.burst((a.pos.x + b.pos.x) / 2, a.pos.y + 0.6, (a.pos.z + b.pos.z) / 2, 8, 5, 0.3, 0.4, [1, 1, 0.7, 1], [1, 0.6, 0.2, 0], 10, 1);
          }
        }
      }
    }
  }

  rank() {
    const r = this.ranking;
    r.sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.progress - a.progress;
    });
    r.forEach((k, i) => { k.place = i + 1; });
  }
  rubberBand(dt) {
    const active = this.humans.filter((h) => !h.finished);
    const ref = active.length ? Math.max(...active.map((h) => h.progress)) : null;
    for (const k of this.karts) {
      if (k.human != null || !k.aiBase) continue;
      let mul = k.aiBase;
      if (ref != null) {
        const gap = k.progress - ref;
        mul *= gap > 0 ? 1 - clamp(gap / 500, 0, 0.09) : 1 + clamp(-gap / 450, 0, 0.1);
      }
      k.aiMul = damp(k.aiMul, mul, 0.8, dt);
    }
  }
  updateDrones(dt) {
    for (const [k, d] of this.drones) {
      if (k.respawning <= 0) {
        d.position.y += dt * 12;
        if (d.position.y > k.pos.y + 25) { this.scene.remove(d); this.drones.delete(k); }
        d.userData.line.visible = false;
      } else {
        d.position.set(k.pos.x, k.pos.y + 4.2, k.pos.z);
        d.rotation.y = k.heading;
      }
      for (const r of d.userData.rotors) r.rotation.y += dt * 40;
      const ln = d.userData.line; ln.position.y = -2.4; ln.scale.y = 3.6;
    }
  }
  updateGhost() {
    const g = this.ghostData, fr = g.frames;
    if (!this.started) { const f0 = fr[0]; this.ghost.root.position.set(f0[0], f0[1], f0[2]); this.ghost.root.rotation.y = f0[3]; return; }
    const ft = this.time / 0.05;
    const i = Math.min(fr.length - 2, Math.floor(ft)), t = clamp(ft - i, 0, 1);
    const a = fr[i], b = fr[i + 1];
    if (!a || !b) return;
    this.ghost.root.position.set(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
    this.ghost.root.rotation.y = a[3] + wrapAngle(b[3] - a[3]) * t;
    this.ghost.body.rotation.y = lerp(a[4] || 0, b[4] || 0, t);
    for (const w of this.ghost.wheels) w.spin.rotation.x += 0.5;
    this.ghost.root.visible = ft < fr.length;
  }
  updateAudio(dt) {
    for (const v of this.views) {
      const P = v.kart;
      const boost = P.boost > 0 ? 1 : 0;
      if (v.engine) v.engine.set(clamp(Math.abs(P.speed) / P.maxSpeed, 0, 1.3), P.input.accel || 0, boost, this.state === 'intro' ? 0.4 : 1, this.split ? (P.human ? 0.25 : -0.25) : 0);
      if (v.driftLoop) v.driftLoop.set(P.drift && P.grounded ? 0.07 + P.driftLevel * 0.015 : 0, 2200 + P.driftLevel * 500);
      if (v.offLoop) v.offLoop.set(P.q.offroad && P.grounded && Math.abs(P.speed) > 3 && P.star <= 0 ? 0.14 : 0);
    }
    // two nearest opponents get an engine voice
    if (this.aiEngines.length) {
      const near = this.karts.filter((k) => k.human == null).map((k) => [k, k.pos.distanceTo(this.camera.position)]).sort((a, b) => a[1] - b[1]);
      this.aiEngines.forEach((v, i) => {
        const e = near[i];
        if (!e || e[1] > 60) { v.set(0, 0, 0, 0, 0); return; }
        const [k, d] = e;
        const rel = _iv.subVectors(k.pos, this.camera.position);
        const pan = this.split ? 0 : clamp(rel.dot(this.camRight) / Math.max(6, d), -1, 1);
        v.set(clamp(Math.abs(k.speed) / k.maxSpeed, 0, 1.3), 1, k.boost > 0 ? 1 : 0, clamp(1 - d / 60, 0, 1) * 0.8, pan * 0.8);
      });
    }
  }

  setPaused(p) {
    this.paused = p;
    if (p) {
      for (const v of this.views) { v.engine && v.engine.silence(); v.driftLoop && v.driftLoop.set(0); v.offLoop && v.offLoop.set(0); }
      this.aiEngines.forEach((v) => v.silence());
    }
  }
  dispose() {
    for (const v of this.views) { v.engine && v.engine.stop(); v.driftLoop && v.driftLoop.stop(); v.offLoop && v.offLoop.stop(); }
    this.aiEngines.forEach((v) => v.stop());
    this.items.dispose();
    for (const k of this.karts) k.dispose();
    for (const [, d] of this.drones) this.scene.remove(d);
    this.track.dispose();
    if (this.envRT) this.envRT.dispose();
    this.fx.clear();
    this.scene.clear();
    Input.setPlayers(1);
  }
}
