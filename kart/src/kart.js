/* ============================================================
   Kart — arcade physics, drift/mini-turbo, hits, visuals
   heading h: forward = (sin h, 0, cos h); positive steer = right
   ============================================================ */
const CC = {
  50: { speed: 21, accel: 15.5, ai: 0.82, label: '50cc', desc: 'Pour découvrir les circuits' },
  100: { speed: 26, accel: 17.5, ai: 0.9, label: '100cc', desc: 'Des adversaires qui ne lâchent rien' },
  150: { speed: 30.5, accel: 19.5, ai: 0.97, label: '150cc', desc: 'La vraie compétition' },
  200: { speed: 36, accel: 22.5, ai: 1.0, label: '200cc', desc: 'Freiner devient une option sérieuse' },
};
const GRAVITY = 30;
const DRIFT_LEVELS = [1.0, 2.1, 3.3];
const MT_TIME = [0, 0.65, 1.15, 1.75];
const _up = new THREE.Vector3(0, 1, 0), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _nv = new THREE.Vector3();

class Kart {
  constructor(race, def, index, isPlayer) {
    this.race = race; this.track = race.track; this.def = def; this.index = index; this.isPlayer = isPlayer;
    this.name = def.name;
    this.model = buildKart(def, index + 1);
    race.scene.add(this.model.root);
    const st = def.stats, cc = CC[race.cc];
    this.maxSpeed = cc.speed * (0.94 + st.speed * 0.024);
    this.accelRate = cc.accel * (0.8 + st.accel * 0.085);
    this.turnRate = 2.05 * (0.86 + st.handling * 0.05) * (race.cc >= 200 ? 1.08 : 1);
    this.mass = 0.75 + st.weight * 0.14;
    this.offMul = 0.46 + st.weight * 0.012;
    this.radius = 1.05;
    this.aiMul = 1;
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.heading = 0; this.vy = 0; this.speed = 0; this.yawRate = 0;
    this.grounded = true; this.airTime = 0;
    this.q = {}; this.idx = 0;
    this.lap = -1; this.maxLap = -1; this.prevS = 0; this.progress = 0; this.s = 0;
    this.lapStart = 0; this.lapTimes = [];
    this.finished = false; this.finishTime = 0; this.place = index + 1;
    this.input = { accel: 0, brake: 0, steer: 0, drift: false, driftPressed: false, item: false, itemPressed: false, itemReleased: false, back: false };
    this.drift = 0; this.driftCharge = 0; this.driftLevel = 0; this.hopping = false; this.driftSteer = 0;
    this.boost = 0; this.boostKind = 'mt'; this.mtLevel = 0;
    this.spin = 0; this.tumble = 0; this.invuln = 0; this.star = 0; this.shrink = 0; this.squash = 0;
    this.trick = 0; this.trickReady = false; this.trickDone = false; this.rampAir = false; this.prevRamp = null;
    this.coins = 0;
    this.item = null; this.itemCount = 0; this.roulette = 0; this.rouletteItem = null;
    this.dragging = null; this.held = [];
    this.respawning = 0; this.safeS = 0; this.safeLat = 0;
    this.wrongWay = 0; this.stuckT = 0; this.stuckS = 0;
    // visual state
    this.vis = { driftYaw: 0, roll: 0, pitch: 0, spinA: 0, flipA: 0, trickA: 0, bounce: 0, scale: 1, squashT: 0, up: new THREE.Vector3(0, 1, 0), steer: 0, hopY: 0 };
    this.wheelAngle = 0;
    this.sparkAcc = 0; this.dustAcc = 0;
  }

  placeAt(s, lat) {
    const f = this.track.frameAt(s);
    this.pos.set(f.px + f.lx * lat, f.py + f.ly * lat, f.pz + f.lz * lat);
    this.heading = Math.atan2(f.tx, f.tz);
    this.vel.set(0, 0, 0); this.vy = 0; this.grounded = true;
    this.track.queryGlobal(this.pos.x, this.pos.y, this.pos.z, this.q);
    this.idx = this.q.idx;
    this.prevS = this.q.s; this.s = this.q.s;
    this.lap = s < 0 ? -1 : 0; this.maxLap = this.lap;
    this.progress = this.lap * this.track.L + this.q.s;
    this.safeS = this.q.s; this.safeLat = lat;
    this.updateVisual(0, 0);
  }

  get controllable() {
    return this.race.started && this.spin <= 0 && this.tumble <= 0 && this.respawning <= 0;
  }
  get isBoosting() { return this.boost > 0; }

  applyBoost(t, kind = 'mt', level = 0) {
    this.boost = Math.max(this.boost, t);
    this.boostKind = kind; this.mtLevel = level;
    const f = this.forwardSpeed();
    const target = this.maxSpeed * 1.08;
    if (f < target) this.addForward(Math.min(target - f, kind === 'pad' || kind === 'nitro' ? 14 : 8));
  }
  forwardSpeed() { return this.vel.x * Math.sin(this.heading) + this.vel.z * Math.cos(this.heading); }
  addForward(v) { this.vel.x += Math.sin(this.heading) * v; this.vel.z += Math.cos(this.heading) * v; }

  /* ---------------- physics step ---------------- */
  step(dt) {
    const tr = this.track, inp = this.input, q = this.q;
    // timers
    this.boost = Math.max(0, this.boost - dt);
    this.spin = Math.max(0, this.spin - dt);
    this.tumble = Math.max(0, this.tumble - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.star = Math.max(0, this.star - dt);
    if (this.shrink > 0) { this.shrink -= dt; if (this.shrink <= 0) { this.shrink = 0; this.race.onUnshrink(this); } }
    this.squash = Math.max(0, this.squash - dt);
    if (this.respawning > 0) { this.stepRespawn(dt); return; }

    const control = this.controllable;
    const sinH = Math.sin(this.heading), cosH = Math.cos(this.heading);
    let vf = this.vel.x * sinH + this.vel.z * cosH;
    let vr = -this.vel.x * cosH + this.vel.z * sinH;

    // ---------- target speed ----------
    let maxS = this.maxSpeed * this.aiMul * (1 + Math.min(this.coins, 10) * 0.008);
    if (this.shrink > 0) maxS *= 0.72;
    const offroad = q.offroad && this.grounded && this.star <= 0 && this.boost <= 0;
    if (offroad) maxS *= this.offMul;
    if (this.star > 0) maxS *= 1.14;
    if (this.boost > 0) maxS *= this.boostKind === 'mt' ? 1.26 + this.mtLevel * 0.03 : 1.36;

    const accelIn = control ? inp.accel : 0;
    const brakeIn = control ? inp.brake : 0;
    if (this.boost > 0 && control && vf < maxS) vf = Math.min(maxS, vf + 42 * dt);
    if (accelIn > 0 && brakeIn <= 0) {
      if (vf < maxS) {
        const r = Math.max(0, vf) / maxS;
        vf = Math.min(maxS, vf + this.accelRate * accelIn * (1.25 - 0.95 * r * r) * dt);
      }
    } else if (brakeIn > 0) {
      if (vf > 0.5) vf -= 36 * dt;
      else vf = Math.max(vf - 16 * dt, -this.maxSpeed * 0.35);
    } else {
      const drag = (3 + Math.abs(vf) * 0.22) * dt;
      vf = Math.abs(vf) <= drag ? 0 : vf - Math.sign(vf) * drag;
    }
    if (vf > maxS) vf = damp(vf, maxS, offroad ? 3.2 : 1.4, dt);
    if (!control) vf = damp(vf, 0, this.tumble > 0 ? 2.4 : this.spin > 0 ? 1.8 : 0.4, dt);

    // ---------- hop / drift ----------
    const steer = control ? inp.steer : 0;
    if (control && inp.driftPressed && this.grounded && !this.hopping) {
      if (this.rampAir) { /* handled in air */ }
      else { this.vy = 4.2; this.grounded = false; this.hopping = true; this.driftSteer = 0; if (this.isPlayer) Sound.sfx('hop'); }
    }
    if (!this.grounded && this.hopping && Math.abs(steer) > 0.2) this.driftSteer = Math.sign(steer);
    if (this.rampAir && control && inp.driftPressed && this.trickReady && !this.trickDone) {
      this.trickDone = true; this.trick = 0.5; this.race.stats.tricks++; if (this.isPlayer) Sound.sfx('trick');
    }
    if (this.drift !== 0) {
      if (!inp.drift || vf < 7 || !control) this.endDrift(control && vf >= 7);
      else if (this.grounded) {
        if (!q.offroad || this.star > 0) this.driftCharge += dt * (0.85 + 1.0 * Math.max(0, steer * this.drift));
        const lvl = this.driftCharge >= DRIFT_LEVELS[2] ? 3 : this.driftCharge >= DRIFT_LEVELS[1] ? 2 : this.driftCharge >= DRIFT_LEVELS[0] ? 1 : 0;
        if (lvl > this.driftLevel) { this.driftLevel = lvl; if (this.isPlayer) Sound.sfx('sparkUp', lvl); }
      }
    }

    // ---------- steering ----------
    const speedF = clamp(Math.abs(vf) / 7, 0, 1);
    let yawRate;
    if (this.drift !== 0) {
      const into = steer * this.drift;
      yawRate = -this.drift * this.turnRate * (0.66 + 0.42 * into) * speedF;
    } else {
      const hi = clamp((Math.abs(vf) - 22) / 20, 0, 1);
      yawRate = -steer * this.turnRate * speedF * (1 - hi * 0.15) * (vf >= -0.5 ? 1 : -1) * (this.grounded ? 1 : 0.4);
    }
    if (this.tumble > 0) yawRate = 0;
    this.yawRate = yawRate;
    this.heading += yawRate * dt;

    // ---------- lateral grip ----------
    const ice = tr.def.road === 'ice' && !q.offroad;
    const grip = !this.grounded ? 0.6 : this.drift !== 0 ? 5.5 : ice ? 6.5 : 11;
    vr *= Math.exp(-grip * dt);
    if (this.drift !== 0 && this.grounded) vr = damp(vr, -this.drift * vf * 0.1, 5, dt);
    const s2 = Math.sin(this.heading), c2 = Math.cos(this.heading);
    this.vel.x = s2 * vf - c2 * vr;
    this.vel.z = c2 * vf + s2 * vr;
    this.speed = vf;

    // ---------- integrate ----------
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    tr.query(this.pos.x, this.pos.y, this.pos.z, this.idx, q);
    this.idx = q.idx;

    // walls / rails
    const wallLim = q.wall - this.radius * 0.8;
    if (Math.abs(q.lateral) > wallLim) {
      const sg = Math.sign(q.lateral), pen = Math.abs(q.lateral) - wallLim;
      this.pos.x -= q.nx * sg * pen; this.pos.z -= q.nz * sg * pen;
      const nx = -sg * q.nx, nz = -sg * q.nz;
      const vn = this.vel.x * nx + this.vel.z * nz;
      if (vn < 0) {
        this.vel.x -= nx * vn * 1.3; this.vel.z -= nz * vn * 1.3;
        const impact = -vn;
        const loss = clamp(impact / 28, 0, 0.55);
        this.vel.x *= 1 - loss * 0.7; this.vel.z *= 1 - loss * 0.7;
        // steer the nose away from the wall a little
        const wallHeading = Math.atan2(q.tx, q.tz);
        const fwdDot = Math.sin(this.heading) * q.tx + Math.cos(this.heading) * q.tz;
        if (impact > 3) this.heading = dampAngle(this.heading, fwdDot >= 0 ? wallHeading : wallHeading + Math.PI, 6, dt * Math.min(3, impact / 6));
        if (impact > 5) this.race.onWallHit(this, impact, q);
      }
      tr.query(this.pos.x, this.pos.y, this.pos.z, this.idx, q);
    }

    // ---------- vertical ----------
    const gy = q.void ? -Infinity : q.groundY;
    if (this.grounded) {
      const predicted = this.pos.y + this.vy * dt;
      if (this.prevRamp && !q.ramp && vf > 6) {
        // launched off the end of a ramp: trick window opens
        this.vy = 5.5 + vf * 0.17; this.grounded = false; this.rampAir = true; this.trickReady = true; this.trickDone = false;
        if (this.drift) this.endDrift(true);
      } else if (gy === -Infinity || predicted - gy > 0.32) {
        this.grounded = false;
      } else {
        this.vy = clamp((gy - this.pos.y) / Math.max(dt, 1e-4), -14, 14);
        this.pos.y = gy;
      }
    }
    if (!this.grounded) {
      this.vy -= GRAVITY * dt * (this.hopping ? 1.25 : 1);
      this.pos.y += this.vy * dt;
      this.airTime += dt;
      if (this.rampAir && this.airTime > 0.55) this.trickReady = false;
      if (gy !== -Infinity && this.pos.y <= gy) this.land(gy);
      else if (this.pos.y < q.cy - 14) { this.race.onFall(this); return; }
    }
    this.prevRamp = q.ramp;
    if (q.boost && this.grounded && this.boost < 0.9) { this.applyBoost(1.2, 'pad'); if (this.isPlayer) Sound.sfx('boost'); this.race.onBoostPad(this); }

    // ---------- progress ----------
    const L = tr.L, s = q.s;
    if (this.prevS > L * 0.75 && s < L * 0.25) this.crossLine(1);
    else if (this.prevS < L * 0.25 && s > L * 0.75) this.crossLine(-1);
    this.prevS = s; this.s = s;
    this.progress = this.lap * L + s;
    if (this.grounded && !q.offroad && !q.void) { this.safeS = s; this.safeLat = clamp(q.lateral, -q.width / 3, q.width / 3); }
    const fwd = Math.sin(this.heading) * q.tx + Math.cos(this.heading) * q.tz;
    this.wrongWay = (fwd < -0.35 && Math.abs(vf) > 3) || (vf < -3 && fwd > 0.35) ? this.wrongWay + dt : 0;
  }

  land(gy) {
    const hard = this.vy < -9;
    this.pos.y = gy; this.grounded = true;
    if (this.hopping) {
      this.hopping = false;
      const steer = this.input.steer, dir = Math.abs(steer) > 0.25 ? Math.sign(steer) : this.driftSteer;
      if (this.input.drift && dir !== 0 && this.speed > 9 && this.controllable) {
        this.drift = dir; this.driftCharge = 0; this.driftLevel = 0;
      }
    }
    if (this.rampAir) {
      this.rampAir = false;
      if (this.trickDone) { this.applyBoost(0.9, 'trick'); if (this.isPlayer) Sound.sfx('boost', 0.7); }
      this.trickDone = false; this.trickReady = false;
    }
    if (this.airTime > 0.35 || hard) {
      this.vis.squashT = 0.25;
      if (this.isPlayer) Sound.sfx('land');
      this.race.fx.burst(this.pos.x, this.pos.y + 0.2, this.pos.z, 10, 4, 0.5, 1.4, [0.9, 0.85, 0.75, 0.55], [0.9, 0.85, 0.75, 0], 2, 3, false);
    }
    this.vy = 0; this.airTime = 0;
  }

  endDrift(give) {
    if (give && this.driftLevel > 0) {
      this.applyBoost(MT_TIME[this.driftLevel], 'mt', this.driftLevel);
      if (this.isPlayer) Sound.sfx('miniTurbo', this.driftLevel);
      this.race.onMiniTurbo(this, this.driftLevel);
    }
    this.drift = 0; this.driftCharge = 0; this.driftLevel = 0;
  }

  crossLine(dir) {
    this.lap += dir;
    if (dir > 0 && this.lap > this.maxLap) {
      this.maxLap = this.lap;
      const t = this.race.time;
      if (this.lap >= 1) this.lapTimes.push(t - this.lapStart);
      this.lapStart = t;
      this.race.onLap(this);
    }
  }

  /* ---------------- hits ---------------- */
  hit(type, source) {
    if (this.respawning > 0 || this.finished && type !== 'squash') return false;
    if (this.star > 0) return false;
    if (this.invuln > 0 && type !== 'tumble') return false;
    if (this.invuln > 0.6) return false;
    if (this.drift) this.endDrift(false);
    this.hopping = false;
    if (type === 'spin') { this.spin = 1.05; this.invuln = 1.6; this.vel.multiplyScalar(0.45); }
    else if (type === 'tumble') { this.tumble = 1.35; this.invuln = 2.2; this.vy = 7.5; this.grounded = false; this.vel.multiplyScalar(0.25); }
    else if (type === 'squash') { this.spin = 0.85; this.squash = 1.3; this.invuln = 1.2; this.vel.multiplyScalar(0.4); }
    this.boost = 0;
    const lost = type === 'tumble' ? 3 : type === 'spin' ? 2 : 1;
    const drop = Math.min(this.coins, lost);
    this.coins -= drop;
    this.race.onKartHit(this, type, source, drop);
    return true;
  }

  /* ---------------- respawn (drone) ---------------- */
  startRespawn() {
    this.respawning = 1.7;
    this.drift = 0; this.boost = 0; this.hopping = false; this.rampAir = false;
    const s = this.safeS - 3;
    const f = this.track.frameAt(s);
    const lat = clamp(this.safeLat, -f.w / 4, f.w / 4);
    this.respawnTarget = new THREE.Vector3(f.px + f.lx * lat, f.py + f.ly * lat, f.pz + f.lz * lat);
    this.pos.copy(this.respawnTarget); this.pos.y += 7;
    this.heading = Math.atan2(f.tx, f.tz);
    this.vel.set(0, 0, 0); this.vy = 0; this.grounded = false;
    this.track.queryGlobal(this.pos.x, this.respawnTarget.y, this.pos.z, this.q);
    this.idx = this.q.idx;
    this.prevS = this.q.s;
  }
  stepRespawn(dt) {
    this.respawning -= dt;
    const t = clamp(1 - this.respawning / 1.7, 0, 1);
    this.pos.y = this.respawnTarget.y + 7 * (1 - smoothstep(0.15, 0.85, t)) + 0.4;
    if (this.respawning <= 0) {
      this.respawning = 0; this.grounded = false; this.vy = -1; this.invuln = 1.5;
      this.track.query(this.pos.x, this.pos.y, this.pos.z, this.idx, this.q);
    }
  }

  /* ---------------- visuals (per rendered frame) ---------------- */
  updateVisual(dt, time) {
    const m = this.model, v = this.vis, q = this.q;
    m.root.position.copy(this.pos);
    // align with the road surface
    if (this.track && q.i0 != null) {
      const U = this.track.UP, a = q.i0 * 3, b = q.i1 * 3, t = q.t;
      _nv.set(U[a] + (U[b] - U[a]) * t, U[a + 1] + (U[b + 1] - U[a + 1]) * t, U[a + 2] + (U[b + 2] - U[a + 2]) * t).normalize();
      if (!this.grounded) _nv.lerp(_up, 0.5).normalize();
      v.up.lerp(_nv, 1 - Math.exp(-10 * dt)).normalize();
    }
    _qa.setFromUnitVectors(_up, v.up);
    _qb.setFromAxisAngle(_up, this.heading);
    m.root.quaternion.multiplyQuaternions(_qa, _qb);

    const inp = this.input, sp = this.speed, spF = clamp(Math.abs(sp) / this.maxSpeed, 0, 1.3);
    v.steer = damp(v.steer, this.controllable ? inp.steer : 0, 12, dt);
    // drift yaw + spin + tumble + trick
    v.driftYaw = damp(v.driftYaw, -this.drift * 0.42, 7, dt);
    if (this.spin > 0) v.spinA += dt * 15; else v.spinA = damp(v.spinA, Math.round(v.spinA / TAU) * TAU, 10, dt);
    if (this.tumble > 0) v.flipA += dt * 11; else v.flipA = damp(v.flipA, Math.round(v.flipA / TAU) * TAU, 10, dt);
    if (this.trick > 0) { this.trick -= dt; v.trickA = (1 - Math.max(0, this.trick) / 0.5) * TAU; } else v.trickA = 0;
    v.roll = damp(v.roll, -v.steer * spF * 0.07 - this.drift * 0.06, 8, dt);
    const pitchT = (this.controllable ? (inp.accel ? -0.03 : 0) + (inp.brake && sp > 2 ? 0.05 : 0) : 0) + (this.grounded ? 0 : clamp(-this.vy * 0.015, -0.2, 0.2));
    v.pitch = damp(v.pitch, pitchT, 6, dt);
    v.bounce = q.offroad && this.grounded && Math.abs(sp) > 3 ? Math.sin(time * 38) * 0.035 : 0;
    v.squashT = Math.max(0, v.squashT - dt);
    const sq = v.squashT > 0 ? 1 - Math.sin((v.squashT / 0.25) * Math.PI) * 0.18 : 1;
    const flat = this.squash > 0 ? 0.25 : 1;
    const body = m.body;
    body.rotation.set(v.pitch + v.flipA, v.driftYaw + v.spinA, v.roll + v.trickA, 'YXZ');
    body.position.y = v.bounce;
    body.scale.set(1 / Math.sqrt(sq * flat), sq * flat, 1 / Math.sqrt(sq * flat));
    // size (lightning shrink)
    const targetScale = this.shrink > 0 ? 0.5 : 1;
    v.scale = damp(v.scale, targetScale, 8, dt);
    m.root.scale.setScalar(v.scale);
    // wheels
    this.wheelAngle += (sp / 0.34) * dt;
    for (const w of m.wheels) {
      w.spin.rotation.x = this.wheelAngle;
      if (w.front) w.pivot.rotation.y = -v.steer * 0.42 + this.drift * 0.35;
    }
    m.steer.rotation.z = v.steer * 0.9;
    const head = m.driver.head;
    head.rotation.y = damp(head.rotation.y, -v.steer * 0.35 + (this.isPlayer && this.input.back ? Math.PI * 0.6 : 0), 8, dt);
    head.rotation.z = this.spin > 0 || this.tumble > 0 ? Math.sin(time * 30) * 0.25 : damp(head.rotation.z, 0, 8, dt);
    // exhaust flames
    const flameOn = this.boost > 0;
    const fc = this.boostKind === 'mt' ? [0x45b6ff, 0x45b6ff, 0xff9a1a, 0xc05cff][this.mtLevel] : this.boostKind === 'pad' ? 0xffa020 : 0xff6a1a;
    m.flameMat.color.setHex(fc);
    for (const f of m.flames) {
      f.visible = flameOn || f.scale.x > 0.05;
      const tgt = flameOn ? 1 + Math.sin(time * 60 + f.id) * 0.25 : 0.01;
      f.scale.setScalar(damp(f.scale.x, tgt, 18, dt));
    }
    // star rainbow
    if (this.star > 0) {
      const c = new THREE.Color().setHSL((time * 2) % 1, 1, 0.55);
      m.paint.emissive.copy(c); m.paint.emissiveIntensity = 0.9;
      m.accent.emissive.copy(c); m.accent.emissiveIntensity = 0.6;
    } else if (m.paint.emissiveIntensity > 0) {
      m.paint.emissiveIntensity = 0; m.accent.emissiveIntensity = 0;
      m.paint.emissive.setHex(0); m.accent.emissive.setHex(0);
    }
    // invulnerability blink / respawn
    m.body.visible = !(this.invuln > 0 && this.spin <= 0 && this.tumble <= 0 && Math.floor(time * 16) % 2 === 0);
    // blob shadow stays on the ground
    const gy = q.void ? null : q.groundY;
    if (gy != null && isFinite(gy)) {
      const h = Math.max(0, this.pos.y - gy);
      m.blob.position.y = (-h + 0.05) / v.scale;
      m.blob.material.opacity = clamp(0.85 - h * 0.12, 0.15, 0.85);
      m.blob.visible = true;
    } else m.blob.visible = false;
    this.emitParticles(dt, time);
  }

  emitParticles(dt, time) {
    if (dt <= 0) return;
    const fx = this.race.fx, near = this.race.isNear(this);
    if (!near) return;
    const sh = Math.sin(this.heading), ch = Math.cos(this.heading);
    const rx = -ch, rz = sh; // right vector
    const back = (d, side) => [this.pos.x - sh * d + rx * side, this.pos.y + 0.25, this.pos.z - ch * d + rz * side];
    // drift sparks
    if (this.drift !== 0 && this.grounded) {
      this.sparkAcc += dt * (this.driftLevel > 0 ? 70 : 25);
      const col = this.driftLevel > 0 ? FXCOL.spark[this.driftLevel] : [1, 0.95, 0.8, 0.8];
      while (this.sparkAcc > 1) {
        this.sparkAcc -= 1;
        for (const side of [-0.85, 0.85]) {
          const [x, y, z] = back(0.75, side);
          fx.add.emit(x, y, z, rand(-2, 2) - sh * 3, rand(1.5, 4), rand(-2, 2) - ch * 3, rand(0.15, 0.3), this.driftLevel > 0 ? 0.55 : 0.3, 0.05, col, [col[0], col[1], col[2], 0], 9, 1);
        }
      }
    }
    // dust offroad / smoke when spinning
    const sp = Math.abs(this.speed);
    if (this.grounded && ((this.q.offroad && sp > 4) || this.spin > 0 || (this.drift && sp > 10))) {
      this.dustAcc += dt * (this.q.offroad ? 22 : 10);
      const th = this.track.def.theme;
      const dc = th === 'snow' ? [1, 1, 1, 0.6] : th === 'canyon' ? [0.9, 0.62, 0.4, 0.5] : th === 'meadow' && this.q.offroad ? [0.55, 0.45, 0.3, 0.45] : [0.85, 0.85, 0.85, 0.35];
      while (this.dustAcc > 1) {
        this.dustAcc -= 1;
        const [x, y, z] = back(0.9, rand(-0.9, 0.9));
        fx.alpha.emit(x, y, z, rand(-1, 1), rand(0.5, 2), rand(-1, 1), rand(0.4, 0.8), 0.8, 2.4, dc, [dc[0], dc[1], dc[2], 0], -0.5, 1.5);
      }
    }
    // boost fire trail
    if (this.boost > 0) {
      const c = this.boostKind === 'mt' ? FXCOL.spark[Math.max(1, this.mtLevel)] : [1, 0.6, 0.15, 1];
      for (const side of [-0.22, 0.22]) {
        const [x, y, z] = back(1.45, side);
        fx.add.emit(x, y + 0.45, z, -sh * 6 + rand(-1, 1), rand(0, 1.5), -ch * 6 + rand(-1, 1), 0.22, 0.9, 0.1, c, [1, 0.3, 0.05, 0], 0, 2);
      }
    }
    // star sparkles
    if (this.star > 0 && Math.random() < dt * 30) {
      const c = new THREE.Color().setHSL(Math.random(), 1, 0.6);
      fx.add.emit(this.pos.x + rand(-1, 1), this.pos.y + rand(0.3, 1.6), this.pos.z + rand(-1, 1), 0, 1, 0, 0.5, 0.6, 0, [c.r, c.g, c.b, 1], [1, 1, 1, 0]);
    }
    // dizzy stars when tumbling/spinning
    if ((this.tumble > 0 || this.spin > 0) && Math.random() < dt * 12) {
      fx.add.emit(this.pos.x, this.pos.y + 1.9, this.pos.z, rand(-2, 2), rand(1, 2), rand(-2, 2), 0.6, 0.45, 0.1, [1, 0.95, 0.4, 1], [1, 0.7, 0.2, 0], 0, 1);
    }
  }

  dispose() {
    this.race.scene.remove(this.model.root);
    this.model.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material && !Mats.shared.has(o.material)) o.material.dispose();
    });
  }
}
