// Ilustraciones de ejercicios en vista isométrica: personaje plano con ropa (remera amarilla, short gris, zapatillas),
// con contorno, animado entre la postura a y la b (SMIL, sin librerías). Generadas por código: sin imágenes de terceros.
// Las posturas de data.js son de perfil (o de frente); acá se pasan a 3D (x adelante, y arriba, z hacia la derecha del
// personaje) y se proyectan con una cámara isométrica. Cada parte es una cápsula proyectada; se anima interpolando su
// contorno (atributo d). Las partes de un miembro forman una sola silueta, los miembros se ordenan por profundidad
// y el músculo que trabaja el ejercicio se ilumina en rojo.

const PAL = {
  line: '#22262D', skin: '#F1C6A3', skin2: '#D9A684', shirt: '#F6C514', shirt2: '#D7A90B', shorts: '#5E6673', shorts2: '#454C58',
  shoe: '#FFFFFF', shoe2: '#D3D7DD', hair: '#3A2A1F', db: '#2F7BEA', db2: '#1F5FBF', bar: '#9AA3AF', kb: '#33383F',
  wood: '#8A5A3C', wood2: '#6E452D', wall: '#E3E6EA', floor: '#E6E9ED', floor2: '#CDD2D8', floor3: '#BAC0C8',
  shadow: 'rgba(38,42,49,.12)', muscle: '#E5262E',
};
const OW = 3.2;   // grosor del contorno: la mitad queda afuera de la silueta

// ——— Vectores y cámara ———
const add3 = (p, q) => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const sub3 = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const scl3 = (p, k) => [p[0] * k, p[1] * k, p[2] * k];
const dot3 = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const cross3 = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
const unit3 = (p) => scl3(p, 1 / (Math.hypot(...p) || 1));
const mix3 = (p, q, t) => add3(p, scl3(sub3(q, p), t));
const mix = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
const unit = (dx, dy) => { const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
const r1 = (n) => Math.round(n * 10) / 10;
const pt2 = (q) => `${r1(q[0])} ${r1(q[1])}`;
// Cámara: girada 40° hacia el frente del personaje y elevada 28° (vista isométrica suave).
const CAM = (() => {
  const a = (40 * Math.PI) / 180, b = (28 * Math.PI) / 180;
  return { r: [Math.cos(a), 0, -Math.sin(a)], u: [-Math.sin(a) * Math.sin(b), Math.cos(b), -Math.cos(a) * Math.sin(b)], v: [Math.sin(a) * Math.cos(b), Math.sin(b), Math.cos(a) * Math.cos(b)] };
})();
const prj = (P) => [100 + dot3(P, CAM.r), 150 - dot3(P, CAM.u)];   // punto 3D → pantalla (y hacia abajo)
const prjV = (d) => [dot3(d, CAM.r), -dot3(d, CAM.u)];              // dirección 3D → pantalla
const depth = (P) => dot3(P, CAM.v);                                 // más grande = más cerca

// ——— De la postura de data.js a 3D ———
const LIMB_Z = { E: 13, W: 13, K: 6.5, F: 6.5, T: 6.5 };   // distancia al centro del cuerpo (hacia los costados)
const UA = 19.5, FA = 23;                                  // largo de brazo y antebrazo (para deducir la profundidad de frente)
function pose3D(raw, f) {
  const front = !!f.front, zo = f.z || {}, J = {};
  const V = (pt, z) => (front ? [0, 150 - pt[1], z] : [pt[0] - 100, 150 - pt[1], z]);
  J.N = V(raw.N, 0); J.P = V(raw.P, 0);
  if (front) { J.N[2] = 100 - raw.N[0]; J.P[2] = 100 - raw.P[0]; }
  J.up = unit3(sub3(J.N, J.P)); J.fw = [J.up[1], -J.up[0], 0]; J.lat = [0, 0, 1];
  J.H = add3(J.N, scl3(J.up, 13));
  for (const n of ['1', '2']) {
    const s = n === '1' ? 1 : -1, get = (k) => raw[k + n] ?? raw[k + '1'];   // lado lejano sin dato: espejo del cercano
    J['S' + n] = front ? add3(J.N, [0, -4, 12.5 * s]) : add3(mix3(J.N, J.P, 0.12), [0, 0, 12.5 * s]);
    J['Hp' + n] = add3(J.P, [0, 0, 6.5 * s]);
    for (const k of ['E', 'W', 'K', 'F', 'T']) {
      const p = get(k); if (!p) continue;
      let z = zo[k] ?? LIMB_Z[k];
      if (front && zo[k] == null) z = Math.max(s * (100 - p[0]), z);
      J[k + n] = V(p, z * s);
    }
    J['T' + n] ??= add3(J['F' + n], [10, 0, 0]);
    if (front && J['E' + n]) {   // de frente, un brazo que se ve corto va hacia adelante
      const yz = (a, b) => Math.hypot(a[1] - b[1], a[2] - b[2]);
      J['E' + n][0] = Math.sqrt(Math.max(0, UA ** 2 - yz(J['E' + n], J['S' + n]) ** 2));
      if (J['W' + n]) J['W' + n][0] = J['E' + n][0] + Math.sqrt(Math.max(0, FA ** 2 - yz(J['W' + n], J['E' + n]) ** 2));
    }
  }
  return J;
}

// ——— Formas proyectadas ———
// Cápsula de p a q (2D), radio ra en p y rb en q (misma estructura siempre, para poder interpolar).
function capsule(p, q, ra, rb) {
  const [ux, uy] = unit(q[0] - p[0], q[1] - p[1]), nx = -uy, ny = ux;
  const P = (c, r, s) => `${r1(c[0] + nx * r * s)} ${r1(c[1] + ny * r * s)}`;
  return `M${P(p, ra, 1)}L${P(q, rb, 1)}A${rb} ${rb} 0 0 0 ${P(q, rb, -1)}L${P(p, ra, -1)}A${ra} ${ra} 0 0 0 ${P(p, ra, 1)}Z`;
}
// Elipse con centro c y semiejes A y B (vectores 2D), con curvas de Bézier (estructura fija).
function ellipse(c, A, B) {
  const k = 0.5523, P = (a, b) => pt2([c[0] + A[0] * a + B[0] * b, c[1] + A[1] * a + B[1] * b]);
  return `M${P(1, 0)}C${P(1, k)} ${P(k, 1)} ${P(0, 1)}C${P(-k, 1)} ${P(-1, k)} ${P(-1, 0)}C${P(-1, -k)} ${P(-k, -1)} ${P(0, -1)}C${P(k, -1)} ${P(1, -k)} ${P(1, 0)}Z`;
}
const circlePath = (c, r) => ellipse(c, [r, 0], [0, r]);
// Disco 3D (centro, normal, radio) proyectado: devuelve centro y semiejes (el primero, el mayor).
function disc(c3, n, R) {
  let e1 = cross3(n, CAM.v); if (Math.hypot(...e1) < 1e-3) e1 = cross3(n, [0, 1, 0]);
  e1 = unit3(e1); const e2 = unit3(cross3(n, e1));
  return [prj(c3), prjV(scl3(e1, R)), prjV(scl3(e2, R))];
}
// Músculo: huso a lo largo del segmento entre t0 y t1, centrado en o (fracción del radio, sobre la normal) y de medio ancho w.
function lens([p, q, ra, rb], o, t0, t1, w) {
  const [ux, uy] = unit(q[0] - p[0], q[1] - p[1]), n = [-uy, ux];
  const R = (t) => ra + (rb - ra) * Math.min(1, Math.max(0, t));
  const P = (t, k) => { const m = mix(p, q, t), r = R(t) * k; return `${r1(m[0] + n[0] * r)} ${r1(m[1] + n[1] * r)}`; };
  const tm = (t0 + t1) / 2;
  return `M${P(t0, o)}Q${P(tm, o + 2 * w)} ${P(t1, o)}Q${P(tm, o - 2 * w)} ${P(t0, o)}Z`;
}
// Ancho proyectado de una sección elíptica del torso (semiejes al costado y hacia adelante) medido según la normal m.
const halfWidth = (J, side, fwd, m) => { const a = prjV(scl3(J.lat, side)), b = prjV(scl3(J.fw, fwd)); return Math.hypot(a[0] * m[0] + a[1] * m[1], b[0] * m[0] + b[1] * m[1]); };

// Dónde se ilumina cada músculo: [segmento, centro, t0, t1, medio ancho]. Centro negativo = adelante del segmento
// (pecho, bíceps, cuádriceps), positivo = atrás; se gira según cuánto de ese lado ve la cámara.
const MUS = {
  delt: [['ua', 0, -0.14, 0.46, 0.9]], biceps: [['ua', -0.35, 0.28, 0.98, 0.6]], triceps: [['ua', 0.35, 0.22, 0.98, 0.6]],
  forearm: [['fa', 0, 0.02, 0.84, 0.85]], chest: [['to', -0.45, 0.06, 0.46, 0.5]], abs: [['to', -0.5, 0.48, 0.94, 0.45]],
  back: [['to', 0.45, 0.04, 0.62, 0.5]], lumbar: [['to', 0.5, 0.58, 0.96, 0.45]], glutes: [['th', 0.4, -0.16, 0.34, 0.58]],
  quads: [['th', -0.35, 0.12, 0.94, 0.62]], hams: [['th', 0.35, 0.34, 0.96, 0.62]], calves: [['sh', 0.35, 0.04, 0.6, 0.62]],
};

function figureSVG(ex, { animate = true, size = '', crop = false, muscles = true } = {}) {
  const f = ex.fig, L = PAL.line;
  const A = pose3D(f.a, f), B = f.b ? pose3D({ ...f.a, ...f.b }, f) : null;
  const both = (fn) => (B ? [fn(A), fn(B)] : [fn(A)]);
  const dur = `${f.dur || 3}s`;
  const ease = `keyTimes="0;.5;1" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1" dur="${dur}" repeatCount="indefinite"`;
  const anim = (attr, a, b) => (animate && B && a !== b ? `<animate attributeName="${attr}" values="${a};${b};${a}" ${ease}/>` : '');
  // Forma que depende de la postura: se calcula para a y b y se anima el contorno.
  const path = (fn, attrs, extra = '') => {
    const da = fn(A); if (!da) return '';
    const db = B ? fn(B) : da;
    return `<path d="${da}" ${attrs}>${anim('d', da, db)}${extra}</path>`;
  };
  // Una sola silueta por grupo: primero todas las formas engrosadas en color de línea, después los rellenos sin borde.
  const group = (parts, over = '') => parts.map(([fn]) => path(fn, `fill="${L}" stroke="${L}" stroke-width="${OW}" stroke-linejoin="round"`)).join('')
    + parts.map(([fn, fill]) => path(fn, `fill="${fill}"`)).join('') + over;
  const shade = (n, k) => PAL[k + (n === '2' ? '2' : '')];

  // Segmentos proyectados [desde, hasta, radio inicial, radio final] y su dirección "adelante" en 3D.
  const SEG = {
    ua: (J, n) => J['E' + n] && [J['S' + n], J['E' + n], 5.2, 4.3],
    fa: (J, n) => J['W' + n] && [J['E' + n], J['W' + n], 4.3, 3.3],
    th: (J, n) => J['K' + n] && [J['Hp' + n], J['K' + n], 7.6, 5.8],
    sh: (J, n) => J['F' + n] && [J['K' + n], J['F' + n], 5.6, 3.9],
    to: (J) => {
      const a = mix3(J.N, J.P, -0.06), b = mix3(J.N, J.P, 0.86), [p, q] = [prj(a), prj(b)], [ux, uy] = unit(q[0] - p[0], q[1] - p[1]), m = [-uy, ux];
      return [a, b, halfWidth(J, 12.5, 8.5, m), halfWidth(J, 11, 7.5, m)];
    },
  };
  const seg2 = (key, J, n) => { const s = SEG[key](J, n); return s && [prj(s[0]), prj(s[1]), s[2], s[3]]; };
  const front3 = (key, J, n) => {   // hacia dónde mira la cara anterior del segmento
    if (key === 'to' || f.front) return J.fw;
    const s = SEG[key](J, n), d = sub3(s[1], s[0]), a = [-d[1], d[0], 0];
    return Math.hypot(...a) < 1e-3 ? J.fw : unit3(a);
  };
  const seg = (key, n, t0 = 0, t1 = 1, ra, rb) => (J) => {
    const s = seg2(key, J, n); if (!s) return '';
    return capsule(mix(s[0], s[1], t0), mix(s[0], s[1], t1), ra ?? s[2], rb ?? s[3]);
  };
  // Músculos iluminados: más intensos en la postura b (contracción); en los isométricos, un pulso suave.
  const mus = muscles ? ex.mus || [] : [];
  const glow = !animate ? '' : B ? `<animate attributeName="opacity" values=".6;1;.6" ${ease}/>` : '<animate attributeName="opacity" values=".65;1;.65" dur="2.4s" repeatCount="indefinite"/>';
  const musOn = (keys, n) => mus.flatMap((m) => MUS[m] || []).filter(([k]) => keys.includes(k))
    .map(([k, c, t0, t1, w]) => path((J) => {
      const s = seg2(k, J, n); if (!s) return '';
      const [ux, uy] = unit(s[1][0] - s[0][0], s[1][1] - s[0][1]), fa = prjV(front3(k, J, n));
      return lens(s, -c * (fa[0] * -uy + fa[1] * ux), t0, t1, w);
    }, `fill="${n === '2' ? '#B81D24' : PAL.muscle}" stroke="#9E1219" stroke-width=".7" stroke-linejoin="round" opacity=".9"`, glow)).join('');

  // ——— Partes del cuerpo ———
  const legParts = (n) => [
    [seg('th', n), shade(n, 'skin')], [seg('sh', n), shade(n, 'skin')], [seg('th', n, 0, 0.6, 8.8, 7.2), shade(n, 'shorts')],
    [(J) => capsule(prj(J['F' + n]), prj(J['T' + n]), 4.4, 3.6), shade(n, 'shoe')],
  ];
  const armParts = (n) => [[seg('ua', n), shade(n, 'skin')], [seg('fa', n), shade(n, 'skin')], [seg('ua', n, -0.05, 0.42, 6.6, 6.1), shade(n, 'shirt')]];
  const hand = (n) => path((J) => (J['W' + n] ? circlePath(prj(J['W' + n]), 3.9) : ''), `fill="${shade(n, 'skin')}" stroke="${L}" stroke-width="1.6"`);
  const torso = (J) => { const [p, q, ra, rb] = seg2('to', J); return capsule(p, q, ra, rb); };
  const pelvis = (J) => {
    const a = mix3(J.N, J.P, 0.8), [p, q] = [prj(a), prj(J.P)], [ux, uy] = unit(q[0] - p[0], q[1] - p[1]), m = [-uy, ux];
    return capsule(p, q, halfWidth(J, 11, 7.5, m), halfWidth(J, 12, 8, m));
  };

  // Cabeza y cara: puntos sobre la cabeza en ejes adelante (a), arriba (b) y costado derecho (c).
  const HR = 10.6, fp = (J, a, b, c) => prj(add3(J.H, add3(scl3(J.fw, a), add3(scl3(J.up, b), scl3(J.lat, c)))));
  const faces = (a, b, c) => dot3(unit3(add3(scl3(A.fw, a), add3(scl3(A.up, b), scl3(A.lat, c)))), CAM.v) > 0.12;
  const stroke = (fn, w) => path(fn, `fill="none" stroke="${L}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`);
  const hair = (J) => {   // casquete: arco por arriba y atrás de la cabeza, de la nuca a la frente
    const c = prj(J.H), u = unit(...prjV(J.up)), fw = prjV(J.fw), h = unit(u[0] - fw[0] * 0.8, u[1] - fw[1] * 0.8), R = HR + 0.4;
    const at = (ang, r) => { const cs = Math.cos(ang), sn = Math.sin(ang); return [c[0] + (h[0] * cs - h[1] * sn) * r, c[1] + (h[0] * sn + h[1] * cs) * r]; };
    return `M${pt2(at(-1.85, R))}A${R} ${R} 0 1 1 ${pt2(at(1.15, R))}Q${pt2(at(-0.4, HR * 0.3))} ${pt2(at(-1.85, R))}Z`;
  };
  const ear = faces(0, 0, 1) ? [[(J) => circlePath(fp(J, 1.2, -1.8, HR - 0.4), 2.6), PAL.skin]] : [];
  const nose = [[(J) => circlePath(fp(J, HR - 0.4, -0.8, 0), 2.2), PAL.skin]];
  const faceParts = [-1, 1].filter((k) => faces(0.9, 0.15, k * 0.36) && dot3(unit3(add3(scl3(A.fw, 0.9), add3(scl3(A.up, 0.15), scl3(A.lat, k * 0.36)))), CAM.v) > 0.42).map((k) =>
    path((J) => circlePath(fp(J, 9.6, 1.6, k * 3.9), 1.4), `fill="${L}"`)
    + stroke((J) => `M${pt2(fp(J, 9.6, 4.8, k * 2.2))}L${pt2(fp(J, 8.4, 5.1, k * 5.8))}`, 1.3)).join('')
    + stroke((J) => `M${pt2(fp(J, 9.4, -4.6, -2.6))}Q${pt2(fp(J, 10.4, -6.6, 0))} ${pt2(fp(J, 9.4, -4.6, 2.6))}`, 1.2)
    + path((J) => circlePath(fp(J, HR + 0.6, -1.4, 0.3), 0.9), `fill="${PAL.skin2}"`)
    + (ear.length ? stroke((J) => `M${pt2(fp(J, 2.2, 0.4, HR))}Q${pt2(fp(J, 0, -1, HR + 0.4))} ${pt2(fp(J, 2.2, -3.6, HR))}`, 1) : '');
  const head = group([
    [(J) => capsule(prj(J.N), prj(mix3(J.N, J.H, 0.55)), 3.6, 3.6), PAL.skin], ...ear, ...nose,
    [(J) => circlePath(prj(J.H), HR), PAL.skin], [hair, PAL.hair],
  ], faceParts);

  // ——— Objetos (mancuernas, pesa rusa, aros, banda, toalla) ———
  const props = [];
  for (const p of f.props || []) {
    props.push(p);
    const mirrored = f.a.W2 === undefined && !f.front && !f.z?.W && !f.one;
    if (p.at === 'W1' && mirrored && ['db', 'ring', 'band'].includes(p.t)) props.push({ ...p, at: 'W2' });
  }
  const propsOf = (n) => props.filter((p) => p.at.slice(-1) === n).map((p) => propSVG(p, A, B, { path, group, anim, ease, animate, front: !!f.front }));
  const arm = (n) => {
    const ps = propsOf(n);
    return group(armParts(n), musOn(['ua', 'fa'], n)) + ps.map((p) => p.under).join('') + hand(n) + ps.map((p) => p.over).join('');
  };

  // Grupos ordenados por profundidad (promedio de las dos posturas).
  const zOf = (fn) => both(fn).reduce((s, x) => s + x, 0) / (B ? 2 : 1);
  const avgD = (keys) => (J) => keys.filter((k) => J[k]).reduce((s, k, _, arr) => s + depth(J[k]) / arr.length, 0);
  const groups = [
    { z: zOf(avgD(['N', 'P'])), svg: group([[pelvis, PAL.shorts], [torso, PAL.shirt]], musOn(['to'], '1')) },
    { z: zOf((J) => depth(J.H)) + 4, svg: head },
    ...['1', '2'].flatMap((n) => [
      { z: zOf(avgD(['S' + n, 'E' + n, 'W' + n])) + 2, svg: arm(n) },
      { z: zOf(avgD(['Hp' + n, 'K' + n, 'F' + n])), svg: group(legParts(n), musOn(['th', 'sh'], n)) },
    ]),
  ].sort((a, b) => a.z - b.z);

  // Piso: baldosa isométrica que abarca al personaje y la escena; sombra debajo del cuerpo.
  const pts3 = [A, B || A].flatMap((J) => ['N', 'P', 'H', 'S1', 'S2', 'E1', 'E2', 'W1', 'W2', 'K1', 'K2', 'F1', 'F2', 'T1', 'T2'].filter((k) => J[k]).map((k) => J[k]));
  const scene = (f.scene || []).map((s) => sceneBoxes(s, !!f.front, A));
  const sceneP = scene.flatMap((s) => s.pts);
  const xs = [...pts3, ...sceneP].map((p) => p[0]), zs = [...pts3, ...sceneP].map((p) => p[2]);
  const X0 = Math.min(...xs) - 18, X1 = Math.max(...xs) + 18, Z0 = Math.min(-26, ...zs) - 12, Z1 = Math.max(26, ...zs) + 12;
  const floor = box([X0, X1], [-7, 0], [Z0, Z1], [PAL.floor, PAL.floor2, PAL.floor3], 'rgba(34,38,45,.18)');
  const cx = (A.P[0] + (A.F1?.[0] ?? A.P[0])) / 2, sh = disc([cx, 0, 0], [0, 1, 0], 1);
  const shadow = `<path d="${ellipse(sh[0], scl3(sh[1], 30).slice(0, 2), scl3(sh[2], 18).slice(0, 2))}" fill="${PAL.shadow}"/>`;

  // Encuadre: miniaturas cuadradas alrededor del cuerpo; grande, 200×170 con el piso y la escena.
  const p2 = pts3.map(prj).concat([A, B || A].map((J) => { const c = prj(J.H); return [c[0], c[1] - HR - 4]; }));
  const fl = [[X0, -7, Z0], [X1, -7, Z0], [X0, -7, Z1], [X1, -7, Z1], [X1, 0, Z1]].map(prj);
  const bb = (ps) => [Math.min(...ps.map((q) => q[0])), Math.min(...ps.map((q) => q[1])), Math.max(...ps.map((q) => q[0])), Math.max(...ps.map((q) => q[1]))];
  let vb;
  if (crop) {
    const [x0, y0, x1, y1] = bb(p2), side = Math.max(x1 - x0, y1 - y0) + 26, cxx = (x0 + x1) / 2, cyy = (y0 + y1) / 2;
    vb = [cxx - side / 2, cyy - side / 2, side, side];
  } else {
    const [x0, y0, x1, y1] = bb([...p2, ...fl, ...sceneP.map(prj)]);
    let w = x1 - x0 + 16, h = y1 - y0 + 16;
    if (w / h > 200 / 170) h = (w * 170) / 200; else w = (h * 200) / 170;
    vb = [(x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - h / 2, w, h];
  }
  return `<svg class="fig ${size}" viewBox="${vb.map(r1).join(' ')}" role="img" aria-label="Ilustración: ${ex.name}">
    ${floor}${shadow}${scene.map((s) => s.svg).join('')}${groups.map((g) => g.svg).join('')}</svg>`;
}

// Caja 3D [x], [y], [z] con las tres caras visibles (arriba, frente y costado) en tonos de un mismo color.
function box(X, Y, Z, [top, side1, side2], line = PAL.line) {
  const c = (i, j, k) => prj([X[i], Y[j], Z[k]]), poly = (ps) => `M${ps.map(pt2).join('L')}Z`;
  const faces = [
    [c(0, 1, 0), c(1, 1, 0), c(1, 1, 1), c(0, 1, 1)], [c(0, 0, 1), c(1, 0, 1), c(1, 1, 1), c(0, 1, 1)], [c(1, 0, 0), c(1, 0, 1), c(1, 1, 1), c(1, 1, 0)],
  ];
  return faces.map((ps, i) => `<path d="${poly(ps)}" fill="${[top, side1, side2][i]}" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/>`).join('');
}
const tones = (c1, c2, c3) => [c1, c2, c3 || c2];
// Escenas (silla, banco, pared, barra, columna, máquina) armadas con cajas. Se dibujan detrás del personaje.
function sceneBoxes(s, front, A) {
  // Coordenadas de data.js (x, y del dibujo; d = profundidad) → 3D.
  const M = (x, y, d) => (front ? [d, 150 - y, 100 - x] : [x - 100, 150 - y, d]);
  const parts = [], pts = [];
  const add = (xs, ys, ds, col) => {
    const P = [M(xs[0], ys[0], ds[0]), M(xs[1], ys[1], ds[1])];
    const X = [Math.min(P[0][0], P[1][0]), Math.max(P[0][0], P[1][0])], Y = [Math.min(P[0][1], P[1][1]), Math.max(P[0][1], P[1][1])], Z = [Math.min(P[0][2], P[1][2]), Math.max(P[0][2], P[1][2])];
    parts.push(box(X, Y, Z, col)); pts.push([X[0], Y[0], Z[0]], [X[1], Y[1], Z[1]]);
  };
  const W = tones('#9C6A4A', PAL.wood, PAL.wood2), MET = tones('#B4BBC4', '#9AA3AF', '#848D99'), PAD = tones('#454B55', '#2F343C', '#262A31');
  if (s.t === 'wall') { const x = s.left ? [s.x - 5, s.x] : [s.x, s.x + 5]; add(x, [150, 40], [-34, 34], tones('#EEF0F3', PAL.wall, '#D5D9DE')); }
  if (s.t === 'chair') {
    for (const lx of [s.x + 2, s.x + s.w - 6]) for (const d of [-13, 9]) add([lx, lx + 4], [150, s.y + 5], [d, d + 4], W);
    const bx = s.back === 'left' ? s.x : s.x + s.w - 4;
    for (const d of [-13, 9]) add([bx, bx + 4], [s.y, s.y - 40], [d, d + 4], W);
    add([bx - 0.5, bx + 4.5], [s.y - 26, s.y - 42], [-14, 14], W);
    add([s.x - 2, s.x + s.w + 2], [s.y + 6, s.y], [-15, 15], W);
  }
  if (s.t === 'bench') {
    for (const lx of [s.x + 8, s.x + s.w - 14]) add([lx, lx + 6], [150, s.y + 6], [-9, 9], MET);
    add([s.x, s.x + s.w], [s.y + 8, s.y], [-12, 12], PAD);
  }
  if (s.t === 'bar') {
    for (const d of [-34, 30]) add([97, 101], [150, -16], [d, d + 4], MET);
    add([96, 100], [s.y + 2, s.y - 2], [-34, 34], MET);
  }
  if (s.t === 'stack') {
    add([s.x, s.x + 30], [150, 20], [-16, 16], tones('#E1E4E8', '#D1D5DB', '#BFC4CB'));
    for (let i = 0; i < 6; i++) add([s.x + 4, s.x + 26], [144 - i * 6, 139 - i * 6], [-11, 11], tones('#5B6573', '#4B5563', '#3D4652'));
  }
  if (s.t === 'post') add([s.x - 3, s.x + 3], [150, 0], [-3, 3], MET);
  // Las escenas se dibujan de atrás hacia adelante dentro de sí mismas (orden de armado).
  return { svg: parts.join(''), pts };
}

// Mancuerna según el agarre: 'end' con el mango hacia los costados (palmas abajo o arriba), 'neutral' perpendicular al
// antebrazo, 'along' a lo largo del antebrazo. Con dos agarres (p. ej. ['end', 'neutral']) pasa de uno al otro.
function handleDir(grip, J, n, front) {
  if (grip === 'end') return [0, 0, 1];
  const d = unit3(sub3(J['W' + n], J['E' + n]));
  if (grip === 'along') return d;
  const a = [-d[1], d[0], 0];
  return front || Math.hypot(...a) < 1e-3 ? [1, 0, 0] : unit3(a);
}
function propSVG(p, A, B, { path, group, anim, ease, animate, front }) {
  const L = PAL.line, n = p.at.slice(-1);
  const posOf = (J) => (p.mid ? mix3(J.W1, J.W2, 0.5) : J[p.at]);
  if (p.t === 'db') {
    const one = (grip, extra = '') => {
      // Discos: cilindro (cara interna, costado y cara externa) a cada lado de la mano; mango entre ellos.
      const plate = (sgn) => {
        const geo = (J) => { const h = handleDir(grip, J, n, front), w = posOf(J), cIn = add3(w, scl3(h, sgn * 8)), cOut = add3(w, scl3(h, sgn * 12)); return [disc(cIn, h, 7.2), disc(cOut, h, 7.2)]; };
        const quad = (J) => { const [[c1, a1], [c2, a2]] = geo(J); return `M${pt2([c1[0] + a1[0], c1[1] + a1[1]])}L${pt2([c2[0] + a2[0], c2[1] + a2[1]])}L${pt2([c2[0] - a2[0], c2[1] - a2[1]])}L${pt2([c1[0] - a1[0], c1[1] - a1[1]])}Z`; };
        return group([[(J) => ellipse(...geo(J)[0]), PAL.db2], [quad, PAL.db2], [(J) => ellipse(...geo(J)[1]), PAL.db]],
          path((J) => { const [c, a, b] = geo(J)[1]; return ellipse(c, scl3([...a, 0], 0.3).slice(0, 2), scl3([...b, 0], 0.3).slice(0, 2)); }, `fill="${PAL.bar}" stroke="${L}" stroke-width="1"`));
      };
      const bar = path((J) => { const h = handleDir(grip, J, n, front), w = posOf(J); return capsule(prj(add3(w, scl3(h, -9))), prj(add3(w, scl3(h, 9))), 1.9, 1.9); }, `fill="${PAL.bar}" stroke="${L}" stroke-width="1.2"`);
      const nearSign = dot3(handleDir(grip, A, n, front), CAM.v) >= 0 ? 1 : -1;
      return { under: `<g${extra}>${plate(-nearSign)}${bar}</g>`, over: `<g${extra}>${plate(nearSign)}</g>` };
    };
    if (Array.isArray(p.grip)) {
      const fade = (v) => (animate ? `<animate attributeName="opacity" values="${v}" ${ease}/>` : '');
      const [g1, g2] = [one(p.grip[0], ` opacity="1"`), one(p.grip[1], ` opacity="0"`)];
      const inject = (s, v) => s.replace('>', `>${fade(v)}`);
      return { under: inject(g1.under, '1;0;1') + inject(g2.under, '0;1;0'), over: inject(g1.over, '1;0;1') + inject(g2.over, '0;1;0') };
    }
    return one(p.grip || (front ? 'end' : 'neutral'));
  }
  const a = prj(posOf(A)), b = B ? prj(posOf(B)) : a;
  const move = animate && B && (a[0] !== b[0] || a[1] !== b[1])
    ? `<animateTransform attributeName="transform" type="translate" values="${pt2(a)};${pt2(b)};${pt2(a)}" ${ease}/>` : '';
  const place = (s) => `<g transform="translate(${pt2(a)})">${move}${s}</g>`;
  if (p.t === 'kb') return { under: place(`<path d="M-5.5 5V-.5a5.5 5.5 0 0111 0V5" fill="none" stroke="${L}" stroke-width="5"/><path d="M-5.5 5V-.5a5.5 5.5 0 0111 0V5" fill="none" stroke="${PAL.kb}" stroke-width="2.6"/><circle cx="0" cy="12" r="9" fill="${PAL.kb}" stroke="${L}" stroke-width="1.5"/><path d="M-4 8a5 5 0 014-2" stroke="#6B7280" stroke-width="1.6" fill="none" stroke-linecap="round"/>`), over: '' };
  const M = (x, y, J) => (front ? [J[p.at][0] + 30, 150 - y, 100 - x] : [x - 100, 150 - y, J[p.at][2]]);
  if (p.t === 'towel') {   // toalla enrollada entre las dos manos
    const ln = (w, extra) => path((J) => `M${pt2(prj(J[p.at]))}L${pt2(prj(J[p.to]))}`, `fill="none" stroke-width="${w}" stroke-linecap="round" ${extra}`);
    return { under: ln(9, `stroke="${L}"`) + ln(6.4, 'stroke="#7FB3D5"') + ln(6.4, 'stroke="#5E97BF" stroke-dasharray="2 3"'), over: '' };
  }
  if (p.t === 'band') {
    const anchor = (J) => prj(M(p.x, p.y, J));
    return { under: path((J) => `M${pt2(anchor(J))}L${pt2(prj(J[p.at]))}`, 'fill="none" stroke="#E5484D" stroke-width="3" stroke-linecap="round"') + path((J) => circlePath(anchor(J), 3), `fill="#E5484D" stroke="${L}" stroke-width="1"`), over: '' };
  }
  if (p.t === 'ring') {
    const top = (J) => prj([J[p.at][0], 175, J[p.at][2]]);
    return { under: path((J) => { const w = prj(J[p.at]); return `M${pt2(top(J))}L${pt2([w[0], w[1] - 5])}`; }, 'fill="none" stroke="#1F2937" stroke-width="2.2"')
      + path((J) => circlePath(prj(J[p.at]), 5.5), `fill="none" stroke="${L}" stroke-width="3.6"`) + path((J) => circlePath(prj(J[p.at]), 5.5), 'fill="none" stroke="#8B5E3C" stroke-width="2"'), over: '' };
  }
  return { under: '', over: '' };
}
