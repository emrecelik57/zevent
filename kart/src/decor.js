/* ============================================================
   Theme decorations: instanced props, set pieces, sky dressing
   ============================================================ */
function buildDecor(tr) {
  const th = tr.def.theme;
  const density = tr.quality >= 2 ? 1 : tr.quality === 1 ? 0.7 : 0.45;
  const rng = mulberry32(tr.seed + 99);
  const b = tr.bounds;
  const lamF = (o = {}) => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: o.flat !== false, transparent: !!o.t, opacity: o.op ?? 1, emissive: o.e ?? 0x000000 });
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3(), tmpE = new THREE.Euler(), tmpC = new THREE.Color();

  function spots(count, o) {
    const out = [];
    let tries = 0;
    const margin = o.margin ?? 200;
    while (out.length < count && tries < count * 30) {
      tries++;
      const x = lerp(b.mnx - margin, b.mxx + margin, rng()), z = lerp(b.mnz - margin, b.mxz + margin, rng());
      const q = tr.nearest(x, z, 95);
      if (q) {
        const edge = q.wall === Infinity ? q.width / 2 : q.wall;
        const dEdge = Math.abs(q.lateral) - edge;
        if (dEdge < (o.minD ?? 3)) continue;
        if (o.maxEdge != null && dEdge > o.maxEdge) continue;
      } else if (o.maxEdge != null) continue;
      const y = tr.tg ? tr.heightAt(x, z) : 0;
      if (o.minY != null && y < o.minY) continue;
      if (o.test && !o.test(x, z, y)) continue;
      out.push([x, y, z]);
    }
    return out;
  }
  function instanced(geo, mat, list, o = {}) {
    if (!list.length) return null;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, i) => {
      const [x, y, z] = it;
      const sc = it[4] ?? lerp(o.smin ?? 0.8, o.smax ?? 1.3, rng());
      tmpE.set(o.tilt ? (rng() - 0.5) * o.tilt : 0, it[3] ?? rng() * TAU, o.tilt ? (rng() - 0.5) * o.tilt : 0);
      tmpQ.setFromEuler(tmpE);
      tmpS.set(sc, sc * (o.sy ? lerp(o.sy[0], o.sy[1], rng()) : 1), sc);
      tmpP.set(x, y + (o.yOff || 0), z);
      tmpM.compose(tmpP, tmpQ, tmpS);
      im.setMatrixAt(i, tmpM);
      if (o.colors) im.setColorAt(i, tmpC.set(o.colors[Math.floor(rng() * o.colors.length)]));
    });
    im.castShadow = !!o.shadow; im.receiveShadow = !!o.recv;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    tr.group.add(im);
    return im;
  }
  /* props lined up just outside the walls */
  function alongTrack(spacing, offset, fn) {
    for (let s = rng() * spacing; s < tr.L; s += spacing) {
      for (const side of [1, -1]) {
        const f = tr.frameAt(s);
        if (f.wall === Infinity) continue;
        const lat = side * (f.wall + offset);
        fn(f.px + f.lx * lat, f.py + f.ly * lat, f.pz + f.lz * lat, f, side, s);
      }
    }
  }
  function clouds(n, color = 0xffffff, yMin = 90, yMax = 170) {
    if (!n) return;
    const parts = [];
    for (let c = 0; c < n; c++) {
      const cx = lerp(b.mnx - 300, b.mxx + 300, rng()), cz = lerp(b.mnz - 300, b.mxz + 300, rng()), cy = lerp(yMin, yMax, rng());
      const puffs = 4 + Math.floor(rng() * 4), sc = lerp(6, 14, rng());
      for (let p = 0; p < puffs; p++) {
        const r = sc * lerp(0.6, 1.2, rng());
        parts.push([new THREE.IcosahedronGeometry(r, 1), color, M4(cx + (p - puffs / 2) * sc * 0.9, cy + rng() * sc * 0.4, cz + (rng() - 0.5) * sc, 0, 0, 0, 1, 0.62, 1)]);
      }
    }
    const m = new THREE.Mesh(mergeColored(parts), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: 0x9a9aa6, fog: false }));
    tr.group.add(m);
    tr.updaters.push((dt) => { m.position.x += dt * 2.5; if (m.position.x > 400) m.position.x = -400; });
  }
  function mountains(cols, count = 34, hMin = 90, hMax = 230, snowCap = false) {
    if (!cols) return;
    const parts = [];
    const R = b.r + 420;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + rng() * 0.15;
      const h = lerp(hMin, hMax, rng()), r = h * lerp(0.75, 1.15, rng());
      const d = R + r * 0.5 + rng() * 260;
      const x = b.cx + Math.cos(a) * d, z = b.cz + Math.sin(a) * d;
      const geo = jitterGeo(new THREE.ConeGeometry(r, h, 7, 3), h * 0.08, i + 3);
      // colour by height
      const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
      const c0 = new THREE.Color(cols[0]), c1 = new THREE.Color(cols[1]), c2 = new THREE.Color(cols[2]);
      for (let k = 0; k < pos.count; k++) {
        const t = (pos.getY(k) + h / 2) / h;
        tmpC.copy(c0).lerp(c1, smoothstep(0, 0.55, t));
        if (snowCap || cols[2]) tmpC.lerp(c2, smoothstep(0.62, 0.8, t) * (snowCap ? 1 : 0.6));
        col[k * 3] = tmpC.r; col[k * 3 + 1] = tmpC.g; col[k * 3 + 2] = tmpC.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.translate(x, h / 2 - 12, z);
      parts.push(geo);
    }
    for (const g of parts) tr.group.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
  }
  function stars(count, minY = -0.2) {
    const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3().randomDirection();
      if (v.y < minY) v.y = -v.y * 0.5 + 0.05;
      v.normalize().multiplyScalar(1700);
      pos.set([v.x, v.y, v.z], i * 3);
      const c = tmpC.setHSL(rng() < 0.3 ? 0.6 : rng() < 0.5 ? 0.12 : 0.75, 0.6, lerp(0.7, 1, rng()));
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false }));
    p.renderOrder = -9; p.frustumCulled = false;
    tr.group.add(p);
    tr.followers.push({ obj: p });
  }

  /* -------------------------------- MEADOW -------------------------------- */
  if (th === 'meadow') {
    const notLake = (x, z, y) => y > -0.4;
    const treeGeos = [Decor.treeRound(1), Decor.treeRound(2), Decor.treeRound(3)];
    const treeMat = lamF();
    for (const g of treeGeos) {
      const near = spots(55 * density, { minD: 4, maxEdge: 70, test: notLake });
      const far = spots(40 * density, { minD: 30, test: notLake });
      instanced(g, treeMat, near.concat(far), { smin: 0.9, smax: 1.7, shadow: true, colors: ['#ffffff', '#f0ffe6', '#e2f5d0', '#fff8e0'] });
    }
    instanced(Decor.bush(5), lamF(), spots(140 * density, { minD: 2, test: notLake }), { smin: 0.8, smax: 1.5, shadow: true });
    for (const c of [0xff5a8a, 0xffffff, 0xffd02b, 0xb57bff]) instanced(Decor.flower(c), lamF(), spots(70 * density, { minD: 1, maxEdge: 50, test: notLake }), { smin: 0.9, smax: 1.4 });
    instanced(Decor.rock(7, 0x9a958e), lamF(), spots(30 * density, { minD: 3 }), { smin: 0.8, smax: 2.6, shadow: true });
    instanced(Decor.hay(), lamF(), spots(16, { minD: 3, maxEdge: 30, test: notLake }), { smin: 1, smax: 1.2, shadow: true });
    // barns + windmills
    for (const [x, y, z] of spots(2, { minD: 14, maxEdge: 60, test: notLake })) {
      const m = new THREE.Mesh(Decor.barn(), lamF()); m.position.set(x, y - 0.2, z); m.rotation.y = rng() * TAU; m.scale.setScalar(1.6);
      m.castShadow = true; tr.group.add(m);
    }
    for (const [x, y, z] of spots(3, { minD: 18, maxEdge: 90, test: notLake })) {
      const wm = new THREE.Group();
      wm.add(new THREE.Mesh(mergeColored([[G.cyl(1.4, 2.6, 14, 8), 0xf4efe6, M4(0, 7, 0)], [G.cone(2.2, 3, 8), 0xc8352b, M4(0, 15.5, 0)], [G.box(1.2, 2, 0.2), 0x6b4428, M4(0, 1, 2.3)]]), lamF()));
      const hub = new THREE.Group(); hub.position.set(0, 13, 2.2);
      for (let k = 0; k < 4; k++) {
        const blade = new THREE.Mesh(mergeColored([[G.box(0.4, 8, 0.15), 0x7a5230, M4(0, 4.2, 0)], [G.box(1.6, 6, 0.08), 0xf4f2ee, M4(0.9, 4.8, 0)]]), lamF());
        blade.rotation.z = k * Math.PI / 2; hub.add(blade);
      }
      wm.add(hub);
      wm.position.set(x, y - 0.3, z);
      wm.lookAt(b.cx, y, b.cz);
      wm.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      tr.group.add(wm);
      const spd = lerp(0.6, 1.1, rng());
      tr.updaters.push((dt) => { hub.rotation.z += dt * spd; });
    }
    // hot-air balloons
    const balloonCols = [[0xff5a4e, 0xffd34a], [0x4fc3ff, 0xffffff], [0x7be26b, 0xff8ad8], [0xb57bff, 0xffd34a]];
    for (let i = 0; i < 4; i++) {
      const [c1, c2] = balloonCols[i];
      const parts = [];
      for (let k = 0; k < 8; k++) {
        const seg = new THREE.SphereGeometry(6, 4, 14, (k / 8) * TAU, TAU / 8);
        parts.push([seg, k % 2 ? c1 : c2, M4(0, 0, 0, 0, 0, 0, 1, 1.2, 1)]);
      }
      parts.push([G.box(2.2, 1.6, 2.2), 0x8a5a30, M4(0, -10, 0)]);
      for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) parts.push([G.cyl(0.05, 0.05, 4.5, 3), 0x333333, M4(x * 1.4, -7.6, z * 1.4)]);
      const m = new THREE.Mesh(mergeColored(parts), lamF({ flat: false }));
      const bx = lerp(b.mnx, b.mxx, rng()), bz = lerp(b.mnz, b.mxz, rng()), by = lerp(45, 80, rng()), ph = rng() * TAU;
      m.position.set(bx, by, bz);
      tr.group.add(m);
      tr.updaters.push((dt, t) => { m.position.y = by + Math.sin(t * 0.4 + ph) * 3; m.position.x += dt * 0.8; m.rotation.y += dt * 0.05; });
    }
    alongTrack(70, 3, (x, y, z, f, side) => {
      if (rng() < 0.5 && Math.abs(f.k) > 1 / 40) { const m = new THREE.Mesh(Decor.tireStack(), lamF()); m.position.set(x, y - 0.5, z); tr.group.add(m); }
    });
    clouds(tr.theme.clouds * density);
    mountains(tr.theme.mountains, 30, 70, 170);
  }

  /* -------------------------------- CANYON -------------------------------- */
  if (th === 'canyon') {
    const mesaMat = lamF();
    const mesaGeo = Decor.mesa(3);
    instanced(mesaGeo, mesaMat, spots(16 * density + 4, { minD: 40, margin: 260 }).map((p) => [p[0], p[1] - 2, p[2], rng() * TAU, lerp(20, 42, rng())]), { sy: [0.7, 1.6], shadow: false });
    instanced(Decor.cactus(), lamF(), spots(110 * density, { minD: 2.5, maxEdge: 40 }).concat(spots(60 * density, { minD: 20 })), { smin: 0.8, smax: 1.7, shadow: true, colors: ['#ffffff', '#e8ffe0', '#d8ecc8'] });
    instanced(Decor.rock(11, 0xb4673f), lamF(), spots(60 * density, { minD: 2 }), { smin: 0.8, smax: 3.2, shadow: true });
    instanced(Decor.palmTree(), lamF(), spots(10, { minD: 6, maxEdge: 40 }), { smin: 0.9, smax: 1.3, shadow: true });
    instanced(Decor.derrick(), lamF(), spots(5, { minD: 12, maxEdge: 80 }), { smin: 1, smax: 1.4, shadow: true });
    // rolling tumbleweeds
    const tw = Decor.tumbleweed(4), twMat = lamF();
    for (const [x, y, z] of spots(8, { minD: 2, maxEdge: 25 })) {
      const m = new THREE.Mesh(tw, twMat); m.castShadow = true;
      const ox = x, oz = z, ph = rng() * TAU, r = lerp(4, 9, rng());
      tr.group.add(m);
      tr.updaters.push((dt, t) => {
        const a = t * 0.35 + ph;
        m.position.set(ox + Math.cos(a) * r, y + Math.abs(Math.sin(t * 3 + ph)) * 0.6, oz + Math.sin(a) * r);
        m.rotation.x += dt * 2.5; m.rotation.z += dt * 1.5;
      });
    }
    // natural rock arches spanning the road
    for (const t of [0.33, 0.72]) {
      const f = tr.frameAt(t * tr.L);
      const span = f.wall + 2.6;
      const arch = new THREE.Mesh(jitterGeo(new THREE.TorusGeometry(span, 2.6, 7, 26, Math.PI), 0.7, 21), lamF());
      const cols = new Float32Array(arch.geometry.attributes.position.count * 3);
      for (let k = 0; k < cols.length / 3; k++) { tmpC.set(k % 7 < 3 ? '#c06a40' : '#d98a55'); cols.set([tmpC.r, tmpC.g, tmpC.b], k * 3); }
      arch.geometry.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      arch.position.set(f.px, f.py - 1, f.pz);
      arch.rotation.y = Math.atan2(f.tx, f.tz) + Math.PI / 2;
      arch.scale.set(1, 1.15, 1);
      arch.castShadow = true;
      tr.group.add(arch);
    }
    // saloon sign near the start
    const f0 = tr.frameAt(-40);
    const sign = new THREE.Group();
    sign.add(new THREE.Mesh(mergeColored([[G.box(0.4, 7, 0.4), 0x6b4428, M4(-4, 3.5, 0)], [G.box(0.4, 7, 0.4), 0x6b4428, M4(4, 3.5, 0)]]), lamF()));
    const board = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.6), new THREE.MeshLambertMaterial({ map: Tex.banner('CANYON CACTUS', '#8a5428', '#ffe6b0', 1024, 256), side: THREE.DoubleSide }));
    board.position.y = 6; sign.add(board);
    const lat = f0.wall + 4;
    sign.position.set(f0.px + f0.lx * lat, f0.py, f0.pz + f0.lz * lat);
    sign.rotation.y = Math.atan2(f0.tx, f0.tz) - Math.PI / 2;
    tr.group.add(sign);
    clouds(tr.theme.clouds, 0xffe2c8, 120, 200);
    mountains(tr.theme.mountains, 26, 60, 150);
  }

  /* --------------------------------- SNOW --------------------------------- */
  if (th === 'snow') {
    const pineMat = lamF();
    instanced(Decor.pine(true, 3), pineMat, spots(170 * density, { minD: 3, maxEdge: 60 }), { smin: 1.1, smax: 2.4, shadow: true, colors: ['#ffffff', '#e8f4ee', '#dcebe4'] });
    instanced(Decor.pine(true, 8), pineMat, spots(150 * density, { minD: 8 }), { smin: 1.4, smax: 3.0, shadow: true });
    instanced(Decor.pine(false, 5), pineMat, spots(90 * density, { minD: 6, maxEdge: 90 }), { smin: 1.2, smax: 2.6, shadow: true });
    instanced(Decor.rock(13, 0x8d97ab), lamF(), spots(40 * density, { minD: 3 }), { smin: 0.8, smax: 3, shadow: true });
    instanced(Decor.snowman(), lamF({ flat: false }), spots(10, { minD: 2, maxEdge: 22 }), { smin: 0.9, smax: 1.2, shadow: true });
    instanced(Decor.chalet(), lamF(), spots(7, { minD: 10, maxEdge: 55 }), { smin: 1.2, smax: 1.6, shadow: true });
    const crystalMat = new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.8, roughness: 0.05, metalness: 0.2, emissive: 0x4fa8ff, emissiveIntensity: 0.35, flatShading: true });
    instanced(Decor.crystal(5), crystalMat, spots(18, { minD: 3, maxEdge: 40 }), { smin: 1, smax: 2.2 });
    // falling snow around the camera
    const n = Math.floor(1600 * density);
    const sp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) sp.set([(rng() - 0.5) * 120, rng() * 60, (rng() - 0.5) * 120], i * 3);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const snow = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, transparent: true, opacity: 0.9, map: Tex.glow(), depthWrite: false }));
    snow.frustumCulled = false;
    tr.group.add(snow);
    tr.updaters.push((dt, t, cam) => {
      if (!cam) return;
      const a = sg.attributes.position.array;
      for (let i = 0; i < n; i++) {
        a[i * 3 + 1] -= dt * (5 + (i % 7));
        a[i * 3] += Math.sin(t + i) * dt * 0.8;
        if (a[i * 3 + 1] < -5) a[i * 3 + 1] += 60;
      }
      snow.position.set(cam.position.x - (cam.position.x % 120), cam.position.y - 20, cam.position.z - (cam.position.z % 120));
      // keep flakes centred around the camera in a wrapped box
      for (let i = 0; i < n; i++) {
        let x = a[i * 3] + snow.position.x - cam.position.x, z = a[i * 3 + 2] + snow.position.z - cam.position.z;
        if (x > 60) a[i * 3] -= 120; else if (x < -60) a[i * 3] += 120;
        if (z > 60) a[i * 3 + 2] -= 120; else if (z < -60) a[i * 3 + 2] += 120;
      }
      sg.attributes.position.needsUpdate = true;
    });
    clouds(tr.theme.clouds * density, 0xffffff, 110, 180);
    mountains(tr.theme.mountains, 34, 120, 280, true);
  }

  /* --------------------------------- CITY --------------------------------- */
  if (th === 'city') {
    const tints = [0x1a1d33, 0x231a33, 0x152433, 0x2a2238, 0x1d2a2a];
    const placed = [];
    const blocks = spots(110 * density + 20, { minD: 7, maxEdge: 140, margin: 150 });
    for (const [x, y, z] of blocks) {
      const w = lerp(10, 22, rng()), d = lerp(10, 22, rng()), h = lerp(18, 85, rng() * rng() + 0.1);
      if (placed.some((p) => Math.abs(p[0] - x) < (p[2] + w) / 2 + 1.5 && Math.abs(p[1] - z) < (p[3] + d) / 2 + 1.5)) continue;
      // footprint must stay clear of the road
      let ok = true;
      for (const [cx, cz] of [[x - w / 2, z - d / 2], [x + w / 2, z - d / 2], [x - w / 2, z + d / 2], [x + w / 2, z + d / 2]]) {
        const q = tr.nearest(cx, cz, 60);
        if (q && Math.abs(q.lateral) < q.wall + 3) { ok = false; break; }
      }
      if (!ok) continue;
      placed.push([x, z, w, d]);
      const geo = new THREE.BoxGeometry(w, h, d);
      const uv = geo.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * Math.max(1, Math.round(w / 9)), uv.getY(k) * Math.max(1, Math.round(h / 14)));
      const wt = Tex.windows(Math.floor(rng() * 5) + 1, Math.floor(rng() * 3));
      const mat = new THREE.MeshStandardMaterial({ color: pick(tints), roughness: 0.6, metalness: 0.3, emissive: 0xffffff, emissiveMap: wt, emissiveIntensity: 1.1 });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y + h / 2, z);
      m.rotation.y = Math.round(rng() * 4) * Math.PI / 2;
      tr.group.add(m);
      if (rng() < 0.35) { // rooftop antenna with blinking light
        const ant = mesh(G.cyl(0.15, 0.15, 8, 4), Mats.std(0x444455), x, y + h + 4, z, tr.group, false);
        const blink = new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.glow(), color: 0xff3030, blending: THREE.AdditiveBlending, depthWrite: false }));
        blink.position.set(x, y + h + 8.2, z); blink.scale.setScalar(3); tr.group.add(blink);
        const ph = rng() * 3;
        tr.updaters.push((dt, t) => { blink.material.opacity = (Math.sin(t * 3 + ph) > 0.3) ? 1 : 0.15; });
      }
    }
    // neon signs facing the road
    const words = [['KARTOON', '#ff3fd1'], ['NITRO', '#29e4ff'], ['ARCADE', '#ffe14d'], ['PIZZA', '#ff6b3d'], ['HÔTEL', '#7bff8a'], ['RAMEN', '#ff3fd1'], ['TURBO', '#29e4ff'], ['CINÉ', '#ffe14d'], ['DISCO', '#b57bff']];
    let wi = 0;
    for (let s = 40; s < tr.L; s += 95) {
      const f = tr.frameAt(s), side = wi % 2 ? 1 : -1, [word, color] = words[wi++ % words.length];
      const lat = side * (f.wall + 6);
      const c = makeCanvas(512, 128), g = c.getContext('2d');
      g.fillStyle = 'rgba(10,8,25,0.85)'; g.fillRect(0, 0, 512, 128);
      g.font = '84px "Lilita One", "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = color; g.shadowBlur = 24; g.fillStyle = color; g.fillText(word, 256, 68); g.fillText(word, 256, 68);
      g.strokeStyle = color; g.lineWidth = 6; g.strokeRect(10, 10, 492, 108);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5), new THREE.MeshBasicMaterial({ map: canvasTexture(c, { clampS: true, clampT: true }), side: THREE.DoubleSide }));
      sign.position.set(f.px + f.lx * lat, f.py + 9, f.pz + f.lz * lat);
      sign.rotation.y = Math.atan2(f.tx, f.tz) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
      const post = mesh(G.box(0.4, 9, 0.4), Mats.std(0x2a2a3a), sign.position.x, f.py + 4.5, sign.position.z, tr.group, false);
      tr.group.add(sign);
      const ph = rng() * 10;
      tr.updaters.push((dt, t) => { sign.material.color.setScalar((Math.sin(t * 17 + ph) > 0.97) ? 0.4 : 1); });
    }
    // street lamps with light pools on the road
    const poles = [], bulbs = [], pools = [];
    alongTrack(26, 1.4, (x, y, z, f, side) => {
      const yaw = Math.atan2(f.tx, f.tz) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
      poles.push([x, y - 0.5, z, yaw, 1]);
      const arm = 1.4 + 0.7;
      bulbs.push(new THREE.Vector3(x - f.lx * side * arm, y + 5.2, z - f.lz * side * arm));
      const lp = side * (f.wall - 4.5);
      pools.push([f.px + f.lx * lp, f.py + f.ly * lp + 0.06, f.pz + f.lz * lp]);
    });
    instanced(Decor.lampPost(), lamF(), poles, {});
    const bg = new THREE.BufferGeometry().setFromPoints(bulbs);
    const bp = new THREE.Points(bg, new THREE.PointsMaterial({ color: 0xffe0a0, size: 3.2, map: Tex.glow(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    tr.group.add(bp);
    const poolGeo = new THREE.CircleGeometry(5.5, 24); poolGeo.rotateX(-Math.PI / 2);
    const poolMat = new THREE.MeshBasicMaterial({ map: Tex.glow(), color: 0xffc070, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false });
    const poolIM = new THREE.InstancedMesh(poolGeo, poolMat, pools.length);
    pools.forEach(([x, y, z], i) => { tmpM.makeTranslation(x, y, z); poolIM.setMatrixAt(i, tmpM); });
    poolIM.renderOrder = 2;
    tr.group.add(poolIM);
    // distant skyline ring
    const sky = [];
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * TAU, d = b.r + 260 + rng() * 200;
      const w = lerp(20, 45, rng()), h = lerp(40, 190, rng());
      const g = new THREE.BoxGeometry(w, h, w);
      const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 4, uv.getY(k) * Math.round(h / 16));
      g.translate(b.cx + Math.cos(a) * d, h / 2 - 2, b.cz + Math.sin(a) * d);
      sky.push(g);
    }
    for (let k = 0; k < 3; k++) {
      const geos = sky.filter((_, i) => i % 3 === k);
      for (const g of geos) tr.group.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x14142a, emissive: 0xffffff, emissiveMap: Tex.windows(10 + k, k), emissiveIntensity: 0.9, roughness: 0.8 })));
    }
    instanced(Decor.palmTree(), lamF({ e: 0x111122 }), spots(16, { minD: 4, maxEdge: 14 }), { smin: 0.9, smax: 1.2 });
    stars(1600, 0.05);
    // moon
    const moon = new THREE.Mesh(new THREE.SphereGeometry(40, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff4d6, fog: false }));
    const md = new THREE.Vector3(...tr.theme.sunDir).normalize().multiplyScalar(1500);
    tr.followers.push({ obj: moon, offset: md });
    tr.group.add(moon);
  }

  /* --------------------------------- SPACE -------------------------------- */
  if (th === 'space') {
    stars(3200, -1);
    // planets
    const planetCols = [['#ff9a5a', '#ffd08a', '#c0583a'], ['#5ab0ff', '#b8e0ff', '#2a5ab0'], ['#c07bff', '#ffb0f0', '#6a3ab0'], ['#7bffb0', '#d0ffe8', '#2a9a6a']];
    planetCols.forEach((cols, i) => {
      const c = makeCanvas(256, 128), g = c.getContext('2d');
      for (let y = 0; y < 128; y += 4) { g.fillStyle = cols[Math.floor((Math.sin(y * 0.15 + i) * 0.5 + 0.5) * 2.99)]; g.fillRect(0, y, 256, 4); }
      const tex = canvasTexture(c);
      const R = lerp(50, 120, rng());
      const p = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 20), new THREE.MeshLambertMaterial({ map: tex, emissive: 0x222233, fog: false }));
      const a = (i / 4) * TAU + 0.6, d = 900 + rng() * 300;
      const pos = new THREE.Vector3(b.cx + Math.cos(a) * d, lerp(-80, 260, rng()), b.cz + Math.sin(a) * d);
      p.position.copy(pos); p.rotation.z = 0.4;
      tr.group.add(p);
      if (i % 2 === 0) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(R * 1.4, R * 2.1, 48), new THREE.MeshBasicMaterial({ color: cols[1], transparent: true, opacity: 0.5, side: THREE.DoubleSide, fog: false }));
        ring.position.copy(pos); ring.rotation.x = -1.2; ring.rotation.y = 0.3;
        tr.group.add(ring);
      }
      tr.updaters.push((dt) => { p.rotation.y += dt * 0.03; });
    });
    // nebula clouds
    const nebCols = [0xff3fd1, 0x29a4ff, 0x9b5cff, 0x2fe0b0, 0xff8a3d];
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.glow(), color: nebCols[i % nebCols.length], transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      const a = rng() * TAU, d = 700 + rng() * 500;
      s.position.set(b.cx + Math.cos(a) * d, lerp(-200, 300, rng()), b.cz + Math.sin(a) * d);
      s.scale.setScalar(lerp(400, 800, rng()));
      tr.group.add(s);
    }
    // floating asteroids
    const ast = [];
    for (let i = 0; i < 70 * density; i++) {
      const a = rng() * TAU, d = b.r * lerp(0.2, 1.6, rng());
      const x = b.cx + Math.cos(a) * d, z = b.cz + Math.sin(a) * d;
      const q = tr.nearest(x, z, 60);
      if (q && Math.abs(q.lateral) < q.width / 2 + 12) continue;
      ast.push({ x, y: lerp(-60, 50, rng()), z, s: lerp(1.5, 8, rng()), rx: rng() * 3, ry: rng() * 3, sp: lerp(0.1, 0.4, rng()) });
    }
    const astIM = new THREE.InstancedMesh(Decor.asteroid(5), lamF({ e: 0x221a33 }), ast.length);
    astIM.frustumCulled = false;
    tr.group.add(astIM);
    tr.updaters.push((dt, t) => {
      ast.forEach((a, i) => {
        tmpE.set(a.rx + t * a.sp, a.ry + t * a.sp * 0.7, 0); tmpQ.setFromEuler(tmpE);
        tmpP.set(a.x, a.y + Math.sin(t * 0.3 + i) * 2, a.z); tmpS.setScalar(a.s);
        tmpM.compose(tmpP, tmpQ, tmpS); astIM.setMatrixAt(i, tmpM);
      });
      astIM.instanceMatrix.needsUpdate = true;
    });
    // flying saucers
    for (let i = 0; i < 3; i++) {
      const u = new THREE.Mesh(Decor.ufo(), lamF({ flat: false, e: 0x333355 }));
      const R = b.r * lerp(0.4, 0.9, rng()), y = lerp(25, 45, rng()), ph = rng() * TAU, sp = lerp(0.1, 0.2, rng());
      tr.group.add(u);
      tr.updaters.push((dt, t) => { const a = t * sp + ph; u.position.set(b.cx + Math.cos(a) * R, y + Math.sin(t * 1.3 + ph) * 2, b.cz + Math.sin(a) * R); u.rotation.y += dt; });
    }
    // glowing pylons under rail sections
    const pyl = [];
    for (let s = 0; s < tr.L; s += 40) {
      const f = tr.frameAt(s);
      pyl.push([f.px, f.py - 30, f.pz, 0, 1]);
    }
    const pylon = new THREE.Mesh(G.cyl(0.6, 0.2, 60, 8), new THREE.MeshBasicMaterial({ color: 0x6a3cff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
    instanced(pylon.geometry, pylon.material, pyl, {});
  }
}
