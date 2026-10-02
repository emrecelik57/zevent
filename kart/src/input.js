/* ============================================================
   Input — keyboard (by physical key, so ZQSD/WASD both work),
   up to two gamepads (standard mapping) and optional touch buttons.
   In 2-player mode each player gets half of the keyboard + one pad.
   ============================================================ */
const Input = (() => {
  const down = new Set(), pressed = new Set(), released = new Set(), repeat = new Set();
  const BIND = {
    accel: ['ArrowUp', 'KeyW'],
    brake: ['ArrowDown', 'KeyS'],
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    drift: ['Space', 'ShiftLeft', 'ShiftRight', 'KeyK'],
    item: ['KeyE', 'KeyX', 'ControlLeft', 'ControlRight', 'KeyL', 'KeyJ'],
    look: ['KeyC'],
    pause: ['Escape', 'KeyP'],
    ok: ['Enter', 'NumpadEnter', 'Space'],
    back: ['Escape', 'Backspace'],
    fullscreen: ['KeyF'],
    up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
    mleft: ['ArrowLeft', 'KeyA'], mright: ['ArrowRight', 'KeyD'],
  };
  // per-player keys for split screen
  const PBIND = [
    { accel: ['KeyW'], brake: ['KeyS'], left: ['KeyA'], right: ['KeyD'], drift: ['Space', 'ShiftLeft'], item: ['KeyE', 'KeyR'], look: ['KeyC'] },
    { accel: ['ArrowUp'], brake: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], drift: ['ShiftRight', 'Numpad0', 'Slash'], item: ['Enter', 'NumpadEnter', 'ControlRight', 'Numpad1', 'Period'], look: ['Numpad2', 'Comma'] },
  ];
  const GP = { accel: [0, 7], brake: [1, 6], drift: [5], item: [4, 2], look: [3], pause: [9], ok: [0], back: [1],
    up: [12], down: [13], mleft: [14], mright: [15] };
  const pads = [0, 1].map(() => ({ now: new Set(), prev: new Set(), ax: 0, ay: 0, rt: 0, on: false }));
  const touch = { left: false, right: false, drift: false, item: false, accel: false, brake: false };
  const touchPrev = {};
  const stickRepeat = { dir: null, t: 0, fire: null };
  let players = 1;
  let anyHandler = null;
  const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'Slash', 'Period', 'Comma']);

  window.addEventListener('keydown', (e) => {
    if (GAME_KEYS.has(e.code) || e.code === 'Enter') e.preventDefault();
    if (e.repeat) { repeat.add(e.code); return; }
    down.add(e.code); pressed.add(e.code); repeat.add(e.code);
    if (anyHandler) anyHandler(e);
  }, { capture: true });
  window.addEventListener('keyup', (e) => { down.delete(e.code); released.add(e.code); });
  window.addEventListener('blur', () => { for (const c of down) released.add(c); down.clear(); });

  function pollGamepads(dt) {
    const list = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter((p) => p && p.connected) : [];
    pads.forEach((st, i) => {
      st.prev.clear(); for (const b of st.now) st.prev.add(b);
      st.now.clear(); st.ax = 0; st.ay = 0; st.rt = 0;
      const p = list[i];
      st.on = !!p;
      if (!p) return;
      p.buttons.forEach((b, k) => { if (b.pressed || b.value > 0.4) st.now.add(k); });
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (Math.abs(ax) > 0.15) st.ax = sign(ax) * Math.min(1, (Math.abs(ax) - 0.15) / 0.75);
      if (Math.abs(ay) > 0.15) st.ay = ay;
      st.rt = (p.buttons[7] && p.buttons[7].value) || 0;
    });
    // left stick of any pad as menu directions with auto-repeat
    let dir = null;
    for (const st of pads) {
      if (!st.on) continue;
      if (st.ay < -0.6) dir = 'up'; else if (st.ay > 0.6) dir = 'down';
      else if (st.ax < -0.6) dir = 'mleft'; else if (st.ax > 0.6) dir = 'mright';
      if (dir) break;
    }
    stickRepeat.fire = null;
    if (dir !== stickRepeat.dir) { stickRepeat.dir = dir; stickRepeat.t = 0.38; if (dir) stickRepeat.fire = dir; }
    else if (dir) { stickRepeat.t -= dt; if (stickRepeat.t <= 0) { stickRepeat.t = 0.12; stickRepeat.fire = dir; } }
  }

  const padList = (slot) => (slot === 'any' ? pads : [pads[slot]]);
  const keyDown = (keys) => !!keys && keys.some((k) => down.has(k));
  const keyPressed = (keys) => !!keys && keys.some((k) => pressed.has(k));
  const keyReleased = (keys) => !!keys && keys.some((k) => released.has(k));
  const padDown = (slot, a) => { const b = GP[a]; return !!b && padList(slot).some((p) => b.some((x) => p.now.has(x))); };
  const padPressed = (slot, a) => { const b = GP[a]; return !!b && padList(slot).some((p) => b.some((x) => p.now.has(x) && !p.prev.has(x))); };
  const padReleased = (slot, a) => { const b = GP[a]; return !!b && padList(slot).some((p) => b.some((x) => !p.now.has(x) && p.prev.has(x))); };

  /* controller for one racer: keyboard bindings + gamepad slot */
  function makeCtrl(bind, slot, withTouch) {
    const c = {
      isDown: (a) => keyDown(bind[a]) || padDown(slot, a) || (withTouch && !!touch[a]),
      wasPressed: (a) => keyPressed(bind[a]) || padPressed(slot, a) || (withTouch && !!touch[a] && !touchPrev[a]),
      wasReleased: (a) => (keyReleased(bind[a]) || padReleased(slot, a) || (withTouch && !touch[a] && !!touchPrev[a])) && !c.isDown(a),
      analog: () => padList(slot).some((p) => p.on && p.ax !== 0),
      steer() {
        let s = 0;
        if (c.isDown('left')) s -= 1;
        if (c.isDown('right')) s += 1;
        for (const p of padList(slot)) {
          if (!p.on) continue;
          if (p.ax !== 0) s = p.ax;
          if (p.now.has(14)) s = -1; if (p.now.has(15)) s = 1;
        }
        return clamp(s, -1, 1);
      },
      accel() {
        if (c.isDown('accel')) return 1;
        let rt = 0; for (const p of padList(slot)) rt = Math.max(rt, p.rt);
        return rt > 0.15 ? rt : 0;
      },
    };
    return c;
  }
  const soloCtrl = makeCtrl(BIND, 'any', true);
  const duoCtrl = [makeCtrl(PBIND[0], 0, false), makeCtrl(PBIND[1], 1, false)];

  const api = {
    BIND, PBIND, touch,
    get gamepad() { return pads.some((p) => p.on); },
    setPlayers(n) { players = n; },
    get players() { return players; },
    ctrl(i) { return players > 1 ? duoCtrl[i] : soloCtrl; },
    update(dt) { pollGamepads(dt); },
    endFrame() {
      pressed.clear(); released.clear(); repeat.clear();
      for (const k in touch) touchPrev[k] = touch[k];
    },
    onAnyKey(fn) { anyHandler = fn; },
    isDown: (a) => soloCtrl.isDown(a),
    wasPressed: (a) => keyPressed(BIND[a]) || padPressed('any', a) || (!!touch[a] && !touchPrev[a]),
    wasReleased: (a) => soloCtrl.wasReleased(a),
    /* menu navigation edge (with key repeat + stick repeat) */
    menuPressed(a) {
      const keys = BIND[a];
      if (keys) for (const k of keys) if (repeat.has(k)) return true;
      if (padPressed('any', a)) return true;
      if (stickRepeat.fire === a) return true;
      return false;
    },
    steer: () => soloCtrl.steer(),
    accel: () => soloCtrl.accel(),
    clear() { down.clear(); pressed.clear(); released.clear(); },
  };
  return api;
})();

/* Detect AZERTY to label keys correctly in the UI */
const KeyLabels = { up: 'Z', left: 'Q', down: 'S', right: 'D' };
(async () => {
  try {
    if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
      const map = await navigator.keyboard.getLayoutMap();
      const w = map.get('KeyW'), a = map.get('KeyA');
      if (w) KeyLabels.up = w.toUpperCase();
      if (a) KeyLabels.left = a.toUpperCase();
    }
  } catch (e) { /* keep AZERTY defaults */ }
})();
