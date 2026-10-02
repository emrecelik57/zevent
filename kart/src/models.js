/* ============================================================
   3D models built from primitives: karts, characters, items, decor
   ============================================================ */
const CHARACTERS = [
  { id: 'roux', name: 'Roux', species: 'Renard', kart: 0xff7a1a, accent: 0xffffff, outfit: 0x2b4cd8, fur: 0xf07a24, fur2: 0xfff3e0,
    stats: { speed: 3, accel: 3, handling: 3, weight: 3 }, blurb: 'Le pilote polyvalent. Aucun point faible, aucune excuse.' },
  { id: 'bambou', name: 'Bambou', species: 'Panda', kart: 0x3cc35a, accent: 0xf4f4f4, outfit: 0xd8322b, fur: 0xf6f6f2, fur2: 0x1e1e24,
    stats: { speed: 5, accel: 1, handling: 2, weight: 4 }, blurb: 'Lent à démarrer, mais une fois lancé, rien ne l’arrête.' },
  { id: 'gribouille', name: 'Gribouille', species: 'Grenouille', kart: 0xffd21f, accent: 0x2e8b3a, outfit: 0xff9f1a, fur: 0x57c84d, fur2: 0xc9f29b,
    stats: { speed: 2, accel: 5, handling: 4, weight: 1 }, blurb: 'Bondit hors des virages. Idéal pour se relever après un choc.' },
  { id: 'pompon', name: 'Pompon', species: 'Lapin', kart: 0xff6fb5, accent: 0xffffff, outfit: 0x7c4dff, fur: 0xf7f2f5, fur2: 0xffb3cf,
    stats: { speed: 2, accel: 4, handling: 5, weight: 1 }, blurb: 'La meilleure maniabilité du plateau. Les épingles, c’est son jardin.' },
  { id: 'boulon', name: 'Boulon', species: 'Robot', kart: 0x2f7bff, accent: 0xd9e2ec, outfit: 0xc9d2dc, fur: 0xc9d2dc, fur2: 0x29e4ff,
    stats: { speed: 4, accel: 2, handling: 3, weight: 3 }, blurb: 'Calculé pour la ligne droite. Vitesse de pointe élevée.' },
  { id: 'glacon', name: 'Glaçon', species: 'Pingouin', kart: 0x35d4e8, accent: 0xffffff, outfit: 0x1f2230, fur: 0x1f2230, fur2: 0xffffff,
    stats: { speed: 3, accel: 4, handling: 3, weight: 2 }, blurb: 'Vif et léger, à l’aise sur la glace comme sur le bitume.' },
  { id: 'croc', name: 'Croc', species: 'Dino', kart: 0x9b5cff, accent: 0xffd02b, outfit: 0x2fa84f, fur: 0x8f5bd8, fur2: 0xd6bfff,
    stats: { speed: 4, accel: 2, handling: 1, weight: 5 }, blurb: 'Poids lourd. Bouscule tout le monde dans les mêlées.' },
  { id: 'moustache', name: 'Moustache', species: 'Chat', kart: 0xef3340, accent: 0xffd02b, outfit: 0x1f2a44, fur: 0xf6b73c, fur2: 0xfff1d6,
    stats: { speed: 3, accel: 3, handling: 4, weight: 2 }, blurb: 'Agile et nerveux. Retombe toujours sur ses roues.' },
];

const Mats = {
  cache: new Map(),
  shared: new Set(),
  std(color, o = {}) {
    const key = 's' + color + JSON.stringify(o);
    if (o.unique || !this.cache.has(key)) {
      const m = new THREE.MeshStandardMaterial({
        color, roughness: o.r ?? 0.55, metalness: o.m ?? 0, flatShading: !!o.flat,
        emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1, transparent: !!o.t, opacity: o.op ?? 1,
        vertexColors: !!o.vc, side: o.ds ? THREE.DoubleSide : THREE.FrontSide,
      });
      if (o.unique) return m;
      this.cache.set(key, m); this.shared.add(m);
    }
    return this.cache.get(key);
  },
  lam(color, o = {}) {
    const key = 'l' + color + JSON.stringify(o);
    if (!this.cache.has(key)) {
      this.cache.set(key, this._share(new THREE.MeshLambertMaterial({
        color, flatShading: !!o.flat, vertexColors: !!o.vc, emissive: o.e ?? 0x000000,
        transparent: !!o.t, opacity: o.op ?? 1, side: o.ds ? THREE.DoubleSide : THREE.FrontSide,
      })));
    }
    return this.cache.get(key);
  },
  _share(m) { this.shared.add(m); return m; },
  basic(color, o = {}) {
    const key = 'b' + color + JSON.stringify(o);
    if (!this.cache.has(key)) {
      this.cache.set(key, this._share(new THREE.MeshBasicMaterial({
        color, transparent: !!o.t, opacity: o.op ?? 1, depthWrite: o.dw ?? !o.t,
        blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending, side: o.ds ? THREE.DoubleSide : THREE.FrontSide, fog: o.fog ?? true,
      })));
    }
    return this.cache.get(key);
  },
};

/* ---------- geometry helpers ---------- */
const G = {
  sphere: (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h),
  box: (x, y, z) => new THREE.BoxGeometry(x, y, z),
  cyl: (rt, rb, h, s = 16) => new THREE.CylinderGeometry(rt, rb, h, s),
  cone: (r, h, s = 12) => new THREE.ConeGeometry(r, h, s),
  capsule: (r, l, cs = 6, rs = 12) => new THREE.CapsuleGeometry(r, l, cs, rs),
  torus: (r, t, rs = 8, ts = 20, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc),
};
function mesh(geo, mat, x = 0, y = 0, z = 0, parent = null, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = false;
  if (parent) parent.add(m);
  return m;
}
function roundedBoxGeo(w, h, d, r, seg = 3) {
  const s = new THREE.Shape();
  const x = -w / 2 + r, y = -h / 2 + r, ww = w - 2 * r, hh = h - 2 * r;
  s.moveTo(x, y - r);
  s.lineTo(x + ww, y - r); s.quadraticCurveTo(x + ww + r, y - r, x + ww + r, y);
  s.lineTo(x + ww + r, y + hh); s.quadraticCurveTo(x + ww + r, y + hh + r, x + ww, y + hh + r);
  s.lineTo(x, y + hh + r); s.quadraticCurveTo(x - r, y + hh + r, x - r, y + hh);
  s.lineTo(x - r, y); s.quadraticCurveTo(x - r, y - r, x, y - r);
  const geo = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelSegments: seg, steps: 1, bevelSize: r * 0.98, bevelThickness: r, curveSegments: seg * 2 });
  geo.translate(0, 0, -(d - 2 * r) / 2);
  geo.computeVertexNormals();
  return geo;
}
/* capsule oriented between two points */
function limb(a, b, r, mat, parent) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(G.capsule(r, Math.max(0.01, len - 2 * r * 0.5), 4, 10), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = true;
  parent.add(m);
  return m;
}
/* tapered tube along a polyline — used for bananas, whiskers, horns */
function taperTube(pts, radii, radial = 10) {
  const pos = [], idx = [];
  const n = pts.length;
  const up = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const t = new THREE.Vector3().subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
    let nrm = new THREE.Vector3().crossVectors(t, up);
    if (nrm.lengthSq() < 1e-6) nrm.set(1, 0, 0);
    nrm.normalize();
    const bin = new THREE.Vector3().crossVectors(t, nrm).normalize();
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * TAU;
      const v = new THREE.Vector3().copy(p).addScaledVector(nrm, Math.cos(a) * radii[i]).addScaledVector(bin, Math.sin(a) * radii[i]);
      pos.push(v.x, v.y, v.z);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < radial; j++) {
    const a = i * radial + j, b = i * radial + ((j + 1) % radial), c = a + radial, d = b + radial;
    idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}
/* merge several geometries into one non-indexed geometry with vertex colours */
function mergeColored(parts) {
  let total = 0;
  const prepared = parts.map(([geo, color, matrix]) => {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (matrix) g.applyMatrix4(matrix);
    if (!g.attributes.normal) g.computeVertexNormals();
    total += g.attributes.position.count;
    return [g, new THREE.Color(color)];
  });
  const P = new Float32Array(total * 3), N = new Float32Array(total * 3), C = new Float32Array(total * 3);
  let o = 0;
  for (const [g, col] of prepared) {
    const p = g.attributes.position.array, nn = g.attributes.normal.array;
    P.set(p, o * 3); N.set(nn, o * 3);
    for (let i = 0; i < g.attributes.position.count; i++) { C[(o + i) * 3] = col.r; C[(o + i) * 3 + 1] = col.g; C[(o + i) * 3 + 2] = col.b; }
    o += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  out.setAttribute('color', new THREE.BufferAttribute(C, 3));
  out.computeBoundingSphere();
  return out;
}
const M4 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
  const m = new THREE.Matrix4();
  m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  return m;
};
function jitterGeo(geo, amt, seed) {
  const r = mulberry32(seed);
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position;
  const map = new Map();
  for (let i = 0; i < p.count; i++) {
    const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!map.has(k)) map.set(k, [(r() - 0.5) * amt, (r() - 0.5) * amt, (r() - 0.5) * amt]);
    const d = map.get(k);
    p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]);
  }
  g.computeVertexNormals();
  return g;
}

/* merge the static meshes of a group into one mesh per material class (fewer draw calls).
   Children flagged userData.keep (animated parts) are left untouched. */
const _flatMats = new Map();
function flattenGroup(group) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map(), victims = [];
  const visit = (o) => {
    if (o !== group && o.userData.keep) return;
    if (o.isMesh && o.geometry && o.material && !Array.isArray(o.material)) {
      const m = o.material;
      const plain = m.isMeshStandardMaterial && !m.isMeshPhysicalMaterial && !m.map && !m.transparent && m.emissive.getHex() === 0 && m.side === THREE.FrontSide;
      const key = plain ? `vc|${m.roughness.toFixed(2)}|${m.metalness.toFixed(2)}|${m.flatShading}` : m.uuid;
      if (!buckets.has(key)) buckets.set(key, { plain, mat: m, parts: [], shadow: false });
      const b = buckets.get(key);
      b.parts.push([o.geometry, plain ? m.color.getHex() : 0xffffff, new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)]);
      b.shadow = b.shadow || o.castShadow;
      victims.push(o);
    }
    for (const c of o.children.slice()) visit(c);
  };
  visit(group);
  for (const [key, b] of buckets) {
    if (b.parts.length < 2 && !b.plain) { continue; }
    let geo, mat;
    if (b.plain) {
      geo = mergeColored(b.parts);
      const mk = key;
      if (!_flatMats.has(mk)) _flatMats.set(mk, Mats._share(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: b.mat.roughness, metalness: b.mat.metalness, flatShading: b.mat.flatShading })));
      mat = _flatMats.get(mk);
    } else {
      geo = mergeSameMaterial(b.parts);
      mat = b.mat;
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = b.shadow;
    group.add(mesh);
    for (const [g] of b.parts) { /* geometries are rebuilt; originals released below */ }
    b.done = true;
  }
  for (const o of victims) {
    const b = [...buckets.values()].find((bb) => bb.parts.some((p) => p[0] === o.geometry) && bb.done);
    if (!b) continue;
    o.parent.remove(o);
    o.geometry.dispose();
  }
  return group;
}
function mergeSameMaterial(parts) {
  let total = 0;
  const prepared = parts.map(([geo, , matrix]) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(matrix);
    total += g.attributes.position.count;
    return g;
  });
  const P = new Float32Array(total * 3), N = new Float32Array(total * 3), U = new Float32Array(total * 2);
  let o = 0;
  for (const g of prepared) {
    P.set(g.attributes.position.array, o * 3);
    N.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) U.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  out.computeBoundingSphere();
  return out;
}

/* ---------- characters ---------- */
function addEyes(parent, x, y, z, size, o = {}) {
  const white = Mats.std(0xffffff, { r: 0.25 });
  const pupil = Mats.std(o.pupil ?? 0x161626, { r: 0.2 });
  const shine = Mats.basic(0xffffff);
  const eyes = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(s * x, y, z);
    if (o.tilt) g.rotation.z = -s * o.tilt;
    const w = mesh(G.sphere(size, 16, 12), white, 0, 0, 0, g, false);
    w.scale.set(o.sx ?? 0.9, o.sy ?? 1.15, 0.55);
    const p = mesh(G.sphere(size * 0.56, 12, 10), pupil, s * size * 0.06, -size * 0.05, size * 0.33, g, false);
    p.scale.set(0.9, 1.1, 0.5);
    mesh(G.sphere(size * 0.17, 8, 6), shine, s * size * 0.1 + size * 0.12, size * 0.2, size * 0.5, g, false);
    if (o.lid) {
      const lid = mesh(new THREE.SphereGeometry(size * 1.06, 16, 8, 0, TAU, 0, Math.PI * 0.42), Mats.std(o.lid, { r: 0.6 }), 0, 0, 0, g, false);
      lid.scale.set(0.95, 1.18, 0.62);
      lid.rotation.z = s * 0.35;
    }
    parent.add(g);
    eyes.push(g);
  }
  return eyes;
}
function smile(parent, y, z, w, color = 0x3a1414, arc = Math.PI * 0.8, tube = 0.018) {
  const m = mesh(G.torus(w, tube, 6, 16, arc), Mats.std(color, { r: 0.5 }), 0, y, z, parent, false);
  m.rotation.z = Math.PI + (Math.PI - arc) / 2;
  return m;
}

function buildHead(def) {
  const h = new THREE.Group();
  const fur = Mats.std(def.fur, { r: 0.7 }), fur2 = Mats.std(def.fur2, { r: 0.7 });
  const dark = Mats.std(0x221a1a, { r: 0.4 });
  const pink = Mats.std(0xff8fae, { r: 0.6 });
  switch (def.id) {
    case 'roux': {
      mesh(G.sphere(0.4), fur, 0, 0, 0, h).scale.set(1, 0.92, 0.96);
      mesh(G.sphere(0.2), fur2, 0, -0.11, 0.29, h).scale.set(1.05, 0.72, 1.15);
      for (const s of [-1, 1]) {
        mesh(G.sphere(0.17), fur2, s * 0.22, -0.13, 0.16, h).scale.set(1, 0.8, 1);
        const ear = mesh(G.cone(0.15, 0.36, 4), fur, s * 0.22, 0.38, -0.04, h);
        ear.rotation.set(-0.15, 0, -s * 0.35); ear.scale.z = 0.55;
        const inner = mesh(G.cone(0.09, 0.22, 4), dark, s * 0.215, 0.36, 0.0, h, false);
        inner.rotation.set(-0.15, 0, -s * 0.35); inner.scale.z = 0.4;
      }
      mesh(G.sphere(0.065), dark, 0, -0.05, 0.52, h);
      addEyes(h, 0.14, 0.07, 0.33, 0.1);
      smile(h, -0.16, 0.42, 0.07);
      break;
    }
    case 'bambou': {
      mesh(G.sphere(0.42), fur, 0, 0, 0, h).scale.set(1.04, 0.94, 0.96);
      for (const s of [-1, 1]) {
        mesh(G.sphere(0.14), fur2, s * 0.3, 0.3, -0.04, h).scale.set(1, 1, 0.6);
        const patch = mesh(G.sphere(0.12), fur2, s * 0.15, 0.04, 0.33, h, false);
        patch.scale.set(0.95, 1.3, 0.45); patch.rotation.z = s * 0.5;
      }
      mesh(G.sphere(0.17), fur, 0, -0.13, 0.3, h).scale.set(1.1, 0.7, 0.9);
      mesh(G.sphere(0.06), fur2, 0, -0.08, 0.45, h).scale.set(1.3, 0.8, 0.8);
      addEyes(h, 0.15, 0.05, 0.38, 0.07);
      smile(h, -0.19, 0.42, 0.05);
      break;
    }
    case 'gribouille': {
      mesh(G.sphere(0.4), fur, 0, 0, 0, h).scale.set(1.18, 0.78, 1);
      for (const s of [-1, 1]) {
        mesh(G.sphere(0.16), fur, s * 0.2, 0.25, 0.12, h);
        mesh(G.sphere(0.08), pink, s * 0.33, -0.08, 0.27, h, false).scale.set(1, 0.6, 0.4);
      }
      addEyes(h, 0.2, 0.28, 0.24, 0.12, { sx: 1, sy: 1 });
      smile(h, -0.05, 0.36, 0.2, 0x7a1d2a, Math.PI * 0.75, 0.025);
      mesh(G.sphere(0.3), fur2, 0, -0.14, 0.12, h).scale.set(1.2, 0.5, 1);
      break;
    }
    case 'pompon': {
      mesh(G.sphere(0.4), fur, 0, 0, 0, h).scale.set(1, 0.95, 0.95);
      for (const s of [-1, 1]) {
        const ear = mesh(G.capsule(0.085, 0.42, 4, 10), fur, s * 0.14, 0.58, -0.06, h);
        ear.rotation.z = -s * 0.16; ear.scale.set(1, 1, 0.65);
        const inner = mesh(G.capsule(0.05, 0.34, 4, 8), pink, s * 0.145, 0.57, -0.015, h, false);
        inner.rotation.z = -s * 0.16; inner.scale.set(1, 1, 0.4);
        mesh(G.sphere(0.07), pink, s * 0.24, -0.1, 0.3, h, false).scale.set(1, 0.6, 0.3);
      }
      mesh(G.sphere(0.05), pink, 0, -0.05, 0.4, h).scale.set(1.3, 0.9, 0.9);
      mesh(G.box(0.05, 0.07, 0.02), Mats.std(0xffffff), -0.028, -0.17, 0.37, h, false);
      mesh(G.box(0.05, 0.07, 0.02), Mats.std(0xffffff), 0.028, -0.17, 0.37, h, false);
      addEyes(h, 0.15, 0.06, 0.33, 0.1, { pupil: 0x3b1a4a });
      break;
    }
    case 'boulon': {
      mesh(roundedBoxGeo(0.72, 0.62, 0.66, 0.14), Mats.std(0xc9d2dc, { r: 0.3, m: 0.7 }), 0, 0, 0, h);
      mesh(roundedBoxGeo(0.56, 0.3, 0.1, 0.06), Mats.std(0x10131f, { r: 0.15, m: 0.3 }), 0, 0.02, 0.31, h, false);
      const eyeM = Mats.std(0x29e4ff, { e: 0x29e4ff, ei: 1.6 });
      for (const s of [-1, 1]) {
        mesh(G.capsule(0.045, 0.06, 3, 8), eyeM, s * 0.12, 0.03, 0.36, h, false).rotation.z = Math.PI / 2;
        const bolt = mesh(G.cyl(0.09, 0.09, 0.08, 12), Mats.std(0x8a96a8, { r: 0.3, m: 0.8 }), s * 0.39, 0, 0, h);
        bolt.rotation.z = Math.PI / 2;
      }
      mesh(G.cyl(0.02, 0.02, 0.28), Mats.std(0x8a96a8, { m: 0.8, r: 0.3 }), 0, 0.42, 0, h);
      mesh(G.sphere(0.06), Mats.std(0xff3b3b, { e: 0xff2020, ei: 1.2 }), 0, 0.58, 0, h);
      mesh(G.box(0.22, 0.03, 0.02), eyeM, 0, -0.18, 0.33, h, false);
      break;
    }
    case 'glacon': {
      mesh(G.sphere(0.4), fur, 0, 0, 0, h).scale.set(1, 0.98, 0.95);
      mesh(G.sphere(0.32), fur2, 0, -0.05, 0.12, h, false).scale.set(1.05, 0.92, 0.9);
      const beak = mesh(G.cone(0.08, 0.2, 10), Mats.std(0xffa31a, { r: 0.5 }), 0, -0.08, 0.46, h);
      beak.rotation.x = Math.PI / 2; beak.scale.set(1.3, 1, 0.7);
      for (const s of [-1, 1]) mesh(G.sphere(0.06), pink, s * 0.22, -0.12, 0.3, h, false).scale.set(1, 0.6, 0.3);
      addEyes(h, 0.13, 0.08, 0.34, 0.09);
      break;
    }
    case 'croc': {
      mesh(G.sphere(0.38), fur, 0, 0.02, 0, h).scale.set(1, 0.95, 1);
      mesh(G.sphere(0.27), fur2, 0, -0.1, 0.28, h).scale.set(1.0, 0.7, 1.15);
      for (const s of [-1, 1]) {
        mesh(G.sphere(0.03), dark, s * 0.08, -0.03, 0.57, h, false);
        const tooth = mesh(G.cone(0.03, 0.07, 6), Mats.std(0xffffff), s * 0.12, -0.25, 0.48, h, false);
        tooth.rotation.x = Math.PI;
      }
      const spikeM = Mats.std(0xffb020, { r: 0.5 });
      [[0.36, -0.05, 0.13], [0.3, -0.25, 0.11], [0.14, -0.38, 0.09]].forEach(([y, z, r]) => {
        const sp = mesh(G.cone(r, r * 2.2, 6), spikeM, 0, y, z, h); sp.rotation.x = -0.35;
      });
      addEyes(h, 0.15, 0.14, 0.27, 0.1, { tilt: 0.15 });
      smile(h, -0.17, 0.46, 0.1, 0x3a1430);
      break;
    }
    case 'moustache': {
      mesh(G.sphere(0.4), fur, 0, 0, 0, h).scale.set(1.06, 0.92, 0.95);
      const stripe = Mats.std(0xd07a1a, { r: 0.7 });
      for (const a of [-0.2, 0, 0.2]) { const st = mesh(G.box(0.05, 0.03, 0.3), stripe, a, 0.36, -0.02, h, false); st.rotation.x = 0.15; }
      for (const s of [-1, 1]) {
        const ear = mesh(G.cone(0.16, 0.3, 3), fur, s * 0.25, 0.33, -0.02, h);
        ear.rotation.set(0, s * 0.5, -s * 0.3);
        const inner = mesh(G.cone(0.09, 0.18, 3), pink, s * 0.245, 0.32, 0.03, h, false);
        inner.rotation.set(0, s * 0.5, -s * 0.3);
        mesh(G.sphere(0.1), fur2, s * 0.08, -0.13, 0.32, h).scale.set(1, 0.8, 0.8);
        for (let k = -1; k <= 1; k++) {
          const w = mesh(G.cyl(0.006, 0.006, 0.3, 4), dark, s * 0.28, -0.1 + k * 0.04, 0.33, h, false);
          w.rotation.z = Math.PI / 2 + k * 0.15 * s;
        }
      }
      mesh(G.sphere(0.045), pink, 0, -0.07, 0.4, h).scale.set(1.3, 0.8, 0.8);
      addEyes(h, 0.15, 0.07, 0.32, 0.1, { pupil: 0x1d3a10, sx: 0.85 });
      break;
    }
  }
  h.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return h;
}

function buildDriver(def) {
  const g = new THREE.Group();
  const outfit = Mats.std(def.outfit, { r: 0.6, m: def.id === 'boulon' ? 0.6 : 0 });
  const glove = Mats.std(def.id === 'boulon' ? 0x8a96a8 : 0xffffff, { r: 0.5 });
  const torso = mesh(G.capsule(0.27, 0.22, 6, 14), outfit, 0, 0.82, -0.32, g);
  torso.scale.set(1.05, 1, 0.9);
  if (def.id === 'glacon') {
    mesh(G.sphere(0.22), Mats.std(0xffffff, { r: 0.7 }), 0, 0.8, -0.15, g).scale.set(1, 1.2, 0.7);
    mesh(G.torus(0.2, 0.06, 8, 18), Mats.std(0xe8392f, { r: 0.8 }), 0, 1.08, -0.3, g).rotation.x = Math.PI / 2;
  } else if (def.id === 'gribouille') {
    mesh(G.sphere(0.2), Mats.std(def.fur2, { r: 0.7 }), 0, 0.82, -0.14, g).scale.set(1, 1.1, 0.6);
  } else if (def.id === 'moustache') {
    mesh(G.torus(0.25, 0.03, 6, 20), Mats.std(0xffd02b), 0, 0.86, -0.32, g).rotation.x = Math.PI / 2;
  } else if (def.id === 'roux') {
    mesh(G.torus(0.21, 0.055, 8, 18), Mats.std(0xffffff, { r: 0.8 }), 0, 1.07, -0.3, g).rotation.x = Math.PI / 2;
  }
  const head = buildHead(def);
  head.position.set(0, 1.42, -0.24);
  g.add(head);
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Vector3(s * 0.27, 1.0, -0.3);
    const hand = new THREE.Vector3(s * 0.17, 0.86, 0.26);
    const elbow = new THREE.Vector3(s * 0.34, 0.83, -0.02);
    arms.push(limb(sh, elbow, 0.075, outfit, g), limb(elbow, hand, 0.07, outfit, g));
    mesh(G.sphere(0.09), glove, hand.x, hand.y, hand.z, g);
  }
  if (def.id === 'glacon' || def.id === 'croc' || def.id === 'moustache') {
    // tail
    const tailM = Mats.std(def.fur, { r: 0.7 });
    const tail = mesh(G.capsule(def.id === 'croc' ? 0.1 : 0.05, 0.3, 4, 8), tailM, 0, 0.6, -0.72, g);
    tail.rotation.x = def.id === 'croc' ? 1.2 : 0.5;
  }
  return { group: g, head };
}

/* ---------- kart ---------- */
function buildKart(def, number = 1, opts = {}) {
  const root = new THREE.Group();     // positioned/rotated by physics
  const body = new THREE.Group();     // visual tilt / drift yaw / hop
  root.add(body);
  const paint = new THREE.MeshPhysicalMaterial({ color: def.kart, roughness: 0.28, metalness: 0.15, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  const accent = new THREE.MeshStandardMaterial({ color: def.accent, roughness: 0.4, metalness: 0.1 });
  const darkM = Mats.std(0x24252e, { r: 0.6 });
  const metal = Mats.std(0xc7ccd6, { r: 0.22, m: 0.9 });
  const seatM = Mats.std(0x2b2d3a, { r: 0.75 });

  // chassis
  const shell = mesh(G.sphere(1, 28, 18), paint, 0, 0.42, 0.02, body);
  shell.scale.set(0.62, 0.3, 1.05);
  const nose = mesh(G.sphere(1, 20, 14), paint, 0, 0.38, 0.78, body);
  nose.scale.set(0.5, 0.26, 0.5);
  const noseTip = mesh(G.sphere(1, 18, 12), accent, 0, 0.36, 1.02, body);
  noseTip.scale.set(0.42, 0.17, 0.2);
  mesh(G.box(1.25, 0.08, 1.95), darkM, 0, 0.17, 0.02, body);
  const bumper = mesh(G.capsule(0.09, 1.05, 4, 10), darkM, 0, 0.24, 1.16, body);
  bumper.rotation.z = Math.PI / 2;
  const rbumper = mesh(G.capsule(0.08, 1.2, 4, 10), accent, 0, 0.26, -1.06, body);
  rbumper.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) {
    const pod = mesh(G.sphere(1, 16, 12), accent, s * 0.64, 0.32, 0.02, body);
    pod.scale.set(0.16, 0.15, 0.62);
    const lamp = mesh(G.sphere(0.07, 10, 8), Mats.std(0xfff6c8, { e: 0xfff0a0, ei: 1.2 }), s * 0.26, 0.45, 1.1, body, false);
    lamp.scale.z = 0.5;
  }
  // number roundel on the nose
  const plate = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), new THREE.MeshBasicMaterial({ map: Tex.number(number), transparent: true }));
  plate.position.set(0, 0.57, 0.8); plate.rotation.x = -1.15;
  body.add(plate);
  // seat + engine
  mesh(roundedBoxGeo(0.62, 0.62, 0.16, 0.07), seatM, 0, 0.82, -0.62, body).rotation.x = -0.18;
  mesh(roundedBoxGeo(0.66, 0.3, 0.42, 0.06), Mats.std(0x50535f, { r: 0.4, m: 0.6 }), 0, 0.52, -0.92, body);
  for (let i = 0; i < 3; i++) mesh(G.box(0.6, 0.03, 0.05), metal, 0, 0.7, -0.8 - i * 0.1, body, false);
  const exhausts = [], flames = [];
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x66c8ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const flameCore = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const s of [-1, 1]) {
    const ex = mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.36, 12, 1, true), Mats.std(0x8d929e, { r: 0.35, m: 0.85, ds: true }), s * 0.22, 0.6, -1.14, body);
    ex.rotation.x = Math.PI / 2 - 0.45;
    const hole = mesh(new THREE.CircleGeometry(0.065, 12), Mats.basic(0x0b0b10), s * 0.22, 0.672, -1.3, body, false);
    hole.rotation.x = -0.45 + Math.PI;
    mesh(G.torus(0.07, 0.018, 6, 12), Mats.std(0x3a3a44, { r: 0.4, m: 0.6 }), s * 0.22, 0.675, -1.305, body, false).rotation.x = Math.PI / 2 - 0.45;
    const fl = new THREE.Group();
    fl.position.set(s * 0.22, 0.69, -1.33);
    fl.rotation.x = -Math.PI / 2 - 0.45;
    const c1 = new THREE.Mesh(G.cone(0.13, 0.7, 10), flameMat); c1.position.y = 0.35; c1.rotation.x = Math.PI;
    const c2 = new THREE.Mesh(G.cone(0.07, 0.42, 8), flameCore); c2.position.y = 0.21; c2.rotation.x = Math.PI;
    fl.add(c1, c2); fl.visible = false; fl.scale.setScalar(0.01);
    body.add(fl);
    exhausts.push(ex); flames.push(fl);
  }
  // rear number plate on the engine cover
  const rplate = new THREE.Mesh(new THREE.CircleGeometry(0.15, 20), new THREE.MeshBasicMaterial({ map: Tex.number(number), transparent: true }));
  rplate.position.set(0, 0.56, -1.135); rplate.rotation.y = Math.PI; body.add(rplate);
  mesh(roundedBoxGeo(0.7, 0.12, 0.46, 0.05), paint, 0, 0.72, -0.92, body);
  // spoiler
  const wing = mesh(roundedBoxGeo(1.25, 0.07, 0.34, 0.03), accent, 0, 1.0, -1.02, body);
  wing.rotation.x = 0.12;
  mesh(roundedBoxGeo(1.27, 0.03, 0.12, 0.012), paint, 0, 1.045, -0.92, body).rotation.x = 0.12;
  for (const s of [-1, 1]) mesh(G.box(0.05, 0.36, 0.1), darkM, s * 0.4, 0.82, -1.0, body);
  for (const s of [-1, 1]) mesh(G.box(0.04, 0.2, 0.4), accent, s * 0.63, 1.0, -1.02, body);
  // steering wheel
  const steer = new THREE.Group();
  steer.position.set(0, 0.86, 0.3); steer.rotation.x = -0.9;
  mesh(G.torus(0.16, 0.03, 8, 20), darkM, 0, 0, 0, steer);
  mesh(G.box(0.3, 0.035, 0.03), darkM, 0, 0, 0, steer);
  body.add(steer);
  mesh(G.cyl(0.025, 0.025, 0.4), darkM, 0, 0.72, 0.45, body).rotation.x = 0.9;

  // wheels
  const tread = new THREE.MeshStandardMaterial({ map: Tex.tread(), roughness: 0.9 });
  const sideM = Mats.std(0x1f1f25, { r: 0.85 });
  const hubM = new THREE.MeshStandardMaterial({ color: def.accent === 0xffffff ? def.kart : def.accent, roughness: 0.3, metalness: 0.5 });
  const wheels = [];
  const W = [
    { x: 0.74, z: 0.78, r: 0.3, w: 0.26, front: true },
    { x: -0.74, z: 0.78, r: 0.3, w: 0.26, front: true },
    { x: 0.8, z: -0.74, r: 0.37, w: 0.36, front: false },
    { x: -0.8, z: -0.74, r: 0.37, w: 0.36, front: false },
  ];
  for (const w of W) {
    const pivot = new THREE.Group(); pivot.position.set(w.x, w.r, w.z);
    const spin = new THREE.Group(); pivot.add(spin);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(w.r, w.r, w.w, 22, 1, true), tread);
    tire.rotation.z = Math.PI / 2; tire.castShadow = true; spin.add(tire);
    for (const s of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.RingGeometry(w.r * 0.55, w.r, 22), sideM);
      side.position.x = s * w.w / 2; side.rotation.y = s * Math.PI / 2; spin.add(side);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(w.r * 0.58, w.r * 0.58, w.w * 0.9, 6), hubM);
      hub.rotation.z = Math.PI / 2; spin.add(hub);
      const cap = new THREE.Mesh(G.sphere(w.r * 0.22, 10, 8), metal);
      cap.position.x = s * w.w * 0.48; cap.scale.x = 0.5; spin.add(cap);
    }
    root.add(pivot);
    wheels.push({ pivot, spin, front: w.front, r: w.r });
  }

  // driver
  const driver = buildDriver(def);
  driver.group.position.set(0, -0.04, 0.02);
  body.add(driver.group);
  // collapse static parts into a few meshes; animated nodes stay separate
  steer.userData.keep = true; driver.head.userData.keep = true;
  for (const f of flames) f.userData.keep = true;
  flattenGroup(body);
  flattenGroup(steer);
  flattenGroup(driver.head);
  for (const w of wheels) flattenGroup(w.spin);

  // blob shadow (always visible, cheap)
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.0), new THREE.MeshBasicMaterial({ map: Tex.blob(), transparent: true, depthWrite: false, opacity: 0.85 }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.04; blob.renderOrder = 1;
  root.add(blob);

  body.traverse((o) => { if (o.isMesh && o.material !== flameMat && o.material !== flameCore) o.castShadow = true; });
  return { root, body, wheels, steer, driver, flames, flameMat, paint, accent, blob, hubM };
}

/* ---------- items ---------- */
const ItemModels = {
  banana() {
    const g = new THREE.Group();
    const pts = [], radii = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16, a = lerp(-2.5, -0.65, t);
      pts.push(new THREE.Vector3(Math.cos(a) * 0.5, Math.sin(a) * 0.5 + 0.62, 0));
      radii.push(0.025 + Math.sin(t * Math.PI) * 0.15);
    }
    const geo = taperTube(pts, radii, 10);
    const m = mesh(geo, Mats.std(0xffd84a, { r: 0.45 }), 0, 0, 0, g);
    m.scale.set(1, 1, 0.9);
    const tip = mesh(G.sphere(0.04), Mats.std(0x4a3010), pts[0].x, pts[0].y, 0, g);
    const stem = mesh(G.cyl(0.035, 0.045, 0.14, 6), Mats.std(0x6b4a1a), pts[16].x + 0.03, pts[16].y + 0.05, 0, g);
    stem.rotation.z = -0.6;
    g.scale.setScalar(1.25);
    return g;
  },
  disc(color = 0x2fd35a) {
    const g = new THREE.Group();
    const spin = new THREE.Group(); g.add(spin);
    mesh(G.cyl(0.52, 0.56, 0.22, 24), Mats.std(color, { r: 0.3 }), 0, 0.2, 0, spin);
    const dome = mesh(G.sphere(0.46, 20, 10), Mats.std(color, { r: 0.25, e: color, ei: 0.15 }), 0, 0.3, 0, spin);
    dome.scale.y = 0.45;
    mesh(G.torus(0.54, 0.05, 8, 28), Mats.std(0xffffff, { r: 0.3 }), 0, 0.2, 0, spin).rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const sp = mesh(G.cone(0.07, 0.16, 6), Mats.std(0xffffff, { r: 0.3 }), Math.cos(a) * 0.3, 0.44, Math.sin(a) * 0.3, spin);
      sp.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4);
    }
    g.userData.spin = spin;
    return g;
  },
  missile() {
    const g = new THREE.Group();
    const red = Mats.std(0xe8392f, { r: 0.3, m: 0.1 }), white = Mats.std(0xffffff, { r: 0.3 });
    const body = mesh(G.capsule(0.22, 0.62, 6, 14), red, 0, 0.55, 0, g); body.rotation.x = Math.PI / 2;
    const nose = mesh(G.sphere(0.23, 16, 10), white, 0, 0.55, 0.42, g); nose.scale.z = 1.2;
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Group(); f.position.set(0, 0.55, -0.35); f.rotation.z = i * Math.PI / 2 + Math.PI / 4;
      mesh(G.box(0.04, 0.26, 0.24), white, 0, 0.26, 0, f); g.add(f);
    }
    addEyes(g, 0.1, 0.66, 0.33, 0.07, { lid: 0xe8392f });
    const fl = new THREE.Mesh(G.cone(0.16, 0.6, 10), new THREE.MeshBasicMaterial({ color: 0xffa020, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0.55, -0.75); g.add(fl);
    g.userData.flame = fl;
    return g;
  },
  bomb() {
    const g = new THREE.Group();
    mesh(G.sphere(0.5, 22, 16), Mats.std(0x1c1c26, { r: 0.35, m: 0.2 }), 0, 0.55, 0, g);
    mesh(G.cyl(0.13, 0.15, 0.14, 12), Mats.std(0x8a8f9c, { r: 0.4, m: 0.6 }), 0, 1.06, 0, g);
    const fuse = mesh(G.cyl(0.025, 0.025, 0.24, 6), Mats.std(0xd8c39a), 0.04, 1.22, 0, g); fuse.rotation.z = -0.3;
    const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.glow(), color: 0xffb030, blending: THREE.AdditiveBlending, depthWrite: false }));
    spark.position.set(0.1, 1.36, 0); spark.scale.setScalar(0.5); g.add(spark);
    addEyes(g, 0.15, 0.62, 0.42, 0.1, { sx: 0.8, sy: 1.3 });
    for (const s of [-1, 1]) mesh(G.sphere(0.12, 10, 8), Mats.std(0xffc23a), s * 0.32, 0.12, 0.1, g).scale.set(1, 0.6, 1.4);
    g.userData.spark = spark;
    return g;
  },
  comet() {
    const g = new THREE.Group();
    const blue = Mats.std(0x2f6bff, { r: 0.25, e: 0x1a3cff, ei: 0.5 });
    mesh(G.sphere(0.55, 20, 14), blue, 0, 0, 0, g);
    for (let i = 0; i < 10; i++) {
      const v = new THREE.Vector3().randomDirection();
      const sp = mesh(G.cone(0.14, 0.38, 8), Mats.std(0xffffff), v.x * 0.55, v.y * 0.55, v.z * 0.55, g);
      sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
    }
    for (const s of [-1, 1]) {
      const w = mesh(G.sphere(0.4, 14, 10), Mats.std(0xffffff, { r: 0.4 }), s * 0.7, 0.2, -0.2, g);
      w.scale.set(1, 0.25, 0.6); w.rotation.z = s * 0.4;
    }
    return g;
  },
  drone() {
    const g = new THREE.Group();
    mesh(roundedBoxGeo(0.9, 0.3, 0.9, 0.12), Mats.std(0xffd02b, { r: 0.4 }), 0, 0, 0, g);
    mesh(G.sphere(0.2, 12, 10), Mats.std(0x10131f, { r: 0.1, m: 0.4 }), 0, -0.1, 0.42, g).scale.z = 0.5;
    const rotors = [];
    for (const [x, z] of [[0.6, 0.6], [-0.6, 0.6], [0.6, -0.6], [-0.6, -0.6]]) {
      mesh(G.box(0.5, 0.06, 0.08), Mats.std(0x333344), x / 2, 0.05, z / 2, g).rotation.y = Math.atan2(x, z) + Math.PI / 2;
      const r = new THREE.Mesh(G.cyl(0.38, 0.38, 0.02, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }));
      r.position.set(x, 0.12, z); g.add(r); rotors.push(r);
      mesh(G.cyl(0.05, 0.05, 0.1, 8), Mats.std(0x333344), x, 0.07, z, g);
    }
    const line = mesh(G.cyl(0.015, 0.015, 1, 4), Mats.std(0x222222), 0, -0.6, 0, g, false);
    line.scale.y = 1.0;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.5), new THREE.MeshBasicMaterial({ map: Tex.banner('OUPS !', '#ffd02b', '#141632', 256, 116), side: THREE.DoubleSide }));
    sign.position.set(0, 0.45, 0); g.add(sign);
    g.userData = { rotors, line, sign };
    return g;
  },
  coinGeo() {
    const g = new THREE.CylinderGeometry(0.45, 0.45, 0.1, 22);
    g.rotateX(Math.PI / 2);
    return g;
  },
};

/* ---------- decor geometries (merged, vertex coloured) ---------- */
const Decor = {
  treeRound(seed = 1) {
    const r = mulberry32(seed);
    const parts = [[G.cyl(0.22, 0.32, 2.4, 7), 0x7a4e2c, M4(0, 1.2, 0)]];
    const greens = [0x4caf50, 0x5cc35a, 0x3f9e46];
    const blobs = [[0, 3.1, 0, 1.55], [0.7, 2.6, 0.3, 1.05], [-0.6, 2.7, -0.3, 1.1], [0.1, 3.9, 0.1, 1.0]];
    for (const [x, y, z, s] of blobs) parts.push([jitterGeo(new THREE.IcosahedronGeometry(s, 1), 0.25, seed + x * 10), greens[Math.floor(r() * 3)], M4(x, y, z)]);
    return mergeColored(parts);
  },
  pine(snow, seed = 1) {
    const parts = [[G.cyl(0.18, 0.25, 1.4, 6), 0x6b4428, M4(0, 0.7, 0)]];
    const levels = [[1.6, 1.9, 1.3], [1.25, 1.7, 2.3], [0.9, 1.5, 3.2], [0.55, 1.2, 4.0]];
    for (const [rad, h, y] of levels) {
      parts.push([jitterGeo(new THREE.ConeGeometry(rad, h, 7), 0.12, seed + y), 0x2f7d4a, M4(0, y, 0)]);
      if (snow) parts.push([new THREE.ConeGeometry(rad * 0.62, h * 0.45, 7), 0xf4f8ff, M4(0, y + h * 0.3, 0)]);
    }
    return mergeColored(parts);
  },
  cactus() {
    const c = 0x4f9d4a;
    return mergeColored([
      [G.capsule(0.32, 2.6, 4, 8), c, M4(0, 1.6, 0)],
      [G.capsule(0.2, 0.7, 4, 8), c, M4(0.55, 1.6, 0, 0, 0, Math.PI / 2)],
      [G.capsule(0.2, 0.8, 4, 8), c, M4(0.85, 2.15, 0)],
      [G.capsule(0.18, 0.5, 4, 8), c, M4(-0.45, 2.1, 0, 0, 0, Math.PI / 2)],
      [G.capsule(0.18, 0.6, 4, 8), c, M4(-0.68, 2.5, 0)],
      [G.sphere(0.12, 8, 6), 0xff6fb5, M4(0, 3.2, 0)],
    ]);
  },
  rock(seed, color = 0x8e8a86) {
    return mergeColored([[jitterGeo(new THREE.IcosahedronGeometry(1, 1), 0.45, seed), color, M4(0, 0.5, 0, 0, 0, 0, 1, 0.75, 1)]]);
  },
  bush(seed) {
    const parts = [];
    const r = mulberry32(seed);
    for (let i = 0; i < 4; i++) parts.push([jitterGeo(new THREE.IcosahedronGeometry(0.5 + r() * 0.4, 0), 0.15, seed + i), [0x4caf50, 0x3f9e46, 0x66c45a][i % 3], M4((r() - 0.5) * 1.2, 0.4 + r() * 0.3, (r() - 0.5) * 1.2)]);
    return mergeColored(parts);
  },
  flower(color) {
    return mergeColored([
      [G.cyl(0.03, 0.03, 0.5, 4), 0x3f9e46, M4(0, 0.25, 0)],
      [G.sphere(0.16, 6, 4), color, M4(0, 0.55, 0, 0, 0, 0, 1, 0.5, 1)],
      [G.sphere(0.07, 6, 4), 0xffe14d, M4(0, 0.6, 0)],
    ]);
  },
  mesa(seed) {
    const r = mulberry32(seed);
    const cols = [0xc56b3f, 0xd98a55, 0xb4583a, 0xe0a070, 0xa94f33];
    const parts = [];
    let y = 0, rad = 1;
    for (let i = 0; i < 5; i++) {
      const h = 0.15 + r() * 0.12;
      parts.push([jitterGeo(new THREE.CylinderGeometry(rad * (0.92 - i * 0.03), rad, h, 9, 1), 0.05, seed + i), cols[i], M4(0, y + h / 2, 0)]);
      y += h; rad *= 0.97;
    }
    return mergeColored(parts);
  },
  snowman() {
    return mergeColored([
      [G.sphere(0.8, 12, 10), 0xf8fbff, M4(0, 0.7, 0)],
      [G.sphere(0.58, 12, 10), 0xf8fbff, M4(0, 1.75, 0)],
      [G.sphere(0.42, 12, 10), 0xf8fbff, M4(0, 2.55, 0)],
      [G.cone(0.08, 0.45, 6), 0xff8a1a, M4(0, 2.55, 0.55, Math.PI / 2, 0, 0)],
      [G.sphere(0.06, 6, 4), 0x111111, M4(0.15, 2.68, 0.36)],
      [G.sphere(0.06, 6, 4), 0x111111, M4(-0.15, 2.68, 0.36)],
      [G.cyl(0.32, 0.32, 0.05, 12), 0x222233, M4(0, 2.9, 0)],
      [G.cyl(0.22, 0.22, 0.4, 12), 0x222233, M4(0, 3.1, 0)],
      [G.torus(0.42, 0.08, 6, 14), 0xe8392f, M4(0, 2.2, 0, Math.PI / 2, 0, 0)],
    ]);
  },
  chalet(color = 0xa0643a) {
    const roof = new THREE.CylinderGeometry(0.01, 3.3, 2.0, 4, 1);
    return mergeColored([
      [G.box(4, 2.6, 3.4), color, M4(0, 1.3, 0)],
      [roof, 0x8a3a2a, M4(0, 3.6, 0, 0, Math.PI / 4, 0, 1.2, 1, 1)],
      [new THREE.CylinderGeometry(0.01, 3.4, 0.4, 4, 1), 0xf8fbff, M4(0, 4.45, 0, 0, Math.PI / 4, 0, 0.5, 1, 0.5)],
      [G.box(0.8, 1.4, 0.1), 0x5a3418, M4(0, 0.7, 1.72)],
      [G.box(0.8, 0.7, 0.1), 0xffe39a, M4(1.3, 1.5, 1.72)],
      [G.box(0.8, 0.7, 0.1), 0xffe39a, M4(-1.3, 1.5, 1.72)],
      [G.box(0.5, 1.2, 0.5), 0x888888, M4(1.2, 4.0, -0.5)],
    ]);
  },
  barn() {
    const roof = new THREE.CylinderGeometry(0.01, 3.8, 2.4, 4, 1);
    return mergeColored([
      [G.box(5, 3.2, 4), 0xc8352b, M4(0, 1.6, 0)],
      [roof, 0x5a3a2a, M4(0, 4.4, 0, 0, Math.PI / 4, 0, 1.0, 1, 0.82)],
      [G.box(1.8, 2.2, 0.1), 0xf4f2ee, M4(0, 1.1, 2.02)],
      [G.box(1.6, 0.12, 0.12), 0xf4f2ee, M4(0, 1.1, 2.08, 0, 0, 0.9)],
      [G.box(1.6, 0.12, 0.12), 0xf4f2ee, M4(0, 1.1, 2.08, 0, 0, -0.9)],
    ]);
  },
  hay() {
    return mergeColored([[G.cyl(0.9, 0.9, 1.3, 14), 0xe8c25a, M4(0, 0.9, 0, 0, 0, Math.PI / 2)], [G.cyl(0.7, 0.7, 1.32, 14), 0xd8a83a, M4(0, 0.9, 0, 0, 0, Math.PI / 2)]]);
  },
  tireStack() {
    const parts = [];
    for (let i = 0; i < 3; i++) parts.push([G.torus(0.45, 0.2, 8, 14), i === 1 ? 0xf4f2ee : 0x24242c, M4(0, 0.2 + i * 0.38, 0, Math.PI / 2, 0, 0)]);
    return mergeColored(parts);
  },
  cone() {
    return mergeColored([[G.cone(0.28, 0.8, 10), 0xff6a1a, M4(0, 0.45, 0)], [G.cyl(0.17, 0.2, 0.14, 10), 0xffffff, M4(0, 0.5, 0)], [G.box(0.7, 0.06, 0.7), 0xff6a1a, M4(0, 0.03, 0)]]);
  },
  lampPost() {
    return mergeColored([[G.cyl(0.1, 0.14, 6, 8), 0x3a3d4c, M4(0, 3, 0)], [G.box(0.12, 0.12, 1.6), 0x3a3d4c, M4(0, 5.9, 0.7)], [G.box(0.5, 0.18, 0.7), 0x3a3d4c, M4(0, 5.85, 1.4)]]);
  },
  crystal(seed) {
    const parts = [];
    const r = mulberry32(seed);
    for (let i = 0; i < 4; i++) {
      const h = 1.5 + r() * 2.5;
      parts.push([new THREE.OctahedronGeometry(0.6, 0), 0xbfe8ff, M4((r() - 0.5) * 1.6, h * 0.45, (r() - 0.5) * 1.6, (r() - 0.5) * 0.6, r() * 3, (r() - 0.5) * 0.6, 0.6, h, 0.6)]);
    }
    return mergeColored(parts);
  },
  asteroid(seed) { return mergeColored([[jitterGeo(new THREE.IcosahedronGeometry(1, 1), 0.5, seed), 0x6a6478, M4()]]); },
  palmTree() {
    const parts = [];
    for (let i = 0; i < 6; i++) parts.push([G.cyl(0.2, 0.24, 0.9, 6), 0x9a6a3a, M4(i * 0.08, 0.45 + i * 0.85, 0, 0, 0, -0.06)]);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      parts.push([G.box(2.6, 0.06, 0.6), 0x4caf50, M4(0.5 + Math.cos(a) * 1.2, 5.4, Math.sin(a) * 1.2, 0, -a, -0.35)]);
    }
    return mergeColored(parts);
  },
  tumbleweed(seed) { return mergeColored([[jitterGeo(new THREE.IcosahedronGeometry(0.6, 1), 0.3, seed), 0xb08a4a, M4(0, 0.6, 0)]]); },
  fencePost() { return mergeColored([[G.box(0.16, 1.3, 0.16), 0xf2ece0, M4(0, 0.65, 0)]]); },
  derrick() {
    const parts = [];
    const c = 0x4a3a30;
    for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) parts.push([G.box(0.15, 9, 0.15), c, M4(x * 0.6, 4.5, z * 0.6, z * 0.12, 0, -x * 0.12)]);
    for (let y = 1; y < 9; y += 2) parts.push([G.box(1.8 - y * 0.12, 0.1, 0.1), c, M4(0, y, 0.75 - y * 0.06)], [G.box(1.8 - y * 0.12, 0.1, 0.1), c, M4(0, y, -0.75 + y * 0.06)]);
    return mergeColored(parts);
  },
  ufo() {
    return mergeColored([
      [G.sphere(2, 20, 10), 0xb8c2d8, M4(0, 0, 0, 0, 0, 0, 1, 0.25, 1)],
      [G.sphere(0.9, 16, 10), 0x7fe8ff, M4(0, 0.35, 0)],
      [G.torus(1.9, 0.12, 6, 24), 0xffe14d, M4(0, 0, 0, Math.PI / 2, 0, 0)],
    ]);
  },
};

/* gold trophy for the podium */
function buildTrophy(color = 0xffd54a) {
  const pts = [];
  const prof = [[0.0, 0], [0.55, 0], [0.55, 0.12], [0.2, 0.2], [0.12, 0.6], [0.14, 0.75], [0.5, 0.95], [0.62, 1.4], [0.6, 1.62], [0.55, 1.62], [0.5, 1.42], [0.38, 1.0], [0.0, 0.92]];
  for (const [x, y] of prof) pts.push(new THREE.Vector2(x, y));
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color, metalness: 0.8, roughness: 0.22, emissive: 0x6a4a00, emissiveIntensity: 0.55 });
  mesh(new THREE.LatheGeometry(pts, 32), gold, 0, 0, 0, g);
  for (const s of [-1, 1]) { const h = mesh(G.torus(0.25, 0.05, 8, 16, Math.PI * 1.2), gold, s * 0.62, 1.2, 0, g); h.rotation.z = s > 0 ? -Math.PI * 0.6 : Math.PI * 0.4; }
  mesh(G.box(0.9, 0.35, 0.9), Mats.std(0x3a2a1e, { r: 0.4 }), 0, -0.17, 0, g);
  return g;
}
