/* ============================================================
   Items — boxes, coins, held items, projectiles and hazards
   ============================================================ */
const ITEMS = {
  banana: { name: 'Banane', kind: 'drag' },
  banana3: { name: 'Triple banane', kind: 'trail3', count: 3 },
  green: { name: 'Palet vert', kind: 'drag' },
  green3: { name: 'Triple palet', kind: 'orbit3', count: 3 },
  red: { name: 'Missile rouge', kind: 'drag' },
  bomb: { name: 'Bombe', kind: 'drag' },
  nitro: { name: 'Nitro', kind: 'instant' },
  nitro3: { name: 'Triple nitro', kind: 'instant', count: 3 },
  star: { name: 'Étoile', kind: 'instant' },
  lightning: { name: 'Éclair', kind: 'instant' },
  comet: { name: 'Comète bleue', kind: 'instant' },
};
//            1st 2-3 4-5 6-7 8th
const ITEM_ODDS = {
  banana: [32, 14, 7, 3, 0],
  banana3: [10, 10, 6, 2, 0],
  green: [30, 24, 14, 6, 2],
  green3: [0, 8, 12, 10, 6],
  red: [0, 18, 20, 16, 10],
  bomb: [8, 10, 8, 6, 3],
  nitro: [12, 12, 14, 13, 12],
  nitro3: [0, 2, 10, 16, 20],
  star: [0, 0, 4, 12, 19],
  lightning: [0, 0, 0, 4, 9],
  comet: [0, 2, 4, 7, 8],
};

const ICON_SVG = (() => {
  const S = (body) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  const banana = `<path d="M27 18c-8 30 4 60 40 70 9 2 17 0 19-5-31-3-50-28-49-62z" fill="#ffd84a" stroke="#4a300c" stroke-width="5" stroke-linejoin="round"/>
    <path d="M36 26c0 25 13 44 38 55" fill="none" stroke="#f0a92a" stroke-width="4" stroke-linecap="round"/>
    <path d="M26 20l-3-10 10 3z" fill="#4a300c" stroke="#4a300c" stroke-width="4" stroke-linejoin="round"/>
    <path d="M81 86l4 3" stroke="#4a300c" stroke-width="5" stroke-linecap="round"/>`;
  const disc = (c1, c2, c3) => `<ellipse cx="50" cy="64" rx="40" ry="17" fill="${c3}" stroke="#14321c" stroke-width="5"/>
    <path d="M12 58c0-20 18-32 38-32s38 12 38 32c0 9-17 15-38 15S12 67 12 58z" fill="${c1}" stroke="#14321c" stroke-width="5"/>
    <ellipse cx="50" cy="60" rx="38" ry="12" fill="none" stroke="#fff" stroke-width="5"/>
    <path d="M30 40c6-6 14-8 22-8" stroke="${c2}" stroke-width="6" stroke-linecap="round" fill="none"/>`;
  const missile = `<g transform="rotate(35 50 50)"><path d="M50 8c14 10 18 28 16 52H34c-2-24 2-42 16-52z" fill="#e8392f" stroke="#3a0f0a" stroke-width="5" stroke-linejoin="round"/>
    <path d="M50 8c8 6 12 14 14 22H36c2-8 6-16 14-22z" fill="#fff" stroke="#3a0f0a" stroke-width="5" stroke-linejoin="round"/>
    <path d="M34 50l-14 18 16-2zM66 50l14 18-16-2z" fill="#fff" stroke="#3a0f0a" stroke-width="5" stroke-linejoin="round"/>
    <path d="M38 62h24l-4 10H42z" fill="#555" stroke="#3a0f0a" stroke-width="4"/>
    <path d="M42 74c2 10 6 16 8 20 2-4 6-10 8-20z" fill="#ffb020"/>
    <circle cx="44" cy="40" r="5" fill="#fff"/><circle cx="56" cy="40" r="5" fill="#fff"/><circle cx="45" cy="40" r="2.4" fill="#111"/><circle cx="57" cy="40" r="2.4" fill="#111"/></g>`;
  const bomb = `<circle cx="46" cy="58" r="32" fill="#22222c" stroke="#0a0a10" stroke-width="5"/>
    <rect x="37" y="20" width="18" height="12" rx="3" fill="#8a8f9c" stroke="#0a0a10" stroke-width="4"/>
    <path d="M50 22c4-10 12-12 18-8" fill="none" stroke="#c9a46a" stroke-width="4" stroke-linecap="round"/>
    <circle cx="72" cy="13" r="7" fill="#ffcf3a"/><circle cx="72" cy="13" r="3.5" fill="#fff"/>
    <ellipse cx="34" cy="46" rx="7" ry="5" fill="#fff" opacity="0.35"/>
    <ellipse cx="38" cy="60" rx="4" ry="6.5" fill="#fff"/><ellipse cx="54" cy="60" rx="4" ry="6.5" fill="#fff"/>`;
  const nitro = `<g transform="rotate(-20 50 50)"><rect x="30" y="20" width="40" height="64" rx="14" fill="#2f7bff" stroke="#0b1d4a" stroke-width="5"/>
    <rect x="40" y="10" width="20" height="14" rx="4" fill="#d9e2ec" stroke="#0b1d4a" stroke-width="4"/>
    <path d="M54 32L40 56h10l-4 18 16-26H52z" fill="#ffd02b" stroke="#0b1d4a" stroke-width="3" stroke-linejoin="round"/>
    <rect x="35" y="26" width="7" height="44" rx="3.5" fill="#fff" opacity="0.4"/></g>`;
  const star = `<path d="M50 8l12 26 28 3-21 19 6 28-25-14-25 14 6-28-21-19 28-3z" fill="#ffd02b" stroke="#6a4400" stroke-width="5" stroke-linejoin="round"/>
    <ellipse cx="43" cy="48" rx="3.5" ry="7" fill="#3a2400"/><ellipse cx="57" cy="48" rx="3.5" ry="7" fill="#3a2400"/>
    <path d="M38 24l6 12" stroke="#fff6b0" stroke-width="5" stroke-linecap="round"/>`;
  const bolt = `<path d="M58 6L22 56h22l-8 38 42-56H54z" fill="#ffd02b" stroke="#5a3a00" stroke-width="5" stroke-linejoin="round"/>
    <path d="M52 16L34 46" stroke="#fff6b0" stroke-width="4" stroke-linecap="round"/>`;
  const comet = `<path d="M20 30c10 10 14 16 18 26M14 48c10 4 16 8 22 14" stroke="#7fd0ff" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.8"/>
    <path d="M58 22l6-12 4 14 12-6-4 14 14 2-12 8 10 10-14 0 2 14-12-8-6 12-4-14-12 6 4-14-14-2 12-8-10-10 14 0z" fill="#fff" stroke="#0b1d4a" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="62" cy="50" r="18" fill="#2f6bff" stroke="#0b1d4a" stroke-width="5"/>
    <ellipse cx="56" cy="44" rx="6" ry="4" fill="#fff" opacity="0.5"/>`;
  const triple = (inner) => `<g transform="translate(2 34) scale(0.48)">${inner}</g><g transform="translate(50 34) scale(0.48)">${inner}</g><g transform="translate(26 0) scale(0.48)">${inner}</g>`;
  return {
    banana: S(banana), banana3: S(triple(banana)),
    green: S(disc('#3fe070', '#b8ffcc', '#1d8f3e')), green3: S(triple(disc('#3fe070', '#b8ffcc', '#1d8f3e'))),
    red: S(missile), bomb: S(bomb), nitro: S(nitro), nitro3: S(triple(nitro)),
    star: S(star), lightning: S(bolt), comet: S(comet),
  };
})();

const _iv = new THREE.Vector3(), _iv2 = new THREE.Vector3();

class Items {
  constructor(race) {
    this.race = race; this.track = race.track; this.scene = race.scene;
    this.boxes = []; this.coins = []; this.objects = []; this.hazards = [];
    this.lightningCool = 0; this.cometCool = 0;
    this.noItems = race.mode === 'tt';
    if (!this.noItems) this._buildBoxes();
    this._buildCoins();
    this.models = {};
  }

  /* ---------- item boxes ---------- */
  _buildBoxes() {
    const tr = this.track;
    this.boxMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec3 vN; varying vec3 vV; varying vec2 vUv;
        void main(){ vUv = uv; vec4 wp = modelMatrix*vec4(position,1.0); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix*viewMatrix*wp; }`,
      fragmentShader: `uniform float uTime; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
        vec3 hsv(vec3 c){ vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0/3.0, 1.0/3.0))*6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }
        void main(){
          float h = fract(uTime*0.18 + vUv.x*0.3 + vUv.y*0.3);
          vec3 col = hsv(vec3(h, 0.6, 1.0));
          float fres = pow(1.0 - abs(dot(vN, vV)), 2.0);
          float e = max(smoothstep(0.40, 0.48, abs(vUv.x - 0.5)), smoothstep(0.40, 0.48, abs(vUv.y - 0.5)));
          vec3 c = col * (0.45 + fres) + e * vec3(1.0);
          gl_FragColor = vec4(c, 0.42 + fres * 0.4 + e * 0.5);
        }`,
    });
    const boxGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const qMat = new THREE.SpriteMaterial({ map: Tex.question(), depthWrite: false, transparent: true });
    for (const t of tr.def.itemRows || []) {
      const s = t * tr.L, f = tr.frameAt(s);
      const n = 5, span = f.w / 2 - 2.6;
      for (let i = 0; i < n; i++) {
        const lat = lerp(-span, span, i / (n - 1));
        const g = new THREE.Group();
        const cube = new THREE.Mesh(boxGeo, this.boxMat); cube.renderOrder = 4;
        const qs = new THREE.Sprite(qMat); qs.scale.setScalar(1.1); qs.renderOrder = 3;
        g.add(cube, qs);
        const p = tr.pointAt(s, lat, 1.25);
        g.position.copy(p);
        this.scene.add(g);
        this.boxes.push({ s, lat, pos: p.clone(), alive: true, t: 0, g, cube, phase: Math.random() * TAU, scale: 1 });
      }
    }
  }
  nextBoxRow(s, range) {
    let best = null, bestDs = range;
    for (const b of this.boxes) {
      if (!b.alive) continue;
      const ds = this.track.wrapDS(b.s - s);
      if (ds > 6 && ds < bestDs) { bestDs = ds; best = b; }
    }
    return best;
  }

  /* ---------- coins ---------- */
  _buildCoins() {
    const tr = this.track;
    const list = [];
    for (const [t, lf, n] of tr.def.coins || []) {
      for (let i = 0; i < n; i++) {
        const s = t * tr.L + i * 3.2, f = tr.frameAt(s);
        const lat = lf * (f.w / 2 - 2.5);
        list.push({ s, lat, pos: tr.pointAt(s, lat, 0.9).clone(), alive: true, t: 0 });
      }
    }
    this.coins = list;
    const mat = new THREE.MeshStandardMaterial({ color: 0xffc72a, metalness: 0.85, roughness: 0.25, emissive: 0x6a4200, emissiveIntensity: 0.6 });
    this.coinMesh = new THREE.InstancedMesh(ItemModels.coinGeo(), mat, Math.max(1, list.length));
    this.coinMesh.frustumCulled = false; this.coinMesh.castShadow = true;
    this.scene.add(this.coinMesh);
    this.coinM = new THREE.Matrix4(); this.coinQ = new THREE.Quaternion(); this.coinS = new THREE.Vector3();
  }

  /* ---------- rolling ---------- */
  chooseItem(k) {
    const n = this.race.karts.length;
    const p = k.place;
    let bucket = p === 1 ? 0 : p <= 3 ? 1 : p <= 5 ? 2 : p <= 7 ? 3 : 4;
    if (n < 8) bucket = Math.min(bucket, Math.max(0, Math.round((p - 1) / Math.max(1, n - 1) * 4)));
    // distance to the leader matters more than raw place
    const leader = this.race.ranking[0];
    if (leader && leader !== k) {
      const gap = leader.progress - k.progress;
      if (gap > 220) bucket = Math.max(bucket, 4); else if (gap > 120) bucket = Math.max(bucket, 3);
    }
    let total = 0;
    const entries = [];
    for (const key in ITEM_ODDS) {
      let w = ITEM_ODDS[key][bucket];
      if (key === 'lightning' && this.lightningCool > 0) w = 0;
      if (key === 'comet' && (this.cometCool > 0 || this.objects.some((o) => o.type === 'comet'))) w = 0;
      if (w > 0) { entries.push([key, w]); total += w; }
    }
    let r = Math.random() * total;
    for (const [key, w] of entries) { r -= w; if (r <= 0) return key; }
    return 'banana';
  }
  giveItem(k, type) {
    k.item = type; k.itemCount = ITEMS[type].count || 1; k.roulette = 0; k.rouletteItem = null;
    if (ITEMS[type].kind === 'trail3' || ITEMS[type].kind === 'orbit3') this.spawnHeld(k, type);
    if (k.hud) k.hud.itemGot(type, k.itemCount);
  }

  /* ---------- held items (trailing / orbiting / dragging) ---------- */
  makeModel(type) {
    switch (type) {
      case 'banana': return ItemModels.banana();
      case 'green': return ItemModels.disc();
      case 'red': return ItemModels.missile();
      case 'bomb': return ItemModels.bomb();
      case 'comet': return ItemModels.comet();
    }
    return new THREE.Group();
  }
  spawnHeld(k, type) {
    this.clearHeld(k);
    const base = type === 'banana3' ? 'banana' : 'green';
    for (let i = 0; i < 3; i++) {
      const m = this.makeModel(base);
      this.scene.add(m);
      k.held.push({ type: base, mesh: m, orbit: type === 'green3', i });
    }
  }
  clearHeld(k) {
    for (const h of k.held) this.scene.remove(h.mesh);
    k.held.length = 0;
  }
  updateHeld(k, dt, time) {
    const sh = Math.sin(k.heading), ch = Math.cos(k.heading);
    const sc = k.vis.scale;
    k.held.forEach((h, i) => {
      if (h.orbit) {
        const a = time * 4.2 + (i / Math.max(1, k.held.length)) * TAU;
        h.mesh.position.set(k.pos.x + Math.sin(a) * 2.0 * sc, k.pos.y + 0.1, k.pos.z + Math.cos(a) * 2.0 * sc);
        if (h.mesh.userData.spin) h.mesh.userData.spin.rotation.y += dt * 10;
      } else {
        const d = (1.9 + i * 1.15) * sc;
        h.mesh.position.set(k.pos.x - sh * d, k.pos.y, k.pos.z - ch * d);
        h.mesh.rotation.y = k.heading;
      }
      h.mesh.scale.setScalar(sc);
    });
    if (k.dragging) {
      const d = 1.95 * sc;
      const m = k.dragging.mesh;
      m.position.set(k.pos.x - sh * d, k.pos.y + (k.dragging.type === 'red' ? -0.3 : 0), k.pos.z - ch * d);
      m.rotation.y = k.heading + (k.dragging.type === 'red' ? Math.PI : 0);
      m.scale.setScalar(sc);
      if (m.userData.spin) m.userData.spin.rotation.y += dt * 6;
    }
  }

  /* ---------- using items ---------- */
  handleInput(k) {
    const inp = k.input;
    if (k.finished && !k.isPlayer) return;
    if (inp.itemPressed && k.roulette <= 0 && k.item && k.race.started && k.respawning <= 0) {
      const def = ITEMS[k.item];
      if (def.kind === 'drag' && !k.dragging) {
        const m = this.makeModel(k.item);
        this.scene.add(m);
        k.dragging = { type: k.item, mesh: m };
        k.item = null; k.itemCount = 0;
        if (k.hud) k.hud.itemGot(null, 0);
      } else if (def.kind === 'trail3' || def.kind === 'orbit3') {
        const h = k.held.pop();
        if (h) {
          this.scene.remove(h.mesh);
          const back = def.kind === 'trail3' ? true : (inp.back || inp.brake > 0);
          if (h.type === 'banana') this.dropBanana(k, back ? -1 : 1);
          else this.fireDisc(k, back ? -1 : 1);
        }
        k.itemCount = k.held.length;
        if (k.itemCount <= 0) k.item = null;
        if (k.hud) k.hud.itemGot(k.item, k.itemCount);
      } else if (def.kind === 'instant') {
        this.useInstant(k, k.item);
        k.itemCount--;
        if (k.itemCount <= 0) k.item = null;
        if (k.hud) k.hud.itemGot(k.item, k.itemCount);
      }
    }
    if (k.dragging && (inp.itemReleased || !inp.item)) this.releaseDrag(k, inp.back || inp.brake > 0);
  }
  releaseDrag(k, back) {
    const d = k.dragging; k.dragging = null;
    this.race.stats.items[d.type] = (this.race.stats.items[d.type] || 0) + 1;
    this.scene.remove(d.mesh);
    if (d.type === 'banana') this.dropBanana(k, -1);
    else if (d.type === 'green') this.fireDisc(k, back ? -1 : 1);
    else if (d.type === 'red') this.fireMissile(k, back ? -1 : 1);
    else if (d.type === 'bomb') this.throwBomb(k, back ? -1 : 1);
  }
  useInstant(k, type) {
    const race = this.race;
    race.stats.items[type] = (race.stats.items[type] || 0) + 1;
    if (type === 'nitro' || type === 'nitro3') {
      k.applyBoost(1.5, 'nitro');
      if (k.isPlayer) Sound.sfx('boost', 1.1); else race.sfxAt('boost', k, 0.5);
    } else if (type === 'star') {
      k.star = 7.5;
      if (k.isPlayer) { Sound.sfx('star'); race.onStar(true); }
    } else if (type === 'lightning') {
      this.lightningCool = 20;
      race.onLightning(k);
    } else if (type === 'comet') {
      this.cometCool = 25;
      this.spawnComet(k);
    }
  }

  /* ---------- objects ---------- */
  addObject(o) {
    o.alive = true; o.q = o.q || {}; o.idx = o.idx ?? 0; o.age = 0;
    this.track.queryGlobal(o.pos.x, o.pos.y, o.pos.z, o.q);
    o.idx = o.q.idx; o.s = o.q.s; o.lat = o.q.lateral;
    this.objects.push(o);
    if (o.static) this.hazards.push(o);
    return o;
  }
  dropBanana(k, dir) {
    const sh = Math.sin(k.heading), ch = Math.cos(k.heading);
    const m = ItemModels.banana(); this.scene.add(m);
    const pos = new THREE.Vector3(k.pos.x - sh * 2.4, k.pos.y + 0.6, k.pos.z - ch * 2.4);
    const o = { type: 'banana', pos, mesh: m, owner: k, static: false, flying: true, vel: new THREE.Vector3(), vy: 2 };
    if (dir > 0) { pos.set(k.pos.x + sh * 2.5, k.pos.y + 1, k.pos.z + ch * 2.5); o.vel.set(sh * (k.speed + 14), 0, ch * (k.speed + 14)); o.vy = 9; }
    else o.vel.set(-sh * 2, 0, -ch * 2);
    m.position.copy(pos); m.rotation.y = rand(0, TAU);
    this.addObject(o);
    this.race.sfxAt(dir > 0 ? 'throw' : 'drop', k);
  }
  fireDisc(k, dir) {
    const sh = Math.sin(k.heading), ch = Math.cos(k.heading);
    const m = ItemModels.disc(); this.scene.add(m);
    const sp = Math.max(0, k.speed * dir) + 46;
    const pos = new THREE.Vector3(k.pos.x + sh * 2.6 * dir, k.pos.y + 0.1, k.pos.z + ch * 2.6 * dir);
    this.addObject({ type: 'disc', pos, vel: new THREE.Vector3(sh * sp * dir, 0, ch * sp * dir), mesh: m, owner: k, life: 9, bounces: 0, ownerSafe: 0.6 });
    this.race.sfxAt('throw', k);
  }
  fireMissile(k, dir) {
    const sh = Math.sin(k.heading), ch = Math.cos(k.heading);
    const m = ItemModels.missile(); this.scene.add(m);
    const pos = new THREE.Vector3(k.pos.x + sh * 2.6 * dir, k.pos.y + 0.1, k.pos.z + ch * 2.6 * dir);
    let target = null;
    if (dir > 0) target = this.race.ranking[k.place - 2] || null;
    const sp = Math.max(30, k.speed + 22);
    this.addObject({ type: 'missile', pos, vel: new THREE.Vector3(sh * sp * dir, 0, ch * sp * dir), mesh: m, owner: k, target, life: 14, ownerSafe: 0.8, speed: sp + 14 });
    this.race.sfxAt('launch', k);
  }
  throwBomb(k, dir) {
    const sh = Math.sin(k.heading), ch = Math.cos(k.heading);
    const m = ItemModels.bomb(); this.scene.add(m);
    const pos = new THREE.Vector3(k.pos.x + sh * 2.6 * dir, k.pos.y + 1, k.pos.z + ch * 2.6 * dir);
    const v = dir > 0 ? Math.max(0, k.speed) + 16 : 3;
    this.addObject({ type: 'bomb', pos, vel: new THREE.Vector3(sh * v * dir, 0, ch * v * dir), vy: dir > 0 ? 9 : 2, mesh: m, owner: k, flying: true, fuse: 2.6, ownerSafe: 0.5 });
    this.race.sfxAt('throw', k);
  }
  spawnComet(k) {
    const m = ItemModels.comet(); this.scene.add(m);
    const pos = k.pos.clone(); pos.y += 3;
    this.addObject({ type: 'comet', pos, mesh: m, owner: k, phase: 'travel', s: k.s, life: 30 });
    this.race.sfxAt('launch', k);
  }
  kill(o, poof = true) {
    if (!o.alive) return;
    o.alive = false;
    this.scene.remove(o.mesh);
    const hi = this.hazards.indexOf(o); if (hi >= 0) this.hazards.splice(hi, 1);
    if (poof) {
      const c = o.type === 'banana' ? [1, 0.9, 0.3, 1] : o.type === 'disc' ? [0.3, 1, 0.45, 1] : [1, 0.4, 0.3, 1];
      this.race.fx.burst(o.pos.x, o.pos.y + 0.5, o.pos.z, 14, 6, 0.4, 0.8, c, [1, 1, 1, 0], 6, 2);
    }
  }
  explode(x, y, z, radius, owner) {
    const race = this.race;
    race.fx.explosion(x, y, z, radius / 6);
    race.sfxAt('explosion', { pos: _iv2.set(x, y, z) }, 1.2);
    race.shakeNear(x, y, z, 1.2);
    for (const k of race.karts) {
      if (k.pos.distanceTo(_iv2.set(x, y, z)) < radius) race.hitKart(k, 'tumble', owner);
    }
    for (const o of this.objects) if (o.alive && o.type !== 'comet' && o.pos.distanceTo(_iv2.set(x, y, z)) < radius * 0.8) this.kill(o);
  }

  /* shield: a held/dragged item behind (or orbiting) the kart absorbs a hit */
  shield(k, from) {
    const rel = _iv.subVectors(from, k.pos);
    const behind = rel.x * Math.sin(k.heading) + rel.z * Math.cos(k.heading) < 0;
    if (k.held.length) {
      const h = k.held[0];
      if (h.orbit || behind) {
        k.held.shift(); this.scene.remove(h.mesh);
        k.itemCount = k.held.length; if (!k.itemCount) k.item = null;
        if (k.hud) k.hud.itemGot(k.item, k.itemCount);
        return true;
      }
    }
    if (k.dragging && behind) { this.scene.remove(k.dragging.mesh); k.dragging = null; return true; }
    return false;
  }

  /* ---------- per-frame update ---------- */
  update(dt, time) {
    const race = this.race, tr = this.track;
    this.lightningCool = Math.max(0, this.lightningCool - dt);
    this.cometCool = Math.max(0, this.cometCool - dt);
    // boxes
    if (this.boxMat) this.boxMat.uniforms.uTime.value = time;
    for (const b of this.boxes) {
      if (!b.alive) { b.t -= dt; if (b.t <= 0) { b.alive = true; b.scale = 0.01; } }
      const target = b.alive ? 1 : 0.01;
      b.scale = damp(b.scale, target, b.alive ? 6 : 30, dt);
      b.g.visible = b.scale > 0.03;
      b.g.scale.setScalar(b.scale);
      b.g.position.y = b.pos.y + Math.sin(time * 2.2 + b.phase) * 0.18;
      b.cube.rotation.set(time * 0.7 + b.phase, time * 1.1, 0);
    }
    // coins
    let ci = 0;
    for (const c of this.coins) {
      if (!c.alive) { c.t -= dt; if (c.t <= 0) c.alive = true; }
      this.coinQ.setFromAxisAngle(_up, time * 3 + c.s * 0.2);
      this.coinS.setScalar(c.alive ? 1 : 0.0001);
      this.coinM.compose(_iv.copy(c.pos).setY(c.pos.y + Math.sin(time * 3 + c.s) * 0.12), this.coinQ, this.coinS);
      this.coinMesh.setMatrixAt(ci++, this.coinM);
    }
    if (this.coins.length) this.coinMesh.instanceMatrix.needsUpdate = true;
    // pickups
    for (const k of race.karts) {
      if (k.respawning > 0) continue;
      for (const b of this.boxes) {
        if (!b.alive) continue;
        if (Math.abs(k.pos.x - b.pos.x) < 2.1 && Math.abs(k.pos.z - b.pos.z) < 2.1 && Math.abs(k.pos.y + 0.8 - b.pos.y) < 2.4) {
          b.alive = false; b.t = 2.6;
          race.fx.burst(b.pos.x, b.pos.y, b.pos.z, 22, 9, 0.6, 0.9, [1, 0.6, 1, 1], [0.4, 0.8, 1, 0], 8, 2);
          race.sfxAt('itemBox', k, 0.8);
          if (!k.item && k.roulette <= 0 && !k.held.length) {
            k.rouletteItem = this.chooseItem(k);
            k.roulette = k.isPlayer ? 1.35 : rand(0.6, 1.0);
            if (k.hud) k.hud.rouletteStart();
          }
        }
      }
      for (const c of this.coins) {
        if (!c.alive) continue;
        if (Math.abs(k.pos.x - c.pos.x) < 1.7 && Math.abs(k.pos.z - c.pos.z) < 1.7 && Math.abs(k.pos.y + 0.8 - c.pos.y) < 2) {
          c.alive = false; c.t = 9;
          if (k.coins < 10) k.coins++;
          if (k.boost < 0.2) k.applyBoost(0.22, 'coin');
          race.fx.burst(c.pos.x, c.pos.y, c.pos.z, 8, 4, 0.35, 0.6, [1, 0.85, 0.2, 1], [1, 1, 0.6, 0], 4, 2);
          if (k.isPlayer) Sound.sfx('coin');
        }
      }
      // roulette
      if (k.roulette > 0) {
        k.roulette -= dt;
        if (k.roulette <= 0) this.giveItem(k, k.rouletteItem);
      }
      this.handleInput(k);
      this.updateHeld(k, dt, time);
    }
    // orbiting discs hit nearby karts
    for (const k of race.karts) {
      for (let i = k.held.length - 1; i >= 0; i--) {
        const h = k.held[i];
        if (!h.orbit) continue;
        for (const o of race.karts) {
          if (o === k || o.respawning > 0) continue;
          if (o.pos.distanceToSquared(h.mesh.position) < 1.8) {
            if (race.hitKart(o, 'tumble', k)) {
              k.held.splice(i, 1); this.scene.remove(h.mesh);
              k.itemCount = k.held.length; if (!k.itemCount) k.item = null;
              if (k.hud) k.hud.itemGot(k.item, k.itemCount);
              break;
            }
          }
        }
      }
    }
    // objects
    for (const o of this.objects) if (o.alive) this.updateObject(o, dt, time);
    // object vs object
    const objs = this.objects;
    for (let i = 0; i < objs.length; i++) {
      const a = objs[i]; if (!a.alive || a.type === 'comet') continue;
      for (let j = i + 1; j < objs.length; j++) {
        const b = objs[j]; if (!b.alive || b.type === 'comet') continue;
        if (a.type === 'banana' && b.type === 'banana') continue;
        if (a.pos.distanceToSquared(b.pos) < 1.6) {
          if (a.type === 'bomb') this.explode(a.pos.x, a.pos.y, a.pos.z, 7, a.owner);
          else if (b.type === 'bomb') this.explode(b.pos.x, b.pos.y, b.pos.z, 7, b.owner);
          else { this.kill(a); this.kill(b); race.sfxAt('ricochet', { pos: a.pos }); }
        }
      }
    }
    if (this.objects.length > 60) {
      const firstBanana = this.objects.find((o) => o.alive && o.type === 'banana');
      if (firstBanana) this.kill(firstBanana, false);
    }
    this.objects = this.objects.filter((o) => o.alive);
  }

  updateObject(o, dt, time) {
    const tr = this.track, race = this.race;
    o.age += dt;
    if (o.ownerSafe) o.ownerSafe = Math.max(0, o.ownerSafe - dt);
    if (o.life != null) { o.life -= dt; if (o.life <= 0) { this.kill(o); return; } }
    if (o.type === 'comet') { this.updateComet(o, dt, time); return; }
    // flying (bananas tossed, bombs thrown)
    if (o.flying) {
      o.vy -= GRAVITY * dt;
      o.pos.addScaledVector(o.vel, dt); o.pos.y += o.vy * dt;
      tr.query(o.pos.x, o.pos.y, o.pos.z, o.idx, o.q); o.idx = o.q.idx;
      this.clampToWalls(o, false);
      if (o.q.void && o.pos.y < o.q.cy - 10) { this.kill(o, false); return; }
      if (!o.q.void && o.pos.y <= o.q.groundY) {
        o.pos.y = o.q.groundY; o.flying = false; o.vel.set(0, 0, 0); o.static = true;
        if (!this.hazards.includes(o)) this.hazards.push(o);
        o.s = o.q.s; o.lat = o.q.lateral;
        if (o.type === 'bomb') race.sfxAt('drop', { pos: o.pos }, 0.6);
      }
    }
    if (o.type === 'disc' || o.type === 'missile') {
      if (o.type === 'missile') this.steerMissile(o, dt);
      o.pos.addScaledVector(o.vel, dt);
      tr.query(o.pos.x, o.pos.y, o.pos.z, o.idx, o.q); o.idx = o.q.idx;
      if (o.q.void) { o.pos.y -= 12 * dt; if (o.pos.y < o.q.cy - 10) { this.kill(o, false); return; } }
      else o.pos.y = damp(o.pos.y, o.q.groundY + (o.type === 'missile' ? 0.25 : 0.05), 18, dt);
      if (this.clampToWalls(o, true)) {
        o.bounces = (o.bounces || 0) + 1;
        race.sfxAt('ricochet', { pos: o.pos }, 0.6);
        if (o.type === 'disc' && o.bounces > 6) { this.kill(o); return; }
      }
      o.s = o.q.s; o.lat = o.q.lateral;
      if (o.mesh.userData.spin) o.mesh.userData.spin.rotation.y += dt * 14;
      o.mesh.rotation.y = Math.atan2(o.vel.x, o.vel.z);
      if (o.type === 'missile') {
        race.fx.add.emit(o.pos.x - o.vel.x * 0.025, o.pos.y + 0.55, o.pos.z - o.vel.z * 0.025, rand(-1, 1), rand(0, 1), rand(-1, 1), 0.3, 0.8, 0.2, [1, 0.6, 0.15, 1], [1, 0.2, 0.05, 0]);
      }
    }
    if (o.type === 'bomb' && !o.flying) {
      o.fuse -= dt;
      if (o.mesh.userData.spark) o.mesh.userData.spark.scale.setScalar(0.4 + Math.random() * 0.4);
      if (Math.random() < dt * 8) race.fx.add.emit(o.pos.x + 0.1, o.pos.y + 1.4, o.pos.z, rand(-1, 1), rand(1, 3), rand(-1, 1), 0.3, 0.3, 0.05, [1, 0.8, 0.3, 1], [1, 0.3, 0, 0], 4);
      o.mesh.scale.setScalar(1 + Math.max(0, 0.6 - o.fuse) * 0.6 * (Math.sin(time * 40) * 0.5 + 0.5));
      if (o.fuse <= 0) { this.kill(o, false); this.explode(o.pos.x, o.pos.y, o.pos.z, 7, o.owner); return; }
    }
    if (o.type === 'banana' && !o.flying) o.mesh.rotation.y += dt * 0.5;
    o.mesh.position.copy(o.pos);
    // kart collisions
    const rad = o.type === 'banana' ? 1.45 : o.type === 'bomb' ? 1.7 : 1.55;
    for (const k of race.karts) {
      if (k.respawning > 0) continue;
      if (k === o.owner && o.ownerSafe > 0) continue;
      const dx = k.pos.x - o.pos.x, dz = k.pos.z - o.pos.z, dy = k.pos.y - o.pos.y;
      if (dx * dx + dz * dz > rad * rad * k.vis.scale * 1.2 || Math.abs(dy) > 2.2) continue;
      if (o.type === 'bomb') { this.kill(o, false); this.explode(o.pos.x, o.pos.y, o.pos.z, 7, o.owner); return; }
      if (k.star > 0) { this.kill(o); race.sfxAt('ricochet', k); continue; }
      if (o.type !== 'banana' && this.shield(k, o.pos)) { this.kill(o); race.sfxAt('ricochet', k); return; }
      if (race.hitKart(k, o.type === 'banana' ? 'spin' : 'tumble', o.owner)) { this.kill(o); return; }
    }
  }
  clampToWalls(o, bounce) {
    const q = o.q;
    const lim = (q.wall === Infinity ? 1e9 : q.wall) - 0.6;
    if (Math.abs(q.lateral) <= lim) return false;
    const sg = Math.sign(q.lateral), pen = Math.abs(q.lateral) - lim;
    o.pos.x -= q.nx * sg * pen; o.pos.z -= q.nz * sg * pen;
    const nx = -sg * q.nx, nz = -sg * q.nz;
    const vn = o.vel.x * nx + o.vel.z * nz;
    if (vn < 0) {
      if (bounce) { o.vel.x -= 2 * vn * nx; o.vel.z -= 2 * vn * nz; }
      else { o.vel.x -= vn * nx; o.vel.z -= vn * nz; }
    }
    return true;
  }
  steerMissile(o, dt) {
    const t = o.target;
    const sp = o.speed;
    let dx, dz;
    if (t && !t.finished && t.respawning <= 0 && o.age > 0.15) {
      const dist = Math.hypot(t.pos.x - o.pos.x, t.pos.z - o.pos.z);
      if (dist < 24) { dx = t.pos.x - o.pos.x; dz = t.pos.z - o.pos.z; }
      else {
        const f = this.track.frameAt(o.q.s + 12, o._f || (o._f = {}));
        const lat = clamp(lerp(o.q.lateral, t.q.lateral, 0.35), -f.w / 2 + 1.5, f.w / 2 - 1.5);
        dx = f.px + f.lx * lat - o.pos.x; dz = f.pz + f.lz * lat - o.pos.z;
      }
      if (t.hud) t.hud.danger(dist < 70 ? 'red' : null, dist);
    } else {
      dx = o.vel.x; dz = o.vel.z;
      if (o.q.s != null && o.age > 0.3 && !(o.vel.x * o.q.tx + o.vel.z * o.q.tz < 0)) {
        const f = this.track.frameAt(o.q.s + 10, o._f || (o._f = {}));
        dx = f.px + f.lx * o.q.lateral - o.pos.x; dz = f.pz + f.lz * o.q.lateral - o.pos.z;
      }
    }
    const want = Math.atan2(dx, dz), cur = Math.atan2(o.vel.x, o.vel.z);
    const nh = cur + clamp(wrapAngle(want - cur), -5 * dt, 5 * dt);
    o.vel.set(Math.sin(nh) * sp, 0, Math.cos(nh) * sp);
  }
  updateComet(o, dt, time) {
    const race = this.race, tr = this.track;
    let target = race.ranking[0];
    if (target === o.owner) target = race.ranking[1] || null;
    if (!target || target.finished) { this.kill(o); return; }
    o.target = target;
    if (target.hud) target.hud.danger('blue', 0);
    if (o.phase === 'travel') {
      const gap = tr.wrapDS(target.s - o.s);
      o.s += (gap > 0 ? 78 : 40) * dt;
      const f = tr.frameAt(o.s, o._f || (o._f = {}));
      o.pos.set(f.px, f.py + 8 + Math.sin(time * 4) * 0.5, f.pz);
      if (Math.abs(tr.wrapDS(target.s - o.s)) < 14) { o.phase = 'dive'; o.diveT = 0; }
    } else {
      o.diveT += dt;
      _iv.set(target.pos.x, target.pos.y + 0.5, target.pos.z);
      o.pos.lerp(_iv, 1 - Math.exp(-6 * dt));
      if (o.pos.distanceTo(_iv) < 1.5 || o.diveT > 1.0) { this.kill(o, false); this.explode(target.pos.x, target.pos.y, target.pos.z, 6, o.owner); return; }
    }
    o.mesh.position.copy(o.pos);
    o.mesh.rotation.y += dt * 6;
    if (race.isNear(o)) race.fx.add.emit(o.pos.x, o.pos.y, o.pos.z, rand(-2, 2), rand(-1, 1), rand(-2, 2), 0.6, 1.4, 0.2, [0.4, 0.75, 1, 1], [0.2, 0.3, 1, 0]);
  }

  dropAll(k) {
    if (k.dragging) { this.scene.remove(k.dragging.mesh); k.dragging = null; }
  }
  dispose() {
    for (const b of this.boxes) this.scene.remove(b.g);
    for (const o of this.objects) this.scene.remove(o.mesh);
    this.scene.remove(this.coinMesh);
    for (const k of this.race.karts) { this.clearHeld(k); this.dropAll(k); }
  }
}
