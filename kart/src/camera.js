/* ============================================================
   Cameras — chase cam with lagging yaw, intro flyover, finish orbit
   ============================================================ */
class ChaseCam {
  constructor(camera) {
    this.cam = camera;
    this.yaw = 0; this.camY = 0;
    this.pos = new THREE.Vector3(); this.look = new THREE.Vector3();
    this.fov = 72; this.shake = 0;
    this.q = {}; this.idx = 0;
  }
  params() {
    return [[4.4, 1.85], [5.3, 2.15], [6.8, 2.8]][Settings.camera] || [5.3, 2.15];
  }
  reset(k) {
    this.yaw = k.heading; this.camY = k.pos.y;
    this.idx = k.idx;
    this.compute(k, 1, false);
    this.pos.copy(this._desired);
    this.look.copy(this._lookT);
    this.apply(0);
  }
  compute(k, dt, lookBack) {
    const [dist, height] = this.params();
    const spF = clamp(k.speed / k.maxSpeed, 0, 1.4);
    const back = lookBack ? -1 : 1;
    const scale = Math.sqrt(k.vis.scale);
    const d = (dist + spF * 0.7 + (k.boost > 0 ? 0.7 : 0)) * scale * back;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    this._desired = this._desired || new THREE.Vector3();
    this._lookT = this._lookT || new THREE.Vector3();
    this._desired.set(k.pos.x - sy * d, this.camY + height * scale + (lookBack ? 0.2 : 0), k.pos.z - cy * d);
    this._lookT.set(k.pos.x + sy * 2.6 * back, this.camY + 1.05 * scale, k.pos.z + cy * 2.6 * back);
  }
  update(dt, k, track, lookBack) {
    const yawTarget = k.heading;
    const wasBack = this._wasBack;
    this._wasBack = lookBack;
    this.yaw = dampAngle(this.yaw, yawTarget, k.drift ? 4.2 : 5.2, dt);
    this.camY = damp(this.camY, k.pos.y, k.grounded ? 9 : 4, dt);
    this.compute(k, dt, lookBack);
    if (lookBack !== wasBack) { this.pos.copy(this._desired); this.look.copy(this._lookT); }
    else {
      this.pos.x = damp(this.pos.x, this._desired.x, 14, dt);
      this.pos.z = damp(this.pos.z, this._desired.z, 14, dt);
      this.pos.y = damp(this.pos.y, this._desired.y, 9, dt);
      this.look.lerp(this._lookT, 1 - Math.exp(-18 * dt));
    }
    // keep the camera above the ground / track surface
    if (track) {
      track.query(this.pos.x, this.pos.y, this.pos.z, this.idx || k.idx, this.q);
      this.idx = this.q.idx;
      if (!this.q.void) {
        let gy = this.q.groundY;
        if (track.tg && this.q.offroad) gy = Math.max(gy, track.heightAt(this.pos.x, this.pos.z));
        if (this.pos.y < gy + 0.9) this.pos.y = gy + 0.9;
      }
    }
    const spF = clamp(k.speed / k.maxSpeed, 0, 1.4);
    const fovT = 70 + spF * 7 + (k.boost > 0 ? 9 : 0) + (k.star > 0 ? 4 : 0);
    this.fov = damp(this.fov, fovT, 4, dt);
    this.apply(dt);
  }
  apply(dt) {
    const c = this.cam;
    c.position.copy(this.pos);
    if (this.shake > 0) {
      const s = this.shake * 0.35;
      c.position.x += (Math.random() - 0.5) * s; c.position.y += (Math.random() - 0.5) * s; c.position.z += (Math.random() - 0.5) * s;
      this.shake = Math.max(0, this.shake - dt * 2.5);
    }
    c.lookAt(this.look);
    if (Math.abs(c.fov - this.fov) > 0.01) { c.fov = this.fov; c.updateProjectionMatrix(); }
  }
}

/* Intro flyover: sweeps down from high above the track onto the grid */
class IntroCam {
  constructor(camera, track, player) {
    this.cam = camera; this.track = track; this.t = 0; this.dur = 5.2;
    const L = track.L;
    const pts = [], looks = [];
    const add = (s, lat, up, ls, llat, lup) => { pts.push(track.pointAt(s, lat, up).clone()); looks.push(track.pointAt(ls, llat, lup).clone()); };
    add(L * 0.3, 40, 50, L * 0.22, 0, 0);
    add(L * 0.18, -30, 30, L * 0.1, 0, 0);
    add(70, 18, 14, 10, 0, 2);
    add(20, -10, 8, -12, 0, 1);
    this.curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    this.lookCurve = new THREE.CatmullRomCurve3(looks, false, 'centripetal');
    this.end = new THREE.Vector3(); this.endLook = new THREE.Vector3();
    this.player = player;
    this.p = new THREE.Vector3(); this.l = new THREE.Vector3();
  }
  update(dt, chase) {
    this.t += dt;
    const u = smooth(clamp(this.t / this.dur, 0, 1));
    this.curve.getPoint(Math.min(u * 1.0, 1), this.p);
    this.lookCurve.getPoint(Math.min(u, 1), this.l);
    // blend into the chase camera during the last part
    const b = smoothstep(0.72, 1, u);
    if (b > 0) {
      chase.compute(this.player, dt, false);
      this.p.lerp(chase._desired, b);
      this.l.lerp(chase._lookT, b);
    }
    this.cam.position.copy(this.p);
    this.cam.lookAt(this.l);
    this.cam.fov = 62 + b * 10; this.cam.updateProjectionMatrix();
    return this.t >= this.dur;
  }
}

/* Orbit around a target (finish line, podium) */
class OrbitCam {
  constructor(camera) { this.cam = camera; this.a = 0; this.target = new THREE.Vector3(); this.r = 9; this.h = 3.5; this.speed = 0.35; }
  update(dt, target) {
    this.a += dt * this.speed;
    this.target.lerp(target, 1 - Math.exp(-6 * dt));
    this.cam.position.set(this.target.x + Math.sin(this.a) * this.r, this.target.y + this.h, this.target.z + Math.cos(this.a) * this.r);
    this.cam.lookAt(this.target.x, this.target.y + 1, this.target.z);
  }
}
