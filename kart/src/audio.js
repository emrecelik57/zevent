/* ============================================================
   Audio — everything is synthesized with the Web Audio API
   ============================================================ */
const NOTE_BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteToMidi(n) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
  if (!m) return null;
  return NOTE_BASE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12 * (parseInt(m[3], 10) + 1);
}
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const CHORD_Q = {
  '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11],
  sus4: [0, 5, 7], sus2: [0, 2, 7], dim: [0, 3, 6], aug: [0, 4, 8], add9: [0, 4, 7, 14], 6: [0, 4, 7, 9],
};
function parseChord(name) {
  const m = /^([A-G])(#|b)?(.*)$/.exec(name);
  const root = (NOTE_BASE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  return { root, iv: CHORD_Q[m[3]] || CHORD_Q[''] };
}

/* ---------- Songs ---------- */
const SONGS = {
  menu: {
    gain: 1.0, bpm: 122, lead: 'pulse', bass: 'funk', arpInst: 'pluck', pad: false, leadVol: 0.75,
    bassPat: 'R . . R . . 8 . R . R . 5 . 8 .',
    arpPat: null,
    drums: {
      main: { k: 'x.....x...x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
      fill: { k: 'x.....x...x.x...', s: '....x.......xxXx', h: 'x.x.x.x.x.x.....' },
    },
    bars: [
      ['C', 'E5 - G5 - C6 - . . B5 - G5 - A5 - G5 -'],
      ['Am', 'E5 - - - C5 - D5 - E5 - . . A4 - . .'],
      ['F', 'F5 - A5 - C6 - . . A5 - F5 - G5 - A5 -'],
      ['G', 'G5 - - - - - . . D5 - G5 - B5 - D6 -'],
      ['C', 'E6 - D6 - C6 - . . G5 - E5 - G5 - C6 -'],
      ['Am', 'B5 - A5 - - - E5 - A5 - . . C6 - B5 -'],
      ['Dm7', 'A5 - - - F5 - D5 - F5 - A5 - C6 - A5 -'],
      ['G7', 'B5 - - - G5 - - - F5 - D5 - B4 - G4 -', 'fill'],
      ['F', 'A5 - - - C6 - - - A5 - G5 - F5 - - -'],
      ['G', 'G5 - - - B5 - - - D6 - C6 - B5 - - -'],
      ['Em', 'G5 - E5 - B4 - E5 - G5 - B5 - - - - -'],
      ['Am', 'A5 - - - E5 - C5 - A4 - C5 - E5 - A5 -'],
      ['Dm', 'F5 - - - A5 - - - D6 - - - C6 - A5 -'],
      ['G', 'B5 - - - D6 - - - G5 - - - B5 - D6 -'],
      ['C', 'C6 - - - - - - - G5 - E5 - G5 - - -'],
      ['G7', 'C6 - - - . . . . D6 - B5 - G5 - . .', 'fill'],
    ],
  },
  prairie: {
    gain: 1.3, bpm: 148, lead: 'pulse', bass: 'tri', arpInst: 'pluck', pad: false, leadVol: 0.8,
    bassPat: 'R . . . 5 . . . R . . . 5 . 3 .',
    arpPat: '. . 8 . . . 5 . . . 8 . . . 5 .',
    drums: {
      main: { k: 'x.......x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
      fill: { k: 'x.......x...x...', s: '....x.......x.xX', h: 'x.x.x.x.x.x.x...' },
    },
    bars: [
      ['F', 'C5 - F5 - A5 - - - G5 - F5 - G5 - A5 -'],
      ['Bb', 'Bb5 - - - A5 - G5 - F5 - - - D5 - - -'],
      ['C', 'E5 - G5 - C6 - - - Bb5 - A5 - G5 - E5 -'],
      ['F', 'F5 - - - - - . . C5 - D5 - E5 - F5 -'],
      ['Dm', 'A5 - - - F5 - A5 - D6 - - - C6 - A5 -'],
      ['Bb', 'Bb5 - - - D6 - Bb5 - F5 - - - G5 - A5 -'],
      ['C', 'G5 - - - E5 - G5 - C6 - - - Bb5 - G5 -'],
      ['C7', 'E5 - - - G5 - - - C5 - . . . . . .', 'fill'],
      ['Bb', 'D6 - - - C6 - Bb5 - - - A5 - Bb5 - - -'],
      ['F', 'A5 - - - F5 - - - C5 - - - F5 - A5 -'],
      ['Gm', 'G5 - Bb5 - D6 - - - C6 - Bb5 - A5 - G5 -'],
      ['C', 'E5 - - - G5 - - - C6 - - - - - - -'],
      ['Bb', 'D6 - - - F6 - - - D6 - C6 - Bb5 - - -'],
      ['F', 'C6 - - - A5 - - - F5 - G5 - A5 - - -'],
      ['Gm7|C7', 'Bb5 - - - A5 - G5 - E5 - - - G5 - - -'],
      ['F', 'F5 - - - - - - - . . . . . . . .', 'fill'],
    ],
  },
  canyon: {
    gain: 0.62, bpm: 132, lead: 'whistle', bass: 'tri', arpInst: 'pluck', pad: false, leadVol: 0.9,
    bassPat: 'R . R R 5 . 5 5 R . R R 5 . 8 .',
    arpPat: '1 . 5 . 8 . 5 . 1 . 5 . 8 . 5 .',
    drums: {
      main: { k: 'x.......x.......', s: '....x.......x...', h: 'x.xxx.xxx.xxx.xx' },
      fill: { k: 'x.......x.x.x...', s: '....x.......xxXX', h: 'x.xxx.xxx.......' },
    },
    bars: [
      ['Dm', 'A5 - - - - - - - D6 - - - A5 - - -'],
      ['C', 'G5 - - - E5 - - - C5 - - - E5 - G5 -'],
      ['Bb', 'F5 - - - - - - - D5 - - - F5 - A5 -'],
      ['A', 'E5 - - - - - - - C#5 - - - E5 - - -'],
      ['Dm', 'D6 - - - C6 - A5 - - - F5 - A5 - - -'],
      ['C', 'G5 - - - C6 - - - E5 - - - G5 - - -'],
      ['Bb|A', 'F5 - - - D5 - - - E5 - - - C#5 - - -'],
      ['Dm', 'D5 - - - - - - - - - - - . . . .', 'fill'],
      ['Dm', 'D5 - F5 - A5 - D6 - - - C6 - A5 - - -'],
      ['F', 'C6 - - - A5 - F5 - - - G5 - A5 - - -'],
      ['Gm', 'Bb5 - - - G5 - D5 - - - G5 - Bb5 - D6 -'],
      ['A', 'C#6 - - - A5 - - - E5 - - - A5 - - -'],
      ['Dm', 'F5 - E5 - D5 - - - A5 - - - D6 - - -'],
      ['Bb', 'D6 - C6 - Bb5 - - - F5 - - - Bb5 - - -'],
      ['Gm|A', 'G5 - Bb5 - A5 - G5 - E5 - - - C#5 - - -'],
      ['Dm', 'D5 - - - - - - - . . . . . . . .', 'fill'],
    ],
  },
  snow: {
    gain: 1.1, bpm: 126, lead: 'bell', bass: 'tri', arpInst: 'pluck', pad: true, leadVol: 0.85,
    bassPat: 'R . . . . . 5 . 8 . . . 5 . . .',
    arpPat: '1 5 8 5 1 5 8 5 1 5 8 5 1 5 8 5',
    drums: {
      main: { k: 'x.......x.......', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx' },
      fill: { k: 'x.......x...x.x.', s: '....x.......x.XX', h: 'xxxxxxxxxxxx....' },
    },
    bars: [
      ['G', 'B5 - - - D6 - - - G6 - - - F#6 - D6 -'],
      ['D', 'A5 - - - - - - - F#5 - A5 - D6 - - -'],
      ['Em', 'G6 - - - E6 - - - B5 - - - E6 - G6 -'],
      ['C', 'E6 - - - - - D6 - C6 - - - B5 - A5 -'],
      ['G', 'B5 - - - D6 - - - G6 - - - A6 - B6 -'],
      ['D', 'A6 - - - F#6 - - - D6 - - - E6 - F#6 -'],
      ['C', 'G6 - - - E6 - - - C6 - - - E6 - D6 -'],
      ['D', 'D6 - - - - - - - A5 - - - . . . .', 'fill'],
      ['Em', 'E6 - - - B5 - - - G5 - - - B5 - E6 -'],
      ['C', 'E6 - - - G6 - - - E6 - D6 - C6 - - -'],
      ['G', 'D6 - - - B5 - - - G5 - - - B5 - D6 -'],
      ['D', 'F#6 - - - A6 - - - F#6 - E6 - D6 - - -'],
      ['Em', 'G6 - - - - - F#6 - E6 - - - B5 - - -'],
      ['C', 'C6 - - - E6 - - - G6 - - - E6 - - -'],
      ['Am', 'A6 - - - G6 - - - E6 - - - C6 - - -'],
      ['D', 'D6 - - - F#6 - - - A6 - - - - - - -', 'fill'],
    ],
  },
  neon: {
    gain: 1.3, bpm: 112, lead: 'synth', bass: 'saw', arpInst: 'saw', pad: true, leadVol: 0.75,
    bassPat: 'R . R 8 R . R 8 R . R 8 R . R 8',
    arpPat: '1 3 5 8 10 8 5 3 1 3 5 8 10 8 5 3',
    drums: {
      main: { k: 'x...x...x...x...', s: '....X.......X...', h: '..x...x...x...x.' },
      fill: { k: 'x...x...x...x.x.', s: '....X.......XxXX', h: '..x...x...x.....' },
    },
    bars: [
      ['Am', 'E5 - - - - - - - A5 - - - G5 - E5 -'],
      ['F', 'F5 - - - - - - - C5 - - - - - - -'],
      ['C', 'G5 - - - - - - - E5 - - - G5 - C6 -'],
      ['G', 'B5 - - - - - - - - - - - D5 - - -'],
      ['Am', 'E5 - - - A5 - - - C6 - - - B5 - A5 -'],
      ['F', 'C6 - - - - - A5 - F5 - - - - - - -'],
      ['C', 'E5 - G5 - C6 - - - E6 - - - D6 - C6 -'],
      ['G', 'D6 - - - - - - - B5 - - - G5 - - -', 'fill'],
      ['Dm', 'F5 - - - A5 - - - D6 - - - C6 - A5 -'],
      ['Am', 'C6 - - - - - - - E5 - - - A5 - - -'],
      ['F', 'A5 - - - C6 - - - F6 - - - E6 - C6 -'],
      ['G', 'D6 - - - - - - - B5 - - - - - - -'],
      ['Dm', 'F6 - - - E6 - - - D6 - - - A5 - - -'],
      ['Am', 'C6 - - - B5 - - - A5 - - - E5 - - -'],
      ['F', 'F5 - - - A5 - - - C6 - - - F6 - - -'],
      ['E', 'E6 - - - - - - - G#5 - - - B5 - - -', 'fill'],
    ],
  },
  cosmic: {
    gain: 1.05, bpm: 138, lead: 'synth', bass: 'saw', arpInst: 'bellArp', pad: true, leadVol: 0.75,
    bassPat: '. . R . . . R . . . R . . . R .',
    arpPat: '1 5 8 5 3 5 8 5 1 5 8 5 3 5 8 12',
    drums: {
      main: { k: 'x...x...x...x...', s: '....x.......x...', h: '..o...o...o...o.' },
      fill: { k: 'x...x...x.x.x.x.', s: '....x...x.x.xxxx', h: '..o...o...o.....' },
    },
    bars: [
      ['E', 'G#5 - - - B5 - - - E6 - - - D#6 - B5 -'],
      ['C#m', 'C#6 - - - - - - - G#5 - - - E5 - G#5 -'],
      ['A', 'A5 - - - C#6 - - - E6 - - - F#6 - E6 -'],
      ['B', 'D#6 - - - - - - - F#6 - - - - - - -'],
      ['E', 'G#6 - - - F#6 - - - E6 - - - B5 - - -'],
      ['C#m', 'E6 - - - D#6 - - - C#6 - - - G#5 - - -'],
      ['A', 'A5 - B5 - C#6 - E6 - - - F#6 - E6 - C#6 -'],
      ['B', 'D#6 - - - - - - - B5 - - - - - - -', 'fill'],
      ['A', 'C#6 - - - E6 - - - A6 - - - G#6 - E6 -'],
      ['B', 'F#6 - - - D#6 - - - B5 - - - D#6 - F#6 -'],
      ['G#m', 'G#6 - - - - - - - D#6 - - - B5 - - -'],
      ['C#m', 'E6 - - - C#6 - - - G#5 - - - C#6 - E6 -'],
      ['A', 'A6 - - - G#6 - - - E6 - - - C#6 - - -'],
      ['B', 'B5 - - - D#6 - - - F#6 - - - A6 - - -'],
      ['E', 'G#6 - - - - - - - E6 - - - B5 - - -'],
      ['E', 'E6 - - - - - - - - - - - . . . .', 'fill'],
    ],
  },
  star: {
    gain: 0.7, bpm: 172, lead: 'pulse', bass: 'tri', arpInst: 'pluck', pad: false, leadVol: 0.6,
    bassPat: 'R . R . R . R . R . R . 5 . 8 .',
    arpPat: null,
    drums: {
      main: { k: 'x.x.x.x.x.x.x.x.', s: '..x...x...x...x.', h: 'xxxxxxxxxxxxxxxx' },
      fill: { k: 'x.x.x.x.x.x.x.x.', s: '..x...x...xxxxxx', h: 'xxxxxxxxxxxxxxxx' },
    },
    bars: [
      ['C', 'C6 E6 G6 C7 G6 E6 C6 E6 G6 C7 G6 E6 C6 E6 G6 E6'],
      ['F', 'C6 F6 A6 C7 A6 F6 C6 F6 A6 C7 A6 F6 C6 F6 A6 F6'],
      ['G', 'B5 D6 G6 B6 G6 D6 B5 D6 G6 B6 G6 D6 B5 D6 G6 D6'],
      ['C', 'C6 E6 G6 C7 G6 E6 C6 E6 G6 - - - C7 - - -', 'fill'],
    ],
  },
};

const JINGLES = {
  lap: { bpm: 160, inst: 'pulse', notes: [['C6', 0.5], ['E6', 0.5], ['G6', 1]] },
  finalLap: { bpm: 150, inst: 'pulse', notes: [['G5', 0.33], ['C6', 0.33], ['E6', 0.33], ['G6', 1], ['E6', 0.5], ['G6', 2]] },
  win: { bpm: 140, inst: 'pulse', notes: [['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 1.5], ['G5', 0.5], ['C6', 1], ['E6', 0.5], ['D6', 0.5], ['E6', 3]] },
  good: { bpm: 140, inst: 'pulse', notes: [['G5', 0.5], ['C6', 0.5], ['E6', 1], ['D6', 0.5], ['C6', 0.5], ['D6', 2]] },
  lose: { bpm: 110, inst: 'saw', notes: [['G4', 1], ['F#4', 1], ['F4', 1], ['E4', 3]] },
  gpWin: { bpm: 132, inst: 'pulse', notes: [['G5', 0.5], ['G5', 0.5], ['G5', 0.5], ['C6', 1.5], ['E6', 1], ['D6', 0.5], ['E6', 0.5], ['G6', 1], ['E6', 0.5], ['C7', 3]] },
};

const Sound = (() => {
  let ctx = null, master, comp, musicBus, songBus, sfxBus, reverb, reverbSend, noiseBuf, pulseWave;
  const api = { ready: false };

  function makeImpulse(seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  api.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { return; }
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.knee.value = 12; comp.ratio.value = 4;
    comp.attack.value = 0.004; comp.release.value = 0.25;
    master = ctx.createGain(); master.gain.value = 0.9;
    master.connect(comp); comp.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.connect(master);
    songBus = ctx.createGain(); songBus.connect(musicBus);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    reverb = ctx.createConvolver(); reverb.buffer = makeImpulse(1.8, 2.6);
    reverbSend = ctx.createGain(); reverbSend.gain.value = 0.32;
    reverbSend.connect(reverb); reverb.connect(musicBus);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // 25% pulse wave
    const N = 32, re = new Float32Array(N), im = new Float32Array(N);
    for (let n = 1; n < N; n++) im[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * 0.25) * 1.0;
    pulseWave = ctx.createPeriodicWave(re, im);
    api.ready = true;
    api.applyVolumes();
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend(); else ctx.resume();
    });
  };
  api.applyVolumes = function () {
    if (!ctx) return;
    musicBus.gain.setTargetAtTime(Settings.music * 0.5, ctx.currentTime, 0.05);
    sfxBus.gain.setTargetAtTime(Settings.sfx * 1.4, ctx.currentTime, 0.05);
  };
  api.now = () => (ctx ? ctx.currentTime : 0);
  api._out = () => (ctx ? { ctx, comp } : null);

  /* ---------- primitive voices ---------- */
  function tone(type, f0, t0, dur, vol, o = {}) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    if (type === 'pulse') osc.setPeriodicWave(pulseWave); else osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t0 + (o.glide || dur));
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain();
    const a = o.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + a);
    if (o.hold) g.gain.setValueAtTime(vol, t0 + a + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = osc;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = o.q || 0.7; node.connect(f); node = f; }
    node.connect(g);
    let out = g;
    if (o.pan) { const p = ctx.createStereoPanner(); p.pan.value = o.pan; g.connect(p); out = p; }
    out.connect(o.dest || sfxBus);
    if (o.send) g.connect(reverbSend);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
    osc.onended = () => { try { out.disconnect(); } catch (e) {} };
  }
  function noise(t0, dur, vol, o = {}) {
    if (!ctx) return;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    src.playbackRate.value = o.rate || 1;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.f0 || 1000, t0);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t0 + dur);
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + (o.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g);
    let out = g;
    if (o.pan) { const p = ctx.createStereoPanner(); p.pan.value = o.pan; g.connect(p); out = p; }
    out.connect(o.dest || sfxBus);
    src.start(t0, Math.random() * 1.5); src.stop(t0 + dur + 0.05);
    src.onended = () => { try { out.disconnect(); } catch (e) {} };
  }

  /* ---------- instruments for music ---------- */
  function playInst(inst, midi, t, dur, vol) {
    const f = mtof(midi);
    const D = songBus;
    switch (inst) {
      case 'pulse':
        tone('pulse', f, t, dur + 0.08, vol * 0.16, { attack: 0.006, hold: dur * 0.6, dest: D, send: true, lp: 4200 });
        tone('triangle', f * 2, t, dur * 0.6 + 0.05, vol * 0.04, { dest: D });
        break;
      case 'whistle': {
        const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = f;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 5.8;
        const lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.018, t + Math.min(0.35, dur));
        lfo.connect(lg); lg.connect(osc.frequency);
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol * 0.22, t + 0.04);
        g.gain.setValueAtTime(vol * 0.2, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
        osc.connect(g); g.connect(D); g.connect(reverbSend);
        osc.start(t); lfo.start(t); osc.stop(t + dur + 0.2); lfo.stop(t + dur + 0.2);
        osc.onended = () => { try { g.disconnect(); lg.disconnect(); } catch (e) {} };
        noise(t, 0.06, vol * 0.03, { f0: f * 2, q: 4, dest: D });
        break;
      }
      case 'bell':
        tone('sine', f, t, Math.max(0.6, dur * 2), vol * 0.2, { attack: 0.002, dest: D, send: true });
        tone('sine', f * 2.76, t, 0.35, vol * 0.06, { attack: 0.002, dest: D, send: true });
        tone('sine', f * 5.4, t, 0.12, vol * 0.03, { attack: 0.001, dest: D });
        break;
      case 'bellArp':
        tone('sine', f, t, 0.3, vol * 0.1, { attack: 0.002, dest: D, send: true });
        tone('sine', f * 2.76, t, 0.12, vol * 0.025, { attack: 0.001, dest: D });
        break;
      case 'synth':
        tone('sawtooth', f, t, dur + 0.15, vol * 0.07, { attack: 0.02, hold: dur * 0.7, lp: 2600, q: 2, dest: D, send: true, detune: -9 });
        tone('sawtooth', f, t, dur + 0.15, vol * 0.07, { attack: 0.02, hold: dur * 0.7, lp: 2600, q: 2, dest: D, send: true, detune: 9 });
        tone('square', f / 2, t, dur + 0.1, vol * 0.03, { attack: 0.02, hold: dur * 0.6, lp: 1200, dest: D });
        break;
      case 'saw':
        tone('sawtooth', f, t, dur + 0.05, vol * 0.08, { attack: 0.004, lp: 1800, q: 3, dest: D });
        break;
      case 'pluck':
        tone('triangle', f, t, 0.22, vol * 0.13, { attack: 0.002, dest: D, send: true });
        break;
      case 'tri':
        tone('triangle', f, t, dur + 0.04, vol * 0.33, { attack: 0.004, hold: dur * 0.8, dest: D });
        break;
      case 'funk':
        tone('sawtooth', f, t, Math.min(dur, 0.3) + 0.05, vol * 0.16, { attack: 0.003, lp: 700, q: 6, dest: D });
        tone('sine', f, t, dur + 0.05, vol * 0.22, { attack: 0.003, hold: dur * 0.6, dest: D });
        break;
      case 'pad': {
        tone('sawtooth', f, t, dur + 0.6, vol * 0.022, { attack: 0.25, hold: dur * 0.75, lp: 1100, dest: D, send: true, detune: -7 });
        tone('sawtooth', f, t, dur + 0.6, vol * 0.022, { attack: 0.25, hold: dur * 0.75, lp: 1100, dest: D, send: true, detune: 7 });
        break;
      }
      default:
        tone('square', f, t, dur, vol * 0.1, { dest: D });
    }
  }
  function drum(kind, t, accent) {
    const D = songBus, a = accent ? 1.3 : 1;
    if (kind === 'k') {
      tone('sine', 150, t, 0.32, 0.9 * a, { f1: 42, glide: 0.12, attack: 0.002, dest: D });
      noise(t, 0.02, 0.15, { type: 'highpass', f0: 3000, dest: D });
    } else if (kind === 's') {
      noise(t, 0.16, 0.38 * a, { type: 'highpass', f0: 1400, q: 0.6, dest: D });
      tone('triangle', 200, t, 0.09, 0.3 * a, { f1: 150, dest: D });
    } else if (kind === 'h') {
      noise(t, 0.04, 0.12 * a, { type: 'highpass', f0: 8000, q: 0.5, dest: D });
    } else if (kind === 'o') {
      noise(t, 0.22, 0.12 * a, { type: 'highpass', f0: 7000, q: 0.5, dest: D });
    } else if (kind === 'c') {
      noise(t, 1.4, 0.18, { type: 'highpass', f0: 5000, q: 0.4, dest: D });
    }
  }

  /* ---------- music sequencer ---------- */
  const Music = { song: null, name: null, step: 0, next: 0, timer: null, tempo: 1, compiled: null, duck: 1 };
  function compile(song) {
    const bars = song.bars.map(([ch, lead, drumKey]) => {
      const chords = ch.split('|').map(parseChord);
      const tokens = lead.trim().split(/\s+/);
      const notes = [];
      for (let i = 0; i < tokens.length; i++) {
        const tk = tokens[i];
        if (tk === '-' || tk === '.') continue;
        let len = 1;
        while (i + len < tokens.length && tokens[i + len] === '-') len++;
        notes.push({ step: i, midi: noteToMidi(tk), len });
      }
      return { chords, notes, drums: song.drums[drumKey || 'main'] };
    });
    const bass = song.bassPat ? song.bassPat.split(/\s+/) : null;
    const arp = song.arpPat ? song.arpPat.split(/\s+/) : null;
    return { bars, bass, arp };
  }
  function chordAt(bar, step) { return bar.chords.length > 1 && step >= 8 ? bar.chords[1] : bar.chords[0]; }
  function bassNote(ch, tk) {
    const r = 36 + ch.root;
    switch (tk) {
      case 'R': return r; case '3': return r + ch.iv[1]; case '5': return r + ch.iv[2];
      case '8': return r + 12; case '7': return r + (ch.iv[3] || 10); case 'L': return r - 5;
    }
    return null;
  }
  function arpNote(ch, tk) {
    const b = 60 + ch.root;
    const iv = ch.iv;
    switch (tk) {
      case '1': return b + iv[0]; case '3': return b + iv[1]; case '5': return b + iv[2];
      case '7': return b + (iv[3] != null ? iv[3] : 12); case '8': return b + 12;
      case '10': return b + 12 + iv[1]; case '12': return b + 12 + iv[2];
    }
    return null;
  }
  function scheduleStep() {
    const song = Music.song, C = Music.compiled;
    const stepDur = 60 / (song.bpm * Music.tempo) / 4;
    const barIdx = Math.floor(Music.step / 16) % C.bars.length;
    const s = Music.step % 16;
    const bar = C.bars[barIdx];
    const t = Music.next;
    const ch = chordAt(bar, s);
    // lead
    for (const n of bar.notes) if (n.step === s && n.midi != null) playInst(song.lead, n.midi, t, n.len * stepDur, song.leadVol || 0.8);
    // bass
    if (C.bass) {
      const tk = C.bass[s];
      if (tk && tk !== '.' && tk !== '-') {
        let len = 1; while (s + len < 16 && C.bass[s + len] === '-') len++;
        const m = bassNote(ch, tk);
        if (m != null) playInst(song.bass, m, t, len * stepDur * 0.9, 0.8);
      }
    }
    // arp
    if (C.arp) {
      const tk = C.arp[s];
      if (tk && tk !== '.' && tk !== '-') { const m = arpNote(ch, tk); if (m != null) playInst(song.arpInst, m + 12, t, stepDur, 0.55); }
    }
    // pad at chord changes
    if (song.pad && (s === 0 || (s === 8 && bar.chords.length > 1))) {
      const len = bar.chords.length > 1 ? 8 : 16;
      for (const iv of ch.iv.slice(0, 3)) playInst('pad', 55 + ((ch.root + iv - 7 + 24) % 12), t, len * stepDur, 0.9);
    }
    // drums
    const d = bar.drums;
    if (d) for (const k of ['k', 's', 'h']) {
      const c = d[k][s];
      if (c && c !== '.') drum(c === 'o' ? 'o' : k, t, c === 'X');
    }
    if (s === 0 && barIdx === 0 && Music.step > 0) drum('c', t);
    Music.next += stepDur;
    Music.step++;
  }
  function tick() {
    if (!ctx || !Music.song) return;
    if (Music.next < ctx.currentTime - 0.3) Music.next = ctx.currentTime + 0.05; // resync after a stall
    while (Music.next < ctx.currentTime + 0.14) scheduleStep();
  }
  api.music = function (name, opts = {}) {
    if (!ctx) { Music.pending = name; return; }
    if (Music.name === name && !opts.restart) return;
    Music.name = name;
    Music.song = SONGS[name] || null;
    Music.compiled = Music.song ? compile(Music.song) : null;
    Music.step = 0; Music.tempo = opts.tempo || 1;
    if (Music.song) songBus.gain.setTargetAtTime(Music.song.gain || 1, ctx.currentTime, 0.02);
    Music.next = ctx.currentTime + 0.08;
    if (!Music.timer) Music.timer = setInterval(tick, 25);
  };
  api.stopMusic = function () { Music.song = null; Music.name = null; };
  api.musicTempo = function (m) { Music.tempo = m; };
  api.musicName = () => Music.name;
  api.duckMusic = function (amount, sec) {
    if (!ctx) return;
    const g = musicBus.gain, now = ctx.currentTime, base = Settings.music * 0.5;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(base * amount, now + 0.05);
    g.setValueAtTime(base * amount, now + sec);
    g.linearRampToValueAtTime(base, now + sec + 0.4);
  };
  api.jingle = function (name) {
    if (!ctx) return;
    const j = JINGLES[name]; if (!j) return;
    let t = ctx.currentTime + 0.03;
    const beat = 60 / j.bpm / 2;
    let total = 0;
    for (const [n, b] of j.notes) total += b * beat;
    api.duckMusic(0.15, total);
    for (const [n, b] of j.notes) {
      const m = noteToMidi(n), d = b * beat;
      if (j.inst === 'saw') tone('sawtooth', mtof(m), t, d + 0.05, 0.12, { lp: 1500, hold: d * 0.7, dest: sfxBus });
      else {
        tone('pulse', mtof(m), t, d + 0.1, 0.14, { hold: d * 0.7, dest: sfxBus, lp: 5000 });
        tone('triangle', mtof(m - 12), t, d + 0.1, 0.12, { hold: d * 0.7, dest: sfxBus });
      }
      t += d;
    }
  };
  api.resumePending = function () { if (Music.pending) { const p = Music.pending; Music.pending = null; api.music(p); } };

  /* ---------- sound effects ---------- */
  const T = () => ctx.currentTime + 0.005;
  const S = {
    menuMove() { tone('triangle', 740, T(), 0.06, 0.12); },
    menuSelect() { const t = T(); tone('pulse', 880, t, 0.07, 0.1); tone('pulse', 1320, t + 0.06, 0.12, 0.1); },
    menuBack() { const t = T(); tone('triangle', 660, t, 0.07, 0.12); tone('triangle', 440, t + 0.06, 0.1, 0.12); },
    count(go) {
      const t = T();
      if (go) { tone('pulse', 880, t, 0.75, 0.18, { hold: 0.4 }); tone('triangle', 1760, t, 0.6, 0.06); }
      else tone('pulse', 440, t, 0.3, 0.16, { hold: 0.15 });
    },
    itemBox(pan) {
      const t = T(), notes = [1568, 2093, 2637, 3136];
      notes.forEach((f, i) => tone('sine', f * rand(0.98, 1.02), t + i * 0.035, 0.22, 0.1, { pan }));
      noise(t, 0.12, 0.15, { type: 'highpass', f0: 5000, pan });
    },
    rouletteTick() { tone('square', 1900, T(), 0.03, 0.035); },
    itemGet() { const t = T(); tone('triangle', 1320, t, 0.1, 0.16); tone('triangle', 1760, t + 0.08, 0.2, 0.16); },
    coin(pan) { const t = T(); tone('square', 988, t, 0.07, 0.11, { pan, lp: 5000 }); tone('square', 1319, t + 0.065, 0.28, 0.11, { pan, lp: 5000 }); },
    boost(strength = 1) {
      const t = T();
      noise(t, 0.55, 0.3 * strength, { f0: 350, f1: 3200, q: 1.2 });
      tone('sawtooth', 110, t, 0.5, 0.08 * strength, { f1: 360, lp: 1200 });
    },
    miniTurbo(level) {
      const t = T(), base = [0, 400, 520, 640][level] || 400;
      tone('square', base, t, 0.08, 0.06, { f1: base * 1.6 });
      noise(t, 0.35 + level * 0.06, 0.24, { f0: 500, f1: 3000, q: 1.5 });
    },
    sparkUp(level) { tone('triangle', [0, 1200, 1500, 1900][level], T(), 0.06, 0.09); },
    hop() { tone('sine', 240, T(), 0.12, 0.12, { f1: 520 }); },
    land() { tone('sine', 120, T(), 0.15, 0.2, { f1: 50 }); noise(T(), 0.1, 0.08, { type: 'lowpass', f0: 600 }); },
    trick() { const t = T(); tone('sine', 600, t, 0.18, 0.12, { f1: 1300 }); tone('triangle', 900, t + 0.1, 0.2, 0.08, { f1: 1600 }); },
    wall(vol = 1, pan) { const t = T(); noise(t, 0.14, 0.26 * vol, { type: 'lowpass', f0: 900, pan }); tone('sine', 110, t, 0.2, 0.2 * vol, { f1: 40, pan }); },
    bump(pan) { const t = T(); tone('sine', 160, t, 0.16, 0.28, { f1: 60, pan }); noise(t, 0.08, 0.15, { type: 'lowpass', f0: 1500, pan }); },
    spin(pan) { tone('sine', 1100, T(), 0.6, 0.12, { f1: 260, pan }); tone('square', 300, T(), 0.25, 0.05, { f1: 120, lp: 900, pan }); },
    hit(pan) {
      const t = T();
      tone('square', 220, t, 0.25, 0.12, { f1: 70, lp: 1500, pan });
      noise(t, 0.3, 0.3, { type: 'lowpass', f0: 2500, f1: 300, pan });
      tone('sine', 900, t + 0.05, 0.5, 0.1, { f1: 300, pan });
    },
    explosion(vol = 1, pan) {
      const t = T();
      noise(t, 1.1, 0.42 * vol, { type: 'lowpass', f0: 3500, f1: 120, q: 0.5, pan });
      tone('sine', 90, t, 0.8, 0.34 * vol, { f1: 28, pan });
    },
    throw(pan) { noise(T(), 0.22, 0.2, { f0: 1500, f1: 500, q: 2, pan }); },
    drop(pan) { const t = T(); noise(t, 0.1, 0.18, { type: 'lowpass', f0: 800, pan }); tone('sine', 320, t, 0.1, 0.08, { f1: 160, pan }); },
    launch(pan) { const t = T(); noise(t, 0.5, 0.25, { type: 'highpass', f0: 800, f1: 3000, pan }); tone('sawtooth', 200, t, 0.45, 0.06, { f1: 700, lp: 2000, pan }); },
    warn() { tone('square', 1046, T(), 0.07, 0.07); },
    ricochet(pan) { tone('triangle', 1400, T(), 0.1, 0.07, { f1: 900, pan }); },
    lightning() {
      const t = T();
      for (let i = 0; i < 6; i++) noise(t + i * 0.05 + Math.random() * 0.03, 0.08, 0.35, { type: 'highpass', f0: 2500 });
      tone('sine', 55, t, 1.2, 0.45, { f1: 30 });
      tone('sawtooth', 1200, t, 0.5, 0.06, { f1: 200, lp: 3000 });
    },
    shrink() { tone('square', 900, T(), 0.4, 0.06, { f1: 2000, lp: 3000 }); },
    star() { const t = T(); [1047, 1319, 1568, 2093].forEach((f, i) => tone('triangle', f, t + i * 0.05, 0.2, 0.1)); },
    respawn() { tone('sawtooth', 300, T(), 0.9, 0.05, { f1: 900, lp: 1500 }); },
    rocket() { const t = T(); noise(t, 0.8, 0.4, { f0: 300, f1: 4000, q: 1 }); tone('sawtooth', 90, t, 0.7, 0.12, { f1: 420, lp: 1500 }); },
    burnout() { noise(T(), 0.9, 0.25, { type: 'lowpass', f0: 2500, f1: 500 }); },
    cheer() {
      const t = T();
      for (let i = 0; i < 4; i++) noise(t + i * 0.18, 1.6, 0.12, { f0: 900 + i * 300, q: 0.7, attack: 0.3 });
      for (let i = 0; i < 10; i++) tone('sine', rand(1600, 2600), t + rand(0, 1.2), 0.15, 0.02, { f1: rand(2000, 3200) });
    },
    splash() { noise(T(), 0.7, 0.35, { type: 'lowpass', f0: 2500, f1: 300 }); },
    fuse() { noise(T(), 0.05, 0.05, { type: 'highpass', f0: 6000 }); },
  };
  api.sfx = function (name, ...args) {
    if (!ctx || !S[name]) return;
    try { S[name](...args); } catch (e) { /* audio must never break the game */ }
  };

  /* ---------- continuous voices ---------- */
  class EngineVoice {
    constructor(baseVol) {
      this.baseVol = baseVol;
      this.o1 = ctx.createOscillator(); this.o1.type = 'sawtooth';
      this.o2 = ctx.createOscillator(); this.o2.setPeriodicWave(pulseWave);
      this.o3 = ctx.createOscillator(); this.o3.type = 'sine';
      this.f = ctx.createBiquadFilter(); this.f.type = 'lowpass'; this.f.frequency.value = 500; this.f.Q.value = 2;
      this.g = ctx.createGain(); this.g.gain.value = 0;
      this.p = ctx.createStereoPanner();
      this.o1.connect(this.f); this.o2.connect(this.f); this.o3.connect(this.g);
      this.f.connect(this.g); this.g.connect(this.p); this.p.connect(sfxBus);
      const t = ctx.currentTime;
      this.o1.frequency.value = 60; this.o2.frequency.value = 30; this.o3.frequency.value = 60;
      this.o1.start(t); this.o2.start(t); this.o3.start(t);
    }
    set(speedRatio, throttle, boost, vol, pan) {
      const t = ctx.currentTime;
      const f = 46 + speedRatio * 112 + throttle * 10 + boost * 28 + Math.sin(t * 31) * 1.5;
      this.o1.frequency.setTargetAtTime(f, t, 0.06);
      this.o2.frequency.setTargetAtTime(f * 0.5, t, 0.06);
      this.o3.frequency.setTargetAtTime(f, t, 0.06);
      this.f.frequency.setTargetAtTime(380 + speedRatio * 1300 + throttle * 300 + boost * 600, t, 0.08);
      this.g.gain.setTargetAtTime(this.baseVol * 0.11 * vol * (0.55 + 0.45 * Math.max(throttle, speedRatio)), t, 0.08);
      this.p.pan.setTargetAtTime(clamp(pan || 0, -1, 1), t, 0.08);
    }
    silence() { if (ctx) this.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05); }
    stop() {
      const t = ctx.currentTime;
      this.g.gain.setTargetAtTime(0, t, 0.05);
      [this.o1, this.o2, this.o3].forEach((o) => o.stop(t + 0.3));
      setTimeout(() => { try { this.p.disconnect(); } catch (e) {} }, 500);
    }
  }
  class LoopNoise {
    constructor(type, freq, q) {
      this.src = ctx.createBufferSource(); this.src.buffer = noiseBuf; this.src.loop = true;
      this.f = ctx.createBiquadFilter(); this.f.type = type; this.f.frequency.value = freq; this.f.Q.value = q;
      this.g = ctx.createGain(); this.g.gain.value = 0;
      this.src.connect(this.f); this.f.connect(this.g); this.g.connect(sfxBus);
      this.src.start();
    }
    set(vol, freq) {
      const t = ctx.currentTime;
      this.g.gain.setTargetAtTime(vol, t, 0.05);
      if (freq) this.f.frequency.setTargetAtTime(freq, t, 0.05);
    }
    stop() { const t = ctx.currentTime; this.g.gain.setTargetAtTime(0, t, 0.03); this.src.stop(t + 0.3); setTimeout(() => { try { this.g.disconnect(); } catch (e) {} }, 500); }
  }
  api.engine = (vol) => (ctx ? new EngineVoice(vol) : null);
  api.loopNoise = (type, freq, q) => (ctx ? new LoopNoise(type, freq, q) : null);
  return api;
})();
