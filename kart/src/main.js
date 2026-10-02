/* ============================================================
   Showroom (menu 3D scene), portraits, game flow and main loop
   ============================================================ */
class Showroom {
  constructor(game) {
    this.game = game;
    const scene = this.scene = new THREE.Scene();
    this.time = 0;
    // sunburst backdrop
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { uTime: { value: 0 }, c1: { value: new THREE.Color('#2b3192') }, c2: { value: new THREE.Color('#3a47b8') }, c3: { value: new THREE.Color('#ff9a6a') } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }',
      fragmentShader: `uniform float uTime; uniform vec3 c1, c2, c3; varying vec3 vD;
        void main(){
          vec3 d = normalize(vD);
          float a = atan(d.z, d.x) / 6.2831853;
          float rays = step(0.5, fract(a * 18.0 + uTime * 0.02));
          vec3 col = mix(c1, c2, rays);
          col = mix(c3, col, smoothstep(-0.02, 0.16, d.y));
          col = mix(col, vec3(0.08,0.09,0.2), smoothstep(-0.05, -0.4, d.y));
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), this.skyMat);
    sky.renderOrder = -10;
    scene.add(sky);
    scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x3a2a5a, 1.6));
    const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
    sun.position.set(12, 22, 14); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 70 });
    sun.shadow.bias = -0.0005;
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x8fb4ff, 1.2); rim.position.set(-14, 8, -12); scene.add(rim);
    // turntable stage
    this.stage = new THREE.Group();
    scene.add(this.stage);
    const top = Tex.checker().clone(); top.needsUpdate = true; top.repeat.set(6, 24);
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(11, 11.4, 0.8, 64), [
      new THREE.MeshStandardMaterial({ color: 0x1f2354, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ map: top, roughness: 0.6, color: 0xdddddd }),
      new THREE.MeshStandardMaterial({ color: 0x1f2354 }),
    ]);
    plat.position.y = -0.4; plat.receiveShadow = true;
    this.stage.add(plat);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(11.2, 0.18, 8, 96), new THREE.MeshStandardMaterial({ color: 0xffd02b, emissive: 0xffa000, emissiveIntensity: 0.6 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; this.stage.add(ring);
    this.bulbs = [];
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * TAU;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      b.position.set(Math.cos(a) * 11.25, -0.25, Math.sin(a) * 11.25);
      this.stage.add(b); this.bulbs.push(b);
    }
    const floor = new THREE.Mesh(new THREE.CircleGeometry(80, 64), new THREE.MeshStandardMaterial({ color: 0x232766, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.8; floor.receiveShadow = true;
    scene.add(floor);
    // karts in a circle
    this.karts = CHARACTERS.map((c, i) => {
      const m = buildKart(c, i + 1);
      const a = (i / CHARACTERS.length) * TAU;
      const holder = new THREE.Group();
      holder.position.set(Math.sin(a) * 7, 0, Math.cos(a) * 7);
      holder.rotation.y = a;
      holder.add(m.root);
      this.stage.add(holder);
      m.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      return { m, holder, a, hop: 0 };
    });
    this.fx = new FX(scene, 1);
    this.cam = game.camera;
    this.mode = 'title'; this.sel = 0;
    this.stageRot = 0; this.camPos = new THREE.Vector3(0, 7, 24); this.camLook = new THREE.Vector3(0, 1, 0);
    this.podium = null;
    try {
      const pm = new THREE.PMREMGenerator(game.renderer);
      const env = new THREE.Scene();
      env.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), this.skyMat));
      this.envRT = pm.fromScene(env, 0.04, 0.1, 200);
      scene.environment = this.envRT.texture;
      pm.dispose();
    } catch (e) { /* optional */ }
  }
  setMode(mode, sel) {
    this.mode = mode;
    if (sel != null) this.sel = sel;
    const showKarts = mode !== 'podium';
    this.stage.visible = showKarts;
    if (this.podium) this.podium.visible = mode === 'podium';
  }
  cheer(i) { this.karts[i].hop = 0.6; this.fx.burst(this.karts[i].holder.getWorldPosition(_iv).x, 1.5, _iv.z, 30, 8, 0.8, 0.8, [1, 0.85, 0.3, 1], [1, 0.4, 0.8, 0], 6, 2); }
  update(dt) {
    this.time += dt;
    const t = this.time;
    this.skyMat.uniforms.uTime.value = t;
    this.bulbs.forEach((b, i) => b.material.color.setHex(((i + Math.floor(t * 6)) % 4 === 0) ? 0xffd02b : 0xffffff));
    let camT, lookT;
    if (this.mode === 'char') {
      const a = this.karts[this.sel].a;
      this.stageRot = dampAngle(this.stageRot, -a, 5, dt);
      const narrow = innerWidth < 860;
      camT = narrow ? _iv.set(0, 3.0, 17) : _iv.set(-3.4, 2.5, 15.6);
      lookT = narrow ? _iv2.set(0, 2.0, 9.6) : _iv2.set(-1.5, 1.15, 9.6);
    } else if (this.mode === 'podium') {
      const a = Math.sin(t * 0.3) * 0.55;
      camT = _iv.set(Math.sin(a) * 15, 4.2, Math.cos(a) * 15);
      lookT = _iv2.set(0, 1.9, 0);
      if (Math.random() < dt * 6) this.fx.confetti(0, 14, 0, 6);
    } else {
      this.stageRot += dt * (this.mode === 'title' ? 0.18 : 0.08);
      const narrow = innerWidth < 860;
      camT = _iv.set(0, this.mode === 'title' ? 5.5 : 6.5, narrow ? 27 : 21);
      lookT = _iv2.set(this.mode === 'menu' && !narrow ? -3 : 0, 1.6, 0);
    }
    this.stage.rotation.y = this.stageRot;
    this.camPos.lerp(camT, 1 - Math.exp(-3 * dt));
    this.camLook.lerp(lookT, 1 - Math.exp(-3 * dt));
    this.cam.position.copy(this.camPos);
    this.cam.lookAt(this.camLook);
    if (this.cam.fov !== 45) { this.cam.fov = 45; this.cam.updateProjectionMatrix(); }
    // idle animations
    this.karts.forEach((k, i) => {
      const selected = this.mode === 'char' && i === this.sel;
      k.r = damp(k.r ?? 7, selected ? 9.6 : 7, 6, dt);
      k.holder.position.set(Math.sin(k.a) * k.r, 0, Math.cos(k.a) * k.r);
      k.m.root.rotation.y = selected ? damp(k.m.root.rotation.y, Math.sin(t * 0.8) * 0.5, 3, dt) : damp(k.m.root.rotation.y, 0, 3, dt);
      k.hop = Math.max(0, k.hop - dt);
      k.m.root.position.y = Math.sin((k.hop / 0.6) * Math.PI) * 1.2 + (selected ? Math.abs(Math.sin(t * 3)) * 0.06 : 0);
      for (const w of k.m.wheels) if (w.front) w.pivot.rotation.y = selected ? Math.sin(t * 1.3) * 0.3 : 0;
      k.m.driver.head.rotation.y = Math.sin(t * 0.7 + i) * 0.35;
      const fl = selected && Math.sin(t * 2) > 0.6;
      for (const f of k.m.flames) { f.visible = fl; f.scale.setScalar(fl ? 0.8 + Math.random() * 0.3 : 0.01); }
    });
    if (this.podium) this.podium.userData.trophy.rotation.y += dt;
    this.fx.update(dt);
  }
  buildPodium(top3) {
    if (this.podium) { this.scene.remove(this.podium); }
    const g = new THREE.Group();
    const H = [2.6, 1.8, 1.2], X = [0, -4.2, 4.2], cols = [0xffd54a, 0xdfe7f0, 0xeb9a58];
    top3.forEach((ci, i) => {
      if (ci == null) return;
      const blk = new THREE.Mesh(roundedBoxGeo(4, H[i], 4, 0.25), new THREE.MeshStandardMaterial({ color: 0x1f2354, roughness: 0.5 }));
      blk.position.set(X[i], H[i] / 2, 0); blk.castShadow = true; blk.receiveShadow = true; g.add(blk);
      const num = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: Tex.number(i + 1, '#' + cols[i].toString(16)), transparent: true }));
      num.position.set(X[i], H[i] * 0.55, 2.02); g.add(num);
      const k = buildKart(CHARACTERS[ci], ci + 1);
      k.root.position.set(X[i], H[i], 0.2);
      k.root.rotation.y = 0;
      k.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      g.add(k.root);
    });
    const trophy = buildTrophy();
    trophy.position.set(0, H[0] + 2.5, -1.6); trophy.scale.setScalar(1.1);
    g.add(trophy);
    g.userData.trophy = trophy;
    this.scene.add(g);
    this.podium = g;
  }
}

function makePortraits() {
  const out = {};
  try {
    const size = 160;
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.setSize(size, size, false);
    r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a80c0, 2.4));
    const d = new THREE.DirectionalLight(0xffffff, 2.4); d.position.set(2, 3, 4); scene.add(d);
    const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    for (const c of CHARACTERS) {
      const drv = buildDriver(c);
      scene.add(drv.group);
      const tall = c.id === 'pompon' ? 0.22 : 0;
      cam.position.set(0.7, 1.62 + tall, 2.75 + tall * 2);
      cam.lookAt(0, 1.32 + tall, -0.2);
      r.render(scene, cam);
      out[c.id] = r.domElement.toDataURL('image/png');
      scene.remove(drv.group);
    }
    r.dispose();
    if (r.forceContextLoss) r.forceContextLoss();
  } catch (e) { /* portraits are decorative */ }
  return out;
}

class Game {
  constructor() {
    this.canvas = $('#gl');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    MAX_ANISO = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.1, 4200);
    this.camera2 = new THREE.PerspectiveCamera(70, 1, 0.1, 4200);
    const hudRoot = $('#hud');
    const hudRoot2 = hudRoot.cloneNode(true);
    hudRoot2.id = 'hud2';
    hudRoot.after(hudRoot2);
    this.hud = new HUD(hudRoot, 0);
    this.hud2 = new HUD(hudRoot2, 1);
    this.splitLine = $('#splitLine');
    this.speedLines = new SpeedLines($('#speedfx'));
    this.applyQuality();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.showroom = new Showroom(this);
    this.menu = new Menu(this);
    this.race = null; this.gp = null;
    this.last = performance.now();
    this.fpsAcc = 0; this.fpsN = 0;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyF' && !e.repeat) this.toggleFullscreen();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.race && this.race.state === 'race' && !this.race.paused) this.pause(); });
  }
  get split() { return !!(this.race && this.race.isSplitView); }
  applyQuality() {
    const q = Settings.quality;
    const dpr = Math.min(window.devicePixelRatio || 1, q >= 2 ? 2 : q === 1 ? 1.25 : 0.85);
    this.renderer.setPixelRatio(dpr);
    this.renderer.shadowMap.enabled = q >= 1;
    this.resize();
  }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.speedLines.resize(w, h, Math.min(2, window.devicePixelRatio || 1));
    this.onViewsChanged();
  }
  /* camera aspect ratios + split line follow the current view layout */
  onViewsChanged() {
    const w = window.innerWidth, h = window.innerHeight, split = this.split;
    this.camera.aspect = split ? w / (h / 2) : w / h; this.camera.updateProjectionMatrix();
    this.camera2.aspect = w / (h / 2); this.camera2.updateProjectionMatrix();
    if (this.splitLine) this.splitLine.hidden = !split;
  }
  toggleFullscreen() {
    try {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      else document.exitFullscreen().catch(() => {});
    } catch (e) { /* not allowed here */ }
  }
  hideHUDs() { this.hud.show(false); this.hud2.show(false); this.hud.setLayout('full'); this.splitLine.hidden = true; }

  /* ---------- flow ---------- */
  startRace(opts) {
    this.lastOpts = opts;
    this.menu.hideAll();
    this.hideHUDs();
    $('#scr-loading').hidden = false;
    $('#loadMsg').textContent = `Préparation de ${TRACKS[opts.trackIndex].name}…`;
    $('#loadBar').style.width = '60%';
    Sound.stopMusic();
    // let the loading screen paint before the heavy build
    setTimeout(() => {
      if (this.race) { this.race.dispose(); this.race = null; }
      this.race = new Race(this, opts);
      this.onViewsChanged();
      this.renderer.compile(this.race.scene, this.camera);
      $('#scr-loading').hidden = true;
      $('#loadBar').style.width = '100%';
      this.menu.current = null;
      Input.clear();
    }, 60);
  }
  humanChars(o) { return o.playerChars || [o.playerChar]; }
  startGP(o) {
    const hc = this.humanChars(o);
    this.gp = { cc: o.cc, playerChars: hc, round: 0, points: new Array(CHARACTERS.length).fill(0), last: null };
    const others = CHARACTERS.map((_, i) => i).filter((i) => !hc.includes(i));
    for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
    this.gp.grid = [...others, ...hc];
    this.startRace({ mode: 'gp', cc: o.cc, playerChars: hc, trackIndex: 0, round: 0, gridOrder: this.gp.grid });
  }
  nextGPRace() {
    const gp = this.gp;
    gp.round++;
    // grid follows the overall standings, leader on pole
    gp.grid = CHARACTERS.map((_, i) => i).sort((a, b) => gp.points[b] - gp.points[a]);
    this.startRace({ mode: 'gp', cc: gp.cc, playerChars: gp.playerChars, trackIndex: gp.round, round: gp.round, gridOrder: gp.grid });
  }
  restartRace() {
    if (!this.lastOpts) return;
    if (this.lastOpts.mode === 'gp' && this.gp && this.gp.last && this.gp.last.round === this.lastOpts.round) {
      // undo the points of the race being replayed
      this.gp.last.gains.forEach((p, i) => { this.gp.points[i] -= p; });
      this.gp.last = null;
    }
    this.startRace(this.lastOpts);
  }
  pause() {
    if (!this.race || this.race.paused) return;
    this.race.setPaused(true);
    Sound.duckMusic(0.35, 9999);
    this.menu.show('pause');
  }
  resume() {
    if (!this.race) return;
    this.menu.hideAll();
    this.race.setPaused(false);
    Sound.duckMusic(1, 0);
    Input.clear();
  }
  quitToMenu(to = 'main') {
    if (this.race) { this.race.dispose(); this.race = null; }
    if (to !== 'track') this.gp = null;
    this.hideHUDs();
    this.onViewsChanged();
    this.speedLines.clear();
    this.showroom.setMode('menu');
    Sound.duckMusic(1, 0);
    Sound.music('menu', { restart: true });
    this.menu.show(to);
  }
  raceFinished(race) {
    if (race !== this.race) return;
    this.showResults();
  }
  rowHTML(i, c, cls, rt, pts, delay, tag = '') {
    return `<div class="res-row ${cls}" style="animation-delay:${delay}ms"><span class="rp ${i < 3 ? 'p' + (i + 1) : ''}">${i + 1}</span><img alt="" src="${this.hud.portraits[c.id] || ''}"><span class="rn">${c.name}<small>${tag || c.species}</small></span><span class="rt">${rt}</span><span class="pts">${pts}</span></div>`;
  }
  showResults() {
    const race = this.race, menu = this.menu;
    const P = race.player;
    const humanTag = (k) => (race.split && k.human != null ? 'Joueur ' + (k.human + 1) : '');
    // estimate the remaining finishing times
    const rows = race.ranking.map((k) => {
      let t = k.finishTime;
      if (!k.finished) t = race.time + Math.max(0, race.laps * race.track.L - k.progress) / Math.max(10, k.maxSpeed * 0.82);
      return { k, t, est: !k.finished };
    }).sort((a, b) => a.t - b.t);
    const tbl = $('#resTable'); tbl.innerHTML = '';
    $('#resRecord').hidden = true;
    const btns = $('#resBtns');
    if (race.mode === 'gp') {
      const gp = this.gp;
      const gains = new Array(CHARACTERS.length).fill(0);
      rows.forEach((r, i) => { gains[CHARACTERS.indexOf(r.k.def)] = GP_POINTS[i] || 0; });
      gains.forEach((p, i) => { gp.points[i] += p; });
      gp.last = { round: race.opts.round, gains };
      $('#resEyebrow').textContent = `Grand Prix · course ${race.opts.round + 1}/${TRACKS.length} · ${race.def.name}`;
      $('#resTitle').textContent = 'Classement général';
      const order = CHARACTERS.map((_, i) => i).sort((a, b) => gp.points[b] - gp.points[a]);
      order.forEach((ci, i) => {
        const c = CHARACTERS[ci];
        const hi = gp.playerChars.indexOf(ci);
        const ri = rows.findIndex((r) => r.k.def === c) + 1;
        tbl.insertAdjacentHTML('beforeend', this.rowHTML(i, c, hi >= 0 ? 'me' : '', `course : ${ri}${ordinal(ri)}`, `<em>+${gains[ci]}</em>${gp.points[ci]}`, i * 70, race.split && hi >= 0 ? 'Joueur ' + (hi + 1) : ''));
      });
      const last = race.opts.round >= TRACKS.length - 1;
      btns.innerHTML = last
        ? `<button class="btn" data-act="res-podium"><span>Voir le podium</span></button>`
        : `<button class="btn" data-act="res-next"><span>Course suivante<small>${TRACKS[race.opts.round + 1].name}</small></span></button><button class="btn small" data-act="res-retry"><span>Recommencer</span></button><button class="btn small" data-act="res-menu"><span>Abandonner</span></button>`;
    } else if (race.mode === 'tt') {
      $('#resEyebrow').textContent = `Contre-la-montre · ${race.def.name}`;
      $('#resTitle').textContent = fmtTime(P.finishTime);
      $('#resRecord').hidden = !race.newRecord;
      const best = Store.get('ghost.' + race.def.id, null);
      P.lapTimes.forEach((lt, i) => {
        tbl.insertAdjacentHTML('beforeend', `<div class="res-row" style="animation-delay:${i * 90}ms"><span class="rp">${i + 1}</span><img alt="" src="${this.hud.portraits[P.def.id] || ''}"><span class="rn">Tour ${i + 1}</span><span class="rt"></span><span class="pts">${fmtTime(lt)}</span></div>`);
      });
      if (best) tbl.insertAdjacentHTML('beforeend', `<div class="res-row me" style="animation-delay:400ms"><span class="rp">★</span><img alt="" src="${this.hud.portraits[(CHARACTERS[best.char] || P.def).id] || ''}"><span class="rn">Record</span><span class="rt"></span><span class="pts">${fmtTime(best.time)}</span></div>`);
      btns.innerHTML = `<button class="btn" data-act="res-retry"><span>Rejouer</span></button><button class="btn small" data-act="res-tracks"><span>Autre circuit</span></button><button class="btn small" data-act="res-menu"><span>Menu principal</span></button>`;
    } else {
      $('#resEyebrow').textContent = `Course libre${race.split ? ' à 2' : ''} · ${race.def.name} · ${CC[race.cc].label}`;
      $('#resTitle').textContent = 'Résultats';
      rows.forEach((r, i) => {
        const k = r.k;
        tbl.insertAdjacentHTML('beforeend', this.rowHTML(i, k.def, k.human != null ? 'me' : '', `${r.est ? '≈ ' : ''}${fmtTime(r.t)}`, '', i * 70, humanTag(k)));
      });
      btns.innerHTML = `<button class="btn" data-act="res-retry"><span>Rejouer</span></button><button class="btn small" data-act="res-tracks"><span>Changer de circuit</span></button><button class="btn small" data-act="res-menu"><span>Menu principal</span></button>`;
    }
    this.hideHUDs();
    this.race.views.forEach((v) => { if (v.kart.finished) v.orbit.r = 11; });
    menu.show('results');
    Sound.music('menu', { restart: true });
  }
  showPodium() {
    const gp = this.gp;
    const order = CHARACTERS.map((_, i) => i).sort((a, b) => gp.points[b] - gp.points[a]);
    if (this.race) { this.race.dispose(); this.race = null; }
    this.onViewsChanged();
    this.showroom.buildPodium(order.slice(0, 3));
    this.showroom.setMode('podium');
    const ranks = gp.playerChars.map((ci) => order.indexOf(ci) + 1);
    const best = Math.min(...ranks);
    const who = gp.playerChars.length > 1 ? ` · ${CHARACTERS[gp.playerChars[ranks.indexOf(best)]].name}` : '';
    $('#podTitle').textContent = (best === 1 ? 'Victoire ! Coupe d’or' : best === 2 ? 'Coupe d’argent !' : best === 3 ? 'Coupe de bronze !' : `${best}${ordinal(best)} au général`) + who;
    const shown = order.filter((ci, i) => i < 3 || gp.playerChars.includes(ci));
    $('#podTable').innerHTML = shown.map((ci) => {
      const i = order.indexOf(ci), c = CHARACTERS[ci], hi = gp.playerChars.indexOf(ci);
      return this.rowHTML(i, c, hi >= 0 ? 'me' : '', CC[gp.cc].label, gp.points[ci], i * 60, gp.playerChars.length > 1 && hi >= 0 ? 'Joueur ' + (hi + 1) : '');
    }).join('');
    this.menu.show('podium');
    Sound.music('menu', { restart: true });
    Sound.jingle(best <= 3 ? 'gpWin' : 'good');
    if (best <= 3) Sound.sfx('cheer');
    this.gp = null;
  }

  /* ---------- main loop ---------- */
  renderView(scene, cam, x, y, w, h, fx) {
    const r = this.renderer;
    r.setViewport(x, y, w, h); r.setScissor(x, y, w, h);
    if (this.race) this.race.track.followCamera(cam);
    if (fx) fx.setScale(h * r.getPixelRatio(), cam);
    r.render(scene, cam);
  }
  frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.frameCount = (this.frameCount || 0) + 1;
    Input.update(dt);
    const race = this.race;
    if (race && !race.paused && this.menu.current == null && Input.wasPressed('pause')) this.pause();
    else this.menu.update(dt);
    const w = window.innerWidth, h = window.innerHeight;
    if (race) {
      const wasSplit = this._wasSplit;
      race.update(dt);
      const split = this.split;
      if (split !== wasSplit) { this._wasSplit = split; this.onViewsChanged(); }
      if (split) {
        this.renderer.setScissorTest(true);
        this.renderView(race.scene, this.camera, 0, h / 2, w, h / 2, race.fx);
        this.renderView(race.scene, this.camera2, 0, 0, w, h / 2, race.fx);
        this.renderer.setScissorTest(false);
        this.renderer.setViewport(0, 0, w, h);
        this.speedLines.update(dt, 0);
      } else {
        this.renderer.setViewport(0, 0, w, h);
        race.track.followCamera(this.camera);
        race.fx.setScale(this.renderer.domElement.height, this.camera);
        this.renderer.render(race.scene, this.camera);
        const P = race.player;
        const amt = race.paused ? 0 : (P.boost > 0 ? 1 : 0) + clamp((P.speed - P.maxSpeed * 0.95) / (P.maxSpeed * 0.3), 0, 0.6);
        this.speedLines.update(dt, race.state === 'race' && !P.finished ? amt : 0);
      }
    } else {
      this._wasSplit = false;
      this.showroom.update(dt);
      this.showroom.fx.setScale(this.renderer.domElement.height, this.camera);
      this.renderer.render(this.showroom.scene, this.camera);
    }
    Input.endFrame();
    this.fpsAcc += dt; this.fpsN++;
    if (this.fpsAcc > 0.5) { this.hud.setFps(Math.round(this.fpsN / this.fpsAcc)); this.fpsAcc = 0; this.fpsN = 0; }
  }
  run() {
    const loop = (t) => { requestAnimationFrame(loop); try { this.frame(t); } catch (e) { console.error(e); } };
    requestAnimationFrame(loop);
  }
  /* test helpers: drive the players with the AI and fast-forward the simulation */
  autopilot(skill = 0.8) { if (this.race) for (const k of this.race.humans) k.ai = new AIDriver(k, this.race, skill); }
  simulate(sec, dt = 1 / 30) {
    const n = Math.round(sec / dt);
    for (let i = 0; i < n && this.race; i++) { Input.update(dt); this.race.update(dt); Input.endFrame(); }
  }
}

/* ---------- boot ---------- */
function boot() {
  const msg = $('#loadMsg'), bar = $('#loadBar');
  if (!window.THREE) {
    msg.textContent = 'Impossible de charger le moteur 3D (three.js). Vérifie ta connexion Internet puis recharge la page.';
    return;
  }
  bar.style.width = '35%';
  msg.textContent = 'Construction des pilotes…';
  // canvas textures draw text with the display font: give it a moment to load
  let fontWait = Promise.resolve();
  try {
    if (document.fonts && document.fonts.load) {
      fontWait = Promise.race([
        Promise.all([document.fonts.load('64px "Lilita One"'), document.fonts.load('900 16px "Nunito"')]),
        new Promise((r) => setTimeout(r, 1800)),
      ]).catch(() => {});
    }
  } catch (e) { /* no font loading API */ }
  fontWait.then(() => setTimeout(() => {
    try {
      const game = new Game();
      window.__kartoon = game;
      bar.style.width = '70%';
      const portraits = makePortraits();
      game.hud.portraits = portraits; game.hud2.portraits = portraits;
      game.menu.setPortraits(portraits);
      bar.style.width = '100%';
      game.menu.show('title');
      game.run();
      window.claude?.hot?.snapshot?.(() => ({ settings: Object.assign({}, Settings) }));
    } catch (e) {
      console.error(e);
      msg.textContent = 'Erreur au démarrage : ' + (e && e.message ? e.message : e) + '. Essaie un autre navigateur (Chrome, Edge ou Firefox récents).';
    }
  }, 30));
}
const startApp = (data) => {
  if (data && data.settings) Object.assign(Settings, data.settings);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
};
if (window.claude?.hot?.ready) window.claude.hot.ready(startApp); else startApp(window.claude?.hot?.data ?? {});
