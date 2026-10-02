/* ============================================================
   AI driver — follows the racing line, drifts, dodges, uses items
   ============================================================ */
class AIDriver {
  constructor(kart, race, skill) {
    this.k = kart; this.race = race; this.tr = race.track;
    this.skill = clamp(skill, 0, 1);
    this.lane = rand(-0.5, 0.5); this.laneT = rand(2, 6);
    this.avoid = 0;
    this.itemT = 0; this.itemPlan = rand(1, 4);
    this.driftDir = 0; this.driftTime = 0; this.driftCool = 0; this.hopT = 0;
    this.stuckT = 0; this.stuckP = -1e9;
    this.wobble = rand(0, TAU);
    this.f = {}; this.f2 = {};
    this.boxSeek = 0;
  }

  update(dt) {
    const k = this.k, tr = this.tr, inp = k.input, race = this.race;
    inp.driftPressed = false; inp.itemPressed = false; inp.itemReleased = false; inp.back = false;
    if (!race.started) return;
    if (k.respawning > 0) { inp.accel = 0; inp.steer = 0; inp.drift = false; return; }

    const v = Math.max(10, k.speed);
    const look = 7 + v * 0.42;
    const f = tr.frameAt(k.s + look, this.f);
    // lane wandering keeps the pack from driving single-file
    this.laneT -= dt;
    if (this.laneT <= 0) { this.lane = clamp(this.lane + rand(-0.5, 0.5), -0.6, 0.6); this.laneT = rand(2.5, 6); }
    const half = f.w / 2 - 2.0;
    let lat = f.rl * (0.6 + this.skill * 0.35) + this.lane * half * 0.55 + Math.sin(race.time * 0.6 + this.wobble) * 0.6;

    // seek item boxes when empty-handed, then boost pads and ramps
    if (!k.item && k.roulette <= 0) {
      const box = race.items.nextBoxRow(k.s, 70);
      if (box) lat = lerp(lat, box.lat, 0.7);
    }
    for (const f2 of [tr.boosts, tr.ramps]) {
      for (const b of f2) {
        const ds = tr.wrapDS(b.s - k.s);
        if (ds > -2 && ds < 45 && this.skill > 0.3) lat = lerp(lat, b.lat, 0.55 + this.skill * 0.4);
      }
    }
    // dodge hazards on the ground and karts right ahead
    this.avoid = damp(this.avoid, this.computeAvoid(lat), 5, dt);
    lat = clamp(lat + this.avoid, -half, half);

    const tx = f.px + f.lx * lat, tz = f.pz + f.lz * lat;
    const desired = Math.atan2(tx - k.pos.x, tz - k.pos.z);
    const err = wrapAngle(desired - k.heading);
    let steer = clamp(-err * 2.6, -1, 1);

    // ---------- drifting ----------
    const ca = tr.curveAhead(k.s + 2, 26);
    this.driftCool = Math.max(0, this.driftCool - dt);
    inp.drift = false;
    if (k.drift === 0 && !k.hopping) {
      const wantDrift = this.driftCool <= 0 && k.grounded && !k.rampAir && k.speed > k.maxSpeed * 0.7 && Math.abs(ca.meanK) > 1 / 62 && Math.random() < this.skill * 0.9 + 0.1;
      if (wantDrift) {
        this.driftDir = ca.meanK > 0 ? -1 : 1;
        inp.drift = true; inp.driftPressed = true; this.hopT = 0.6; this.driftTime = 0;
      }
    }
    if (this.hopT > 0) {
      this.hopT -= dt;
      inp.drift = true;
      if (k.hopping) steer = this.driftDir;
      if (this.hopT <= 0 && k.drift === 0) { this.driftCool = 1.2; inp.drift = false; }
    }
    if (k.drift !== 0) {
      this.driftTime += dt;
      const desiredYaw = clamp(err * 3.2, -3, 3);
      const into = (-desiredYaw / k.drift / Math.max(0.5, k.turnRate) - 0.66) / 0.42;
      steer = clamp(into, -1, 1) * k.drift;
      const targetLvl = this.skill > 0.75 ? 2 : 1;
      const curveDone = Math.abs(ca.meanK) < 1 / 90 || Math.sign(ca.meanK) === k.drift;
      const lost = into < -1.6 || into > 1.9;
      const release = (k.driftLevel >= targetLvl && curveDone) || (lost && this.driftTime > 0.25) || this.driftTime > 4 || k.driftLevel >= 3;
      inp.drift = !release;
      if (release) { this.driftCool = 0.6; this.hopT = 0; }
    }

    // tricks off ramps
    if (k.rampAir && k.trickReady && !k.trickDone && k.airTime > 0.08 && Math.random() < 0.25 + this.skill * 0.7) inp.driftPressed = true;
    // throttle: lift for very sharp corners when not drifting
    inp.accel = 1; inp.brake = 0;
    if (k.drift === 0 && Math.abs(err) > 0.7 && k.speed > k.maxSpeed * 0.6) inp.accel = 0;
    if (Math.abs(err) > 1.9 && k.speed > 6) { inp.brake = 1; inp.accel = 0; }
    // reversing out of a wall jam
    if (this.reverseT > 0) { this.reverseT -= dt; inp.accel = 0; inp.brake = 1; steer = -steer; }
    inp.steer = steer;

    // ---------- stuck detection ----------
    if (k.progress > this.stuckP + 4) { this.stuckP = k.progress; this.stuckT = 0; }
    else {
      this.stuckT += dt;
      if (this.stuckT > 2.2 && !this.reverseT) { this.reverseT = 0.9; }
      if (this.stuckT > 5) { race.onFall(k, true); this.stuckT = 0; this.stuckP = k.progress; }
    }
    this.useItems(dt, ca);
  }

  computeAvoid(lat) {
    const k = this.k, race = this.race, tr = this.tr;
    let push = 0;
    for (const h of race.items.hazards) {
      if (!h.alive || h.type === 'boxfake') continue;
      const ds = tr.wrapDS(h.s - k.s);
      if (ds < 2 || ds > 28) continue;
      const dl = h.lat - lat;
      if (Math.abs(dl) < 2.6 && Math.random() < 0.15 + this.skill * 0.85) push += (dl > 0 ? -1 : 1) * (2.8 - Math.abs(dl)) * 1.4;
    }
    for (const o of race.karts) {
      if (o === k) continue;
      const ds = tr.wrapDS(o.s - k.s);
      if (ds < 0.5 || ds > 9) continue;
      const dl = o.q.lateral - k.q.lateral;
      if (Math.abs(dl) < 2.2 && o.speed < k.speed + 2) push += (dl > 0 ? -1 : 1) * 1.6;
    }
    return clamp(push, -5, 5);
  }

  useItems(dt, ca) {
    const k = this.k, inp = k.input, race = this.race;
    if (!k.item || k.roulette > 0) { this.itemT = 0; return; }
    this.itemT += dt;
    if (this.itemT < this.itemPlan) return;
    const type = k.item;
    const ahead = race.kartAhead(k, 40), behind = race.kartBehind(k, 14);
    const straight = Math.abs(ca.meanK) < 1 / 70;
    const press = () => { inp.itemPressed = true; inp.item = true; };
    const release = (back) => { inp.item = false; inp.itemReleased = true; inp.back = !!back; };
    switch (type) {
      case 'banana': case 'banana3':
        if (!k.dragging && type === 'banana') { press(); this.dragT = rand(2, 7); break; }
        if (k.dragging) { inp.item = true; this.dragT -= dt; if (behind || this.dragT <= 0) { release(); this.reset(); } }
        else if (type === 'banana3' && (behind || this.itemT > this.itemPlan + 3)) { press(); release(); this.reset(0.8); }
        break;
      case 'green':
        if (!k.dragging) { press(); this.dragT = rand(1, 6); break; }
        inp.item = true; this.dragT -= dt;
        if (ahead && ahead.aligned) { release(); this.reset(); }
        else if (behind && !ahead) { release(true); this.reset(); }
        else if (this.dragT <= 0 && this.itemT > 9) { release(); this.reset(); }
        break;
      case 'green3':
        if ((ahead && ahead.aligned) || this.itemT > this.itemPlan + 8) { press(); release(behind && !ahead); this.reset(1); }
        break;
      case 'red':
        if (k.place > 1 || this.itemT > 8) {
          if (!k.dragging) { press(); this.dragT = 0.3; }
          else { inp.item = true; this.dragT -= dt; if (this.dragT <= 0) { release(k.place === 1 && behind); this.reset(); } }
        }
        break;
      case 'bomb':
        if (!k.dragging) { press(); this.dragT = rand(1, 4); break; }
        inp.item = true; this.dragT -= dt;
        if ((ahead && ahead.dist < 30) || this.dragT <= 0) { release(!ahead && !!behind); this.reset(); }
        break;
      case 'nitro': case 'nitro3':
        if ((straight && k.speed > k.maxSpeed * 0.55) || k.q.offroad || this.itemT > 10) { press(); release(); this.reset(type === 'nitro3' ? 1.2 : 0); }
        break;
      default: // star, lightning, comet
        press(); release(); this.reset();
    }
  }
  reset(delay) { this.itemT = 0; this.itemPlan = delay ?? rand(0.5, 3); }
}
