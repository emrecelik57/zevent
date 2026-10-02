/* ============================================================
   Menus — screens, keyboard/gamepad/mouse navigation, options
   ============================================================ */
class Menu {
  constructor(game) {
    this.game = game;
    this.screens = {};
    $$('.screen').forEach((s) => { this.screens[s.id.replace('scr-', '')] = s; });
    this.current = 'loading';
    this.focusEl = null;
    this.sel = { mode: 'race', cc: 150, char: Store.get('lastChar', 0), track: 0, players: 1, chars: [0, 1], step: 0 };
    this.optionsFrom = 'main';
    this.resetArm = false;
    this._buildCC(); this._buildChars(); this._buildTracks(); this._buildCup(); this._buildOptions();
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act], .char-card, .track-card, .opt');
      if (!el || !this.screens[this.current] || !this.screens[this.current].contains(el)) return;
      Sound.init();
      this.setFocus(el, true);
      this.activate(el, e);
    });
    document.addEventListener('mousemove', (e) => {
      const el = e.target.closest('.btn, .char-card, .track-card, .opt');
      if (el && el !== this.focusEl && this.screens[this.current] && this.screens[this.current].contains(el)) this.setFocus(el, true);
    });
    $('#scr-title').addEventListener('pointerdown', () => this.titleGo());
  }

  /* ---------- builders ---------- */
  _buildCC() {
    $('#ccGrid').innerHTML = [50, 100, 150, 200].map((cc) => `<button class="btn" data-act="cc-${cc}"><span>${CC[cc].label}<small>${CC[cc].desc}</small></span></button>`).join('');
  }
  _buildChars() {
    $('#charGrid').innerHTML = CHARACTERS.map((c, i) => `<button class="char-card" data-char="${i}" style="--card-c:#${c.kart.toString(16).padStart(6, '0')}"><img alt="${c.name}" data-portrait="${c.id}"><span>${c.name}</span></button>`).join('');
  }
  setPortraits(p) {
    $$('img[data-portrait]').forEach((img) => { img.src = p[img.dataset.portrait] || ''; });
  }
  _buildTracks() {
    const grid = $('#trackGrid');
    grid.innerHTML = '';
    TRACKS.forEach((t, i) => {
      const b = document.createElement('button');
      b.className = 'track-card'; b.dataset.track = i;
      const cv = makeCanvas(320, 240);
      drawTrackPreview(cv, t);
      b.appendChild(cv);
      const body = document.createElement('div');
      body.className = 'tc-body';
      body.innerHTML = `<b>${t.name}</b><small>${t.desc}</small><small class="best" data-best="${t.id}"></small>`;
      b.appendChild(body);
      grid.appendChild(b);
    });
  }
  refreshBest() {
    $$('[data-best]').forEach((el) => {
      const g = Store.get('ghost.' + el.dataset.best, null);
      el.textContent = g ? 'Record : ' + fmtTime(g.time) : '';
    });
  }
  _buildCup() {
    $('#cupList').innerHTML = TRACKS.map((t, i) => `<div class="cup-row"><span class="n">${i + 1}</span><span><span class="nm">${t.name}</span><br><span class="th">${t.desc}</span></span><span></span></div>`).join('');
  }
  _buildOptions() {
    const rows = [
      ['music', 'Musique'], ['sfx', 'Effets sonores'], ['quality', 'Qualité graphique'], ['autoAccel', 'Accélération automatique'],
      ['camera', 'Caméra'], ['speedFx', 'Lignes de vitesse'], ['showFps', 'Afficher les images/s'], ['reset', 'Effacer les records'],
    ];
    $('#optPanel').innerHTML = rows.map(([k, l]) => `<div class="opt" data-opt="${k}"><span>${l}</span><span class="ov" data-ov="${k}"></span></div>`).join('');
    this.refreshOptions();
  }
  refreshOptions() {
    const fmt = {
      music: () => `<span class="meter"><i style="width:${Settings.music * 100}%"></i></span>`,
      sfx: () => `<span class="meter"><i style="width:${Settings.sfx * 100}%"></i></span>`,
      quality: () => ['Basse', 'Moyenne', 'Haute'][Settings.quality],
      autoAccel: () => (Settings.autoAccel ? 'Oui' : 'Non'),
      camera: () => ['Proche', 'Normale', 'Éloignée'][Settings.camera],
      speedFx: () => (Settings.speedFx ? 'Oui' : 'Non'),
      showFps: () => (Settings.showFps ? 'Oui' : 'Non'),
      reset: () => (this.resetArm ? 'Confirmer ?' : 'Effacer'),
    };
    $$('[data-ov]').forEach((el) => { el.innerHTML = fmt[el.dataset.ov](); });
  }
  changeOption(key, dir) {
    const S = Settings;
    if (key === 'music' || key === 'sfx') S[key] = clamp(Math.round((S[key] + dir * 0.1) * 10) / 10, 0, 1);
    else if (key === 'quality') { S.quality = (S.quality + dir + 3) % 3; this.game.applyQuality(); }
    else if (key === 'camera') S.camera = (S.camera + dir + 3) % 3;
    else if (key === 'reset') {
      if (this.resetArm) { TRACKS.forEach((t) => Store.set('ghost.' + t.id, null)); this.resetArm = false; this.refreshBest(); }
      else this.resetArm = true;
    } else S[key] = !S[key];
    saveSettings();
    Sound.applyVolumes();
    this.refreshOptions();
    Sound.sfx('menuMove');
  }

  /* ---------- screens ---------- */
  show(name) {
    for (const k in this.screens) this.screens[k].hidden = k !== name;
    if (this.current && this.focusEl) { this.lastFocus = this.lastFocus || {}; this.lastFocus[this.current] = this.focusEl; }
    this.current = name;
    if (this.focusEl) this.focusEl.classList.remove('focus');
    this.focusEl = null;
    const scr = this.screens[name];
    if (name === 'char') {
      const cards = $$('.char-card', scr);
      const duo = this.sel.players > 1, step = this.sel.step;
      $('#charEyebrow').textContent = duo ? `Joueur ${step + 1} · choisis ton pilote` : 'Choisis ton pilote';
      $('#charTitle').textContent = duo ? `Pilote J${step + 1}` : 'Pilotes';
      cards.forEach((c, i) => c.classList.toggle('taken', duo && step === 1 && i === this.sel.chars[0]));
      let want = duo ? this.sel.chars[step] : this.sel.char;
      if (duo && step === 1 && want === this.sel.chars[0]) want = (want + 1) % cards.length;
      this.setFocus(cards[want] || cards[0]);
      this.game.showroom.setMode('char', want);
    } else if (name === 'track') {
      this.refreshBest();
      $('#trackEyebrow').textContent = this.sel.mode === 'tt' ? 'Contre-la-montre · choisis ton circuit' : `Course libre${this.sel.players > 1 ? ' à 2' : ''} · ${CC[this.sel.cc].label}`;
      const cards = $$('.track-card', scr);
      this.setFocus(cards[this.sel.track] || cards[0]);
      this.game.showroom.setMode('menu');
    } else {
      const items = this.focusables();
      const remembered = this.lastFocus && this.lastFocus[name];
      const f = remembered && items.includes(remembered) ? remembered : items[0];
      if (f) this.setFocus(f);
      if (name === 'title') this.game.showroom.setMode('title');
      else if (['main', 'cc', 'cup', 'options', 'controls', 'duo'].includes(name) && !this.game.race) this.game.showroom.setMode('menu');
    }
    if (name === 'controls') { $('#kUp').textContent = KeyLabels.up; $('#kLeft').textContent = KeyLabels.left; }
    if (name === 'duo') { $('#kUp2').textContent = KeyLabels.up; $('#kLeft2').textContent = KeyLabels.left; }
  }
  hideAll() {
    for (const k in this.screens) this.screens[k].hidden = true;
    this.current = null;
    if (this.focusEl) this.focusEl.classList.remove('focus');
    this.focusEl = null;
  }
  focusables() {
    const scr = this.screens[this.current];
    if (!scr) return [];
    return $$('.btn, .char-card, .track-card, .opt', scr).filter((el) => el.offsetParent !== null);
  }
  setFocus(el, silent) {
    if (!el) return;
    if (this.focusEl) this.focusEl.classList.remove('focus');
    this.focusEl = el;
    el.classList.add('focus');
    if (!silent) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (el.classList.contains('char-card')) this.showChar(+el.dataset.char);
  }
  showChar(i) {
    const c = CHARACTERS[i];
    const st = c.stats;
    const bar = (v) => `<span class="pips">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= v ? 'on' : ''}"></i>`).join('')}</span>`;
    $('#charInfo').innerHTML = `<h3>${c.name}</h3><div class="species">${c.species} · kart n°${i + 1}</div>
      <div class="stat"><span>Vitesse</span>${bar(st.speed)}</div>
      <div class="stat"><span>Accélération</span>${bar(st.accel)}</div>
      <div class="stat"><span>Maniabilité</span>${bar(st.handling)}</div>
      <div class="stat"><span>Poids</span>${bar(st.weight)}</div>
      <div class="blurb">${c.blurb}</div>`;
    if (this.current === 'char') this.game.showroom.setMode('char', i);
  }
  move(dir) {
    const items = this.focusables();
    if (!items.length) return;
    if (!this.focusEl || !items.includes(this.focusEl)) { this.setFocus(items[0]); return; }
    const r0 = this.focusEl.getBoundingClientRect();
    const cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
    let best = null, bestScore = Infinity;
    for (const el of items) {
      if (el === this.focusEl) continue;
      const r = el.getBoundingClientRect();
      const dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
      let p, s;
      if (dir === 'up') { if (dy > -4) continue; p = -dy; s = Math.abs(dx); }
      else if (dir === 'down') { if (dy < 4) continue; p = dy; s = Math.abs(dx); }
      else if (dir === 'mleft') { if (dx > -4) continue; p = -dx; s = Math.abs(dy); }
      else { if (dx < 4) continue; p = dx; s = Math.abs(dy); }
      const score = p + s * 2.2;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (!best && (dir === 'up' || dir === 'down')) best = dir === 'down' ? items[0] : items[items.length - 1];
    if (best && best !== this.focusEl) { this.setFocus(best); Sound.sfx('menuMove'); }
  }

  update() {
    if (!this.current || this.current === 'loading') return;
    if (this.current === 'title') {
      if (Input.menuPressed('ok') || Input.wasPressed('accel') || Input.wasPressed('item')) this.titleGo();
      return;
    }
    const opt = this.current === 'options' && this.focusEl && this.focusEl.classList.contains('opt');
    for (const d of ['up', 'down', 'mleft', 'mright']) {
      if (Input.menuPressed(d)) {
        if (opt && (d === 'mleft' || d === 'mright') && this.focusEl.dataset.opt !== 'reset') this.changeOption(this.focusEl.dataset.opt, d === 'mleft' ? -1 : 1);
        else this.move(d);
      }
    }
    if (Input.menuPressed('ok') && this.focusEl) this.activate(this.focusEl);
    else if (Input.menuPressed('back')) this.back();
  }
  titleGo() {
    if (this.current !== 'title') return;
    Sound.init();
    Sound.resumePending();
    Sound.music('menu');
    Sound.sfx('menuSelect');
    this.show('main');
  }
  back() {
    const m = this.current;
    const map = { main: 'title', cc: this.sel.players > 1 ? 'duo' : 'main', char: this.sel.mode === 'tt' ? 'main' : 'cc', track: 'char', cup: 'char', controls: 'main', duo: 'main' };
    if (m === 'options') { this.show(this.optionsFrom); Sound.sfx('menuBack'); return; }
    if (m === 'char' && this.sel.players > 1 && this.sel.step === 1) { this.sel.step = 0; this.show('char'); Sound.sfx('menuBack'); return; }
    if ((m === 'track' || m === 'cup') && this.sel.players > 1) this.sel.step = 1;
    if (m === 'pause') { this.game.resume(); return; }
    if (map[m]) { this.show(map[m]); Sound.sfx('menuBack'); }
  }
  activate(el) {
    const act = el.dataset.act;
    if (el.classList.contains('opt')) { this.changeOption(el.dataset.opt, 1); return; }
    Sound.sfx('menuSelect');
    if (el.classList.contains('char-card')) {
      const ci = +el.dataset.char;
      if (this.sel.players > 1) {
        if (this.sel.step === 1 && ci === this.sel.chars[0]) { el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); return; }
        this.sel.chars[this.sel.step] = ci;
        this.game.showroom.cheer(ci);
        if (this.sel.step === 0) { this.sel.step = 1; this.show('char'); return; }
      } else {
        this.sel.char = ci;
        Store.set('lastChar', ci);
        this.game.showroom.cheer(ci);
      }
      this.show(this.sel.mode === 'gp' ? 'cup' : 'track');
      return;
    }
    if (el.classList.contains('track-card')) {
      this.sel.track = +el.dataset.track;
      const pc = this.sel.players > 1 ? { playerChars: this.sel.chars.slice() } : { playerChar: this.sel.char };
      this.game.startRace(Object.assign({ mode: this.sel.mode, cc: this.sel.mode === 'tt' ? 150 : this.sel.cc, trackIndex: this.sel.track }, pc));
      return;
    }
    if (!act) return;
    if (act.startsWith('cc-')) { this.sel.cc = +act.slice(3); this.sel.step = 0; this.show('char'); return; }
    switch (act) {
      case 'mode-gp': this.sel.mode = 'gp'; this.sel.players = 1; this.show('cc'); break;
      case 'mode-race': this.sel.mode = 'race'; this.sel.players = 1; this.show('cc'); break;
      case 'mode-tt': this.sel.mode = 'tt'; this.sel.players = 1; this.sel.step = 0; this.show('char'); break;
      case 'mode-2p': this.show('duo'); break;
      case 'duo-race': this.sel.mode = 'race'; this.sel.players = 2; this.show('cc'); break;
      case 'duo-gp': this.sel.mode = 'gp'; this.sel.players = 2; this.show('cc'); break;
      case 'options': this.optionsFrom = 'main'; this.resetArm = false; this.refreshOptions(); this.show('options'); break;
      case 'controls': this.show('controls'); break;
      case 'back': this.back(); break;
      case 'cup-go': this.game.startGP(this.sel.players > 1 ? { cc: this.sel.cc, playerChars: this.sel.chars.slice() } : { cc: this.sel.cc, playerChar: this.sel.char }); break;
      case 'resume': this.game.resume(); break;
      case 'restart': this.game.restartRace(); break;
      case 'pause-options': this.optionsFrom = 'pause'; this.refreshOptions(); this.show('options'); break;
      case 'quit': this.game.quitToMenu(); break;
      case 'res-next': this.game.nextGPRace(); break;
      case 'res-podium': this.game.showPodium(); break;
      case 'res-retry': this.game.restartRace(); break;
      case 'res-tracks': this.game.quitToMenu('track'); break;
      case 'to-menu': case 'res-menu': this.game.quitToMenu(); break;
    }
  }
}

/* small top-down preview of a track layout */
function drawTrackPreview(cv, def) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  const th = THEMES[def.theme];
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, th.sky[0]); gr.addColorStop(1, th.terrain ? th.terrain[1] : th.sky[1]);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const S = def.scale || 1;
  const curve = new THREE.CatmullRomCurve3(def.pts.map((p) => new THREE.Vector3(p[0] * S, 0, p[1] * S)), true, 'centripetal');
  const pts = curve.getSpacedPoints(160);
  let mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9;
  for (const p of pts) { mnx = Math.min(mnx, p.x); mxx = Math.max(mxx, p.x); mnz = Math.min(mnz, p.z); mxz = Math.max(mxz, p.z); }
  const sc = Math.min((W - 50) / (mxx - mnx), (H - 50) / (mxz - mnz));
  const ox = (W - (mxx - mnx) * sc) / 2 - mnx * sc, oz = (H - (mxz - mnz) * sc) / 2 - mnz * sc;
  g.lineJoin = 'round'; g.lineCap = 'round';
  const path = () => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x * sc + ox, p.z * sc + oz) : g.moveTo(p.x * sc + ox, p.z * sc + oz))); g.closePath(); };
  path(); g.strokeStyle = 'rgba(20,22,50,0.85)'; g.lineWidth = 16; g.stroke();
  path(); g.strokeStyle = def.theme === 'space' ? '#e2d4ff' : def.theme === 'city' ? '#ff6fe0' : '#fff7e6'; g.lineWidth = 8; g.stroke();
  const p0 = pts[0];
  g.fillStyle = '#ffd02b'; g.beginPath(); g.arc(p0.x * sc + ox, p0.z * sc + oz, 7, 0, TAU); g.fill();
  g.strokeStyle = '#141632'; g.lineWidth = 3; g.stroke();
}
