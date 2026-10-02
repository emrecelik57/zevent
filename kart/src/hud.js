/* ============================================================
   HUD — one instance per human player, DOM overlay updated every
   frame (only when values change)
   ============================================================ */
class HUD {
  constructor(root, index = 0) {
    this.root = root; this.index = index;
    const q = (n) => root.querySelector(`[data-h="${n}"]`);
    this.e = {};
    for (const n of ['itemSlot', 'itemIcon', 'itemCount', 'coins', 'lapNum', 'lapTot', 'time', 'lapTimes', 'ranks', 'posBox', 'posNum', 'posSuf',
      'speed', 'center', 'sub', 'warn', 'danger', 'banner', 'skip', 'fps', 'ghost', 'touch', 'tag']) this.e[n] = q(n);
    this.mm = q('minimap'); this.mg = this.mm.getContext('2d');
    this.portraits = {};
    this.cache = {};
    this.msgT = 0; this.subT = 0; this.dangerT = 0; this.beepT = 0;
    this.roulT = 0; this.roulIdx = 0;
    this.touchBuilt = false;
    this.rowH = 38;
  }
  show(on) { this.root.hidden = !on; }
  setLayout(mode) {
    this.root.classList.toggle('half', mode !== 'full');
    this.root.classList.toggle('top', mode === 'top');
    this.root.classList.toggle('bottom', mode === 'bottom');
  }
  set(key, el, val, prop = 'textContent') {
    if (this.cache[key] === val) return;
    this.cache[key] = val; el[prop] = val;
  }

  setupRace(race, kart) {
    this.race = race; this.kart = kart;
    this.cache = {};
    const tr = race.track;
    // minimap transform
    const pad = 34, S = this.mm.width;
    const b = tr.bounds;
    const span = Math.max(b.mxx - b.mnx, b.mxz - b.mnz);
    this.mmScale = (S - pad * 2) / span;
    this.mmOx = pad + ((S - pad * 2) - (b.mxx - b.mnx) * this.mmScale) / 2 - b.mnx * this.mmScale;
    this.mmOz = pad + ((S - pad * 2) - (b.mxz - b.mnz) * this.mmScale) / 2 - b.mnz * this.mmScale;
    const c = makeCanvas(S, S), g = c.getContext('2d');
    g.lineJoin = 'round'; g.lineCap = 'round';
    const path = () => { g.beginPath(); for (let i = 0; i <= tr.N; i++) { const j = i % tr.N; const [x, y] = this.mmXY(tr.P[j * 3], tr.P[j * 3 + 2]); i ? g.lineTo(x, y) : g.moveTo(x, y); } };
    path(); g.strokeStyle = 'rgba(20,22,50,0.9)'; g.lineWidth = 26; g.stroke();
    path(); g.strokeStyle = race.def.theme === 'space' ? '#d9c6ff' : '#f4f1e8'; g.lineWidth = 15; g.stroke();
    const f0 = tr.frameAt(0);
    const [sx, sy] = this.mmXY(f0.px, f0.pz);
    g.save(); g.translate(sx, sy); g.rotate(-Math.atan2(f0.tz, f0.tx) + Math.PI / 2);
    for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#141632' : '#fff'; g.fillRect(-11 + i * 5.5, -3, 5.5, 3); g.fillStyle = i % 2 ? '#fff' : '#141632'; g.fillRect(-11 + i * 5.5, 0, 5.5, 3); }
    g.restore();
    this.mmStatic = c;
    // laps / list
    this.e.lapTot.textContent = '/' + race.laps;
    this.e.lapTimes.innerHTML = '';
    this.e.ranks.innerHTML = '';
    this.rankEls = new Map();
    const n = race.karts.length;
    this.rowH = innerHeight <= 680 ? 28 : 38;
    this.e.ranks.style.height = n * this.rowH + 'px';
    this.e.ranks.hidden = race.mode === 'tt' || race.split;
    this.e.posBox.hidden = race.mode === 'tt';
    for (const k of race.karts) {
      const li = document.createElement('li');
      li.innerHTML = `<b></b><img alt="" src="${this.portraits[k.def.id] || ''}">`;
      if (k === kart) li.className = 'me';
      this.e.ranks.appendChild(li);
      this.rankEls.set(k, li);
    }
    this.e.tag.textContent = race.split ? 'J' + (this.index + 1) : '';
    this.itemGot(null, 0, true);
    this.e.coins.textContent = '0';
    this.e.center.className = 'center-msg outline'; this.e.sub.className = 'sub-msg outline';
    this.e.warn.classList.remove('show'); this.e.danger.className = 'danger';
    this.e.ghost.textContent = '';
    const nT = TRACKS.length;
    const modeTxt = race.mode === 'gp' ? `Grand Prix · Course ${race.opts.round + 1}/${nT} · ${CC[race.cc].label}` : race.mode === 'tt' ? 'Contre-la-montre' : `Course libre · ${CC[race.cc].label}`;
    this.e.banner.innerHTML = this.index === 0 ? `${race.def.name}<small>${race.split ? '2 joueurs · ' : ''}${modeTxt}</small>` : '';
    this.e.banner.classList.remove('show');
    if (this.index === 0) requestAnimationFrame(() => this.e.banner.classList.add('show'));
    this.e.skip.textContent = this.index === 0 ? 'Entrée : passer l’intro' : '';
    this.e.skip.hidden = this.index !== 0;
    this.e.fps.hidden = !Settings.showFps || this.index !== 0;
    this.setupTouch(race.split);
    this.show(true);
  }
  mmXY(x, z) { return [x * this.mmScale + this.mmOx, z * this.mmScale + this.mmOz]; }

  countdownStart() { this.e.banner.classList.remove('show'); this.e.skip.hidden = true; }
  count(n) {
    const c = this.e.center;
    c.textContent = n > 0 ? String(n) : 'PARTEZ !';
    c.style.color = n > 0 ? 'var(--paper)' : 'var(--lime)';
    c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
    this.msgT = n > 0 ? 0.9 : 1.1;
  }
  message(text, dur = 1.5, big = false) {
    const el = big ? this.e.center : this.e.sub;
    el.textContent = text; el.style.color = big ? 'var(--sun)' : '';
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    if (big) this.msgT = dur; else this.subT = dur;
  }
  lapDone(lap, laps, t) {
    const div = document.createElement('div');
    div.textContent = `Tour ${lap - 1} · ${fmtTime(t)}`;
    this.e.lapTimes.appendChild(div);
    if (lap - 1 < laps) this.message(`TOUR ${Math.min(lap, laps)}/${laps}`, 1.4);
  }
  finish(place, tt) {
    this.message('ARRIVÉE !', 3.2, true);
    if (!tt) setTimeout(() => this.message(`${place}${ordinal(place)} place`, 2.5), 900);
    this.e.warn.classList.remove('show');
  }
  ghostInfo(t) { this.e.ghost.textContent = 'Fantôme : ' + fmtTime(t); }
  rouletteStart() { this.roulT = 0; this.e.itemSlot.classList.add('spin'); }
  itemGot(type, count, silent) {
    this.e.itemSlot.classList.remove('spin');
    this.e.itemIcon.innerHTML = type ? ICON_SVG[type] : '';
    this.e.itemCount.textContent = type && count > 1 ? '×' + count : '';
    if (type && !silent) { this.e.itemSlot.classList.remove('got'); void this.e.itemSlot.offsetWidth; this.e.itemSlot.classList.add('got'); Sound.sfx('itemGet'); }
  }
  danger(kind, dist) {
    this.dangerT = 0.25;
    this.dangerKind = kind;
    this.dangerDist = dist;
  }
  setFps(f) { if (Settings.showFps && this.index === 0) this.set('fps', this.e.fps, f + ' i/s'); }

  update(dt, race) {
    const P = this.kart;
    if (this.msgT > 0) { this.msgT -= dt; if (this.msgT <= 0) this.e.center.classList.remove('show'); }
    if (this.subT > 0) { this.subT -= dt; if (this.subT <= 0) this.e.sub.classList.remove('show'); }
    this.set('time', this.e.time, fmtTime(P.finished ? P.finishTime : race.time));
    this.set('lap', this.e.lapNum, String(clamp(P.lap + 1, 1, race.laps)));
    this.set('coins', this.e.coins, String(P.coins));
    this.set('speed', this.e.speed, String(Math.round(Math.abs(P.speed) * 4.2)));
    if (race.mode !== 'tt') {
      const pl = P.place;
      if (this.cache.place !== pl) {
        this.cache.place = pl;
        this.e.posNum.textContent = pl; this.e.posSuf.textContent = ordinal(pl);
        this.e.posBox.style.color = pl === 1 ? 'var(--gold)' : pl === 2 ? 'var(--silver)' : pl === 3 ? 'var(--bronze)' : 'var(--paper)';
        this.e.posBox.classList.remove('bump'); void this.e.posBox.offsetWidth; this.e.posBox.classList.add('bump');
      }
      if (!race.split) race.ranking.forEach((k, i) => {
        const li = this.rankEls.get(k);
        if (!li) return;
        const key = 'r' + k.index;
        if (this.cache[key] !== i) {
          this.cache[key] = i;
          li.style.transform = `translateY(${i * this.rowH}px)`;
          li.firstChild.textContent = i + 1;
        }
      });
    }
    if (P.roulette > 0) {
      this.roulT -= dt;
      if (this.roulT <= 0) {
        this.roulT = 0.075;
        const keys = Object.keys(ICON_SVG);
        this.roulIdx = (this.roulIdx + 1 + Math.floor(Math.random() * 3)) % keys.length;
        this.e.itemIcon.innerHTML = ICON_SVG[keys[this.roulIdx]];
        Sound.sfx('rouletteTick');
      }
    }
    const ww = P.wrongWay > 1.2 && race.state === 'race' && !P.finished;
    if (this.cache.ww !== ww) { this.cache.ww = ww; this.e.warn.classList.toggle('show', ww); }
    if (this.dangerT > 0) {
      this.dangerT -= dt;
      const cls = 'danger show' + (this.dangerKind === 'blue' ? ' blue' : '');
      if (this.e.danger.className !== cls) this.e.danger.className = cls;
      this.beepT -= dt;
      if (this.beepT <= 0 && this.dangerKind) { Sound.sfx('warn'); this.beepT = this.dangerKind === 'blue' ? 0.35 : clamp(0.08 + this.dangerDist / 140, 0.08, 0.6); }
      if (this.dangerT <= 0) this.e.danger.className = 'danger';
    }
    this.drawMinimap(race);
  }

  drawMinimap(race) {
    const g = this.mg, S = this.mm.width;
    g.clearRect(0, 0, S, S);
    g.drawImage(this.mmStatic, 0, 0);
    for (const o of race.items.objects) {
      if (!o.alive) continue;
      const [x, y] = this.mmXY(o.pos.x, o.pos.z);
      g.fillStyle = o.type === 'banana' ? '#ffd84a' : o.type === 'disc' ? '#3fe070' : o.type === 'missile' ? '#ff4a3d' : o.type === 'comet' ? '#33b6ff' : '#22222c';
      g.beginPath(); g.arc(x, y, o.type === 'comet' ? 8 : 5, 0, TAU); g.fill();
    }
    const me = this.kart;
    const rank = (k) => (k === me ? 2 : k.human != null ? 1 : 0);
    const list = race.karts.slice().sort((a, b) => rank(a) - rank(b));
    for (const k of list) {
      const [x, y] = this.mmXY(k.pos.x, k.pos.z);
      const r = k === me ? 13 : k.human != null ? 11 : 9;
      g.beginPath(); g.arc(x, y, r + 3, 0, TAU); g.fillStyle = k === me ? '#ffffff' : k.human != null ? '#ffd02b' : '#141632'; g.fill();
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = '#' + k.def.kart.toString(16).padStart(6, '0'); g.fill();
      if (k === me) {
        g.save(); g.translate(x, y); g.rotate(-k.heading + Math.PI);
        g.beginPath(); g.moveTo(0, -r - 10); g.lineTo(6, -r - 2); g.lineTo(-6, -r - 2); g.closePath(); g.fillStyle = '#ffffff'; g.fill();
        g.restore();
      }
    }
    if (race.ghost && race.ghost.root.visible) {
      const p = race.ghost.root.position, [x, y] = this.mmXY(p.x, p.z);
      g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill();
    }
  }

  setupTouch(split) {
    const isTouch = (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window) && this.index === 0 && !split;
    this.e.touch.hidden = !isTouch;
    if (!isTouch || this.touchBuilt) return;
    this.touchBuilt = true;
    Settings.autoAccel = true;
    const mk = (label, key, css) => {
      const b = document.createElement('div');
      b.className = 'tbtn'; b.textContent = label; Object.assign(b.style, css);
      const on = (v) => (e) => { e.preventDefault(); Input.touch[key] = v; b.classList.toggle('on', v); };
      b.addEventListener('touchstart', on(true), { passive: false });
      b.addEventListener('touchend', on(false), { passive: false });
      b.addEventListener('touchcancel', on(false), { passive: false });
      this.e.touch.appendChild(b);
    };
    mk('◀', 'left', { left: '18px', bottom: '24px' });
    mk('▶', 'right', { left: '104px', bottom: '24px' });
    mk('SAUT', 'drift', { right: '18px', bottom: '24px' });
    mk('OBJET', 'item', { right: '104px', bottom: '60px' });
    mk('FREIN', 'brake', { right: '18px', bottom: '112px' });
  }
}
