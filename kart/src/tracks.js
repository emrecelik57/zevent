/* ============================================================
   Track definitions — control points are [x, z, height, width]
   ============================================================ */
const TRACKS = [
  {
    id: 'prairie', name: 'Prairie Pétillante', theme: 'meadow', music: 'prairie',
    desc: 'Collines, moulins et lac. Le circuit idéal pour apprendre à déraper.',
    scale: 1.55, width: 22, wall: 6, laps: 3,
    pts: [
      [0, 0, 0], [70, 0, 0], [120, 10, 1], [150, 45, 3], [148, 90, 5], [120, 120, 5],
      [80, 118, 3], [55, 90, 1.5], [25, 86, 1], [-5, 108, 2], [-45, 125, 3], [-85, 105, 3],
      [-100, 65, 2], [-85, 30, 1], [-50, 5, 0],
    ],
    lake: [100, 55, 26],
    road: 'asphalt', curb: ['#e8392f', '#f4f2ee'], ground: 'grass', wallStyle: 'blocks',
    itemRows: [0.16, 0.47, 0.76], boosts: [[0.33, -0.3], [0.62, 0.35]], ramps: [[0.88, 0, 0.55]],
    coins: [[0.06, -0.35, 5], [0.24, 0.3, 4], [0.4, 0, 5], [0.55, -0.3, 4], [0.7, 0.3, 5], [0.93, 0.35, 4]],
  },
  {
    id: 'canyon', name: 'Canyon Cactus', theme: 'canyon', music: 'canyon',
    desc: 'Tremplins, mesas et poussière rouge. Gare aux sorties de piste dans le sable.',
    scale: 1.4, width: 20, wall: 5, laps: 3,
    pts: [
      [0, 0, 0], [90, 0, 0], [140, -20, 2], [160, -70, 4], [130, -110, 3], [80, -105, 1],
      [50, -130, 0], [60, -175, 2], [20, -200, 4], [-40, -190, 4], [-70, -150, 2], [-60, -100, 0],
      [-90, -60, -1], [-80, -20, 0], [-40, 0, 0],
    ],
    road: 'dirt', curb: ['#ffffff', '#d9682f'], ground: 'sand', wallStyle: 'rock',
    itemRows: [0.18, 0.5, 0.79], boosts: [[0.065, 0], [0.555, 0]], ramps: [[0.09, 0, 0.6], [0.58, 0, 0.6]],
    coins: [[0.03, 0.35, 5], [0.27, -0.3, 4], [0.38, 0.3, 4], [0.66, -0.3, 5], [0.86, 0.3, 5]],
  },
  {
    id: 'givre', name: 'Pic Givré', theme: 'snow', music: 'snow',
    desc: 'Montée en lacets jusqu’au sommet enneigé, puis descente à tombeau ouvert.',
    scale: 1.35, width: 19, wall: 5, laps: 3,
    pts: [
      [0, 0, 0], [80, 0, 2], [130, -20, 6], [150, -60, 10], [120, -90, 14], [70, -80, 16],
      [40, -110, 18], [60, -150, 20], [110, -160, 20], [140, -190, 18], [110, -230, 14], [50, -235, 10],
      [0, -210, 7], [-30, -170, 5], [-25, -120, 3], [-50, -80, 2], [-45, -35, 1], [-20, -5, 0],
    ],
    road: 'ice', curb: ['#2f7bff', '#f4f8ff'], ground: 'snow', wallStyle: 'snow',
    itemRows: [0.15, 0.45, 0.74], boosts: [[0.3, 0], [0.86, -0.3]], ramps: [],
    coins: [[0.05, -0.3, 5], [0.22, 0.3, 4], [0.37, 0, 4], [0.56, -0.3, 5], [0.66, 0.3, 4], [0.92, 0, 5]],
  },
  {
    id: 'neon', name: 'Néon City', theme: 'city', music: 'neon',
    desc: 'Grands boulevards de nuit, virages à angle droit et turbos lumineux.',
    scale: 1.45, width: 19, wall: 3.5, laps: 3,
    pts: [
      [0, 0, 0], [100, 0, 0], [130, 15, 0], [135, 60, 0], [110, 80, 0], [60, 80, 0],
      [40, 100, 0], [45, 150, 0], [20, 175, 0], [-30, 170, 0], [-50, 140, 0], [-45, 100, 0],
      [-80, 80, 0], [-110, 60, 0], [-115, 20, 0], [-90, -5, 0], [-40, -5, 0],
    ],
    road: 'neon', curb: ['#ff3fd1', '#1b1b28'], ground: 'city', wallStyle: 'neon',
    itemRows: [0.14, 0.44, 0.72], boosts: [[0.05, 0], [0.38, 0.3], [0.62, -0.3], [0.85, 0]], ramps: [],
    coins: [[0.09, -0.35, 5], [0.25, 0.3, 4], [0.5, 0, 5], [0.67, 0.3, 4], [0.92, -0.3, 5]],
  },
  {
    id: 'cosmos', name: 'Route Cosmique', theme: 'space', music: 'cosmic',
    desc: 'Un ruban arc-en-ciel suspendu dans le vide. Pas de murs : ne tombe pas !',
    scale: 1.5, width: 18, wall: 0, laps: 3, void: true,
    pts: [
      [0, 0, 0], [90, 0, 4], [150, 30, 10], [170, 90, 14], [130, 140, 12], [60, 135, 8],
      [20, 170, 10], [-40, 180, 16], [-100, 150, 18], [-120, 90, 14], [-90, 40, 8], [-110, -10, 4],
      [-80, -50, 2], [-30, -40, 0],
    ],
    rails: [[0.1, 0.22], [0.3, 0.42], [0.5, 0.58], [0.66, 0.78], [0.86, 0.95]],
    road: 'cosmic', curb: ['#ffffff', '#b25bff'], ground: null, wallStyle: 'rail',
    itemRows: [0.12, 0.37, 0.62, 0.84], boosts: [[0.06, 0], [0.28, 0.3], [0.46, -0.3], [0.72, 0], [0.97, 0.3]], ramps: [],
    coins: [[0.03, 0, 5], [0.2, -0.3, 4], [0.33, 0.3, 4], [0.53, 0, 5], [0.79, -0.3, 4], [0.9, 0.3, 5]],
  },
];
