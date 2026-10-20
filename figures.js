// Ilustraciones de ejercicios: personaje plano con ropa (remera amarilla, short gris, zapatillas), con contorno,
// animado entre la postura a y la b (SMIL, sin librerías). Generadas por código para esta app: sin imágenes de terceros.
// Cada parte del cuerpo es una cápsula que se afina hacia la punta; se anima interpolando su contorno (atributo d).
// Las partes de un mismo miembro se dibujan como una sola silueta (contorno limpio, sin líneas internas)
// y el músculo que trabaja el ejercicio se ilumina en rojo.

const PAL = {
  line: '#22262D', skin: '#F1C6A3', skin2: '#D9A684', shirt: '#F6C514', shirt2: '#D7A90B', shorts: '#5E6673', shorts2: '#454C58',
  shoe: '#FFFFFF', shoe2: '#D3D7DD', hair: '#3A2A1F', db: '#2F7BEA', db2: '#1F5FBF', bar: '#9AA3AF', kb: '#33383F',
  wood: '#8A5A3C', wood2: '#6E452D', wall: '#E3E6EA', floor: '#D9DDE2', shadow: 'rgba(38,42,49,.10)', muscle: '#E5262E',
};
const OW = 3.2;   // grosor del contorno: la mitad queda afuera de la silueta
const FAR = new Set(['E2', 'W2', 'K2', 'F2', 'T2']);

// Completa las articulaciones que no se dieron: el lado lejano copia al cercano un poco corrido; la punta del pie, adelante del tobillo.
function completePose(p, front) {
  const q = { ...p }, off = (pt, dx, dy) => [pt[0] + dx, pt[1] + dy];
  if (!front) {
    q.E2 ??= off(q.E1, -3, 1); q.W2 ??= off(q.W1, -3, 1); q.K2 ??= off(q.K1, -4, 0); q.F2 ??= off(q.F1, -4, 0);
    q.T1 ??= off(q.F1, 10, 0); q.T2 ??= off(q.F2, 10, 0);
  } else {
    q.T1 ??= off(q.F1, -4, 0); q.T2 ??= off(q.F2, 4, 0);
  }
  return q;
}
const unit = (dx, dy) => { const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
const headOf = (p) => { const [ux, uy] = unit(p.N[0] - p.P[0], p.N[1] - p.P[1]); return [p.N[0] + ux * 13, p.N[1] + uy * 13]; };
const mix = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
const r1 = (n) => Math.round(n * 10) / 10;
const deg = (v) => (Math.atan2(v[1], v[0]) * 180) / Math.PI;

// Contorno de una cápsula de p a q, radio ra en p y rb en q (misma estructura siempre, para poder interpolar).
function capsule(p, q, ra, rb) {
  const [ux, uy] = unit(q[0] - p[0], q[1] - p[1]), nx = -uy, ny = ux;
  const P = (c, r, s) => `${r1(c[0] + nx * r * s)} ${r1(c[1] + ny * r * s)}`;
  return `M${P(p, ra, 1)}L${P(q, rb, 1)}A${rb} ${rb} 0 0 0 ${P(q, rb, -1)}L${P(p, ra, -1)}A${ra} ${ra} 0 0 0 ${P(p, ra, 1)}Z`;
}
const circlePath = (c, r) => `M${r1(c[0] - r)} ${r1(c[1])}A${r} ${r} 0 1 0 ${r1(c[0] + r)} ${r1(c[1])}A${r} ${r} 0 1 0 ${r1(c[0] - r)} ${r1(c[1])}Z`;
// Músculo: huso a lo largo del segmento entre t0 y t1, centrado en c (fracción del radio: -1 adelante, 1 atrás) y de medio ancho w.
function lens([p, q, ra, rb], c, t0, t1, w) {
  const [ux, uy] = unit(q[0] - p[0], q[1] - p[1]), n = [-uy, ux];
  const R = (t) => ra + (rb - ra) * Math.min(1, Math.max(0, t));
  const P = (t, o) => { const m = mix(p, q, t), r = R(t) * o; return `${r1(m[0] + n[0] * r)} ${r1(m[1] + n[1] * r)}`; };
  const tm = (t0 + t1) / 2;
  return `M${P(t0, c)}Q${P(tm, c + 2 * w)} ${P(t1, c)}Q${P(tm, c - 2 * w)} ${P(t0, c)}Z`;
}
// Pelo: media luna sobre la parte de atrás y de arriba de la cabeza, según hacia dónde mira.
function hairPath(c, u, front) {
  const r = 10.6, f = front ? [0, 0] : [-u[1], u[0]], ang = (dx, dy) => Math.atan2(dy, dx);
  const back = front ? ang(-1, 0) : ang(-f[0] * 0.95 + u[0] * 0.3, -f[1] * 0.95 + u[1] * 0.3);
  const fore = front ? ang(1, 0) : ang(f[0] * 0.55 + u[0], f[1] * 0.55 + u[1]);
  const pt = (a, rr) => `${r1(c[0] + Math.cos(a) * rr)} ${r1(c[1] + Math.sin(a) * rr)}`;
  const mid = front ? ang(0, -1) : ang(u[0] - f[0] * 0.2, u[1] - f[1] * 0.2);
  return `M${pt(back, r)}Q${pt(mid, r * (front ? 1.42 : 1.55))} ${pt(fore, r)}Q${pt(mid, r * (front ? 0.35 : 0.55))} ${pt(back, r)}Z`;
}

// Dónde se ilumina cada músculo: [segmento, centro, t0, t1, medio ancho]. De costado el personaje mira a la derecha
// (centro negativo = adelante del segmento). El huso no pasa del borde: |centro| + medio ancho ≤ 1.
const MUS_SIDE = {
  delt: [['ua', 0, -0.14, 0.46, 0.9]], biceps: [['ua', -0.35, 0.28, 0.98, 0.6]], triceps: [['ua', 0.35, 0.22, 0.98, 0.6]],
  forearm: [['fa', 0, 0.02, 0.84, 0.85]], chest: [['to', -0.45, 0.06, 0.46, 0.5]], abs: [['to', -0.5, 0.48, 0.94, 0.45]],
  back: [['to', 0.45, 0.04, 0.62, 0.5]], lumbar: [['to', 0.5, 0.58, 0.96, 0.45]], glutes: [['th', 0.4, -0.16, 0.34, 0.58]],
  quads: [['th', -0.35, 0.12, 0.94, 0.62]], hams: [['th', 0.35, 0.34, 0.96, 0.62]], calves: [['sh', 0.35, 0.04, 0.6, 0.62]],
};
const MUS_FRONT = {
  delt: [['ua', 0, -0.24, 0.44, 0.92]], biceps: [['ua', 0, 0.32, 0.96, 0.75]], triceps: [['ua', 0, 0.32, 0.96, 0.7]],
  forearm: [['fa', 0, 0.02, 0.84, 0.8]], chest: [['pec', 0, 0, 1, 0.9]], abs: [['abs', 0, 0, 1, 0.85]], back: [['lat', 0, 0, 1, 0.9]],
  quads: [['th', 0, 0.24, 0.96, 0.75]], calves: [['sh', 0, 0.08, 0.52, 0.7]], glutes: [], hams: [], lumbar: [],
};

function figureSVG(ex, { animate = true, size = '', crop = false, muscles = true } = {}) {
  const f = ex.fig, front = !!f.front, L = PAL.line;
  const A = completePose(f.a, front);
  const B = f.b ? completePose({ ...f.a, ...f.b }, front) : null;
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
  const far = (n) => n === '2' && !front;
  const shade = (n, k) => PAL[k + (far(n) ? '2' : '')];
  // Hombro: de costado un poco debajo del cuello; de frente, a cada lado. Cadera: de frente, una por pierna.
  const sh = (p, n) => (front ? [p.N[0] + (n === '1' ? -12.5 : 12.5), p.N[1] + 4] : mix(p.N, p.P, 0.12));
  const hip = (p, n) => (front ? [p.P[0] + (n === '1' ? -6 : 6), p.P[1]] : p.P);
  // Segmentos [desde, hasta, radio inicial, radio final] para dibujar e iluminar músculos.
  const SEG = {
    ua: (p, n) => p['E' + n] && [sh(p, n), p['E' + n], 5.2, 4.3],
    fa: (p, n) => p['W' + n] && [p['E' + n], p['W' + n], 4.3, 3.3],
    th: (p, n) => p['K' + n] && [hip(p, n), p['K' + n], 7.6, 5.8],
    sh: (p, n) => p['F' + n] && [p['K' + n], p['F' + n], 5.6, 3.9],
    to: (p) => [mix(p.N, p.P, -0.06), mix(p.N, p.P, 0.86), 11.5, 10],
    pec: (p, n) => { const k = n === '1' ? -1 : 1, [x, y] = p.N; return [[x + k * 2, y + 10.5], [x + k * 11.5, y + 9], 4.6, 4.2]; },
    abs: (p, n) => (n === '1' ? [[p.N[0], p.N[1] + 19], [p.P[0], p.P[1] - 9], 6, 5.4] : null),
    lat: (p, n) => { const k = n === '1' ? -1 : 1; return [[p.N[0] + k * 11.6, p.N[1] + 12], [p.P[0] + k * 9.4, p.P[1] - 13], 3.2, 2.4]; },
  };
  const seg = (key, n, t0 = 0, t1 = 1, ra, rb) => (p) => {
    const s = SEG[key](p, n); if (!s) return '';
    return capsule(mix(s[0], s[1], t0), mix(s[0], s[1], t1), ra ?? s[2], rb ?? s[3]);
  };
  // Músculos iluminados: más intensos en la postura b (contracción); en los isométricos, un pulso suave.
  const mus = muscles ? ex.mus || [] : [];
  const glow = !animate ? '' : B ? `<animate attributeName="opacity" values=".6;1;.6" ${ease}/>` : '<animate attributeName="opacity" values=".65;1;.65" dur="2.4s" repeatCount="indefinite"/>';
  const musOn = (keys, n) => mus.flatMap((m) => (front ? MUS_FRONT : MUS_SIDE)[m] || []).filter(([k]) => keys.includes(k))
    .map(([k, s, t0, t1, w]) => path((p) => { const sg = SEG[k](p, n); return sg ? lens(sg, s, t0, t1, w) : ''; }, `fill="${far(n) ? '#B81D24' : PAL.muscle}" stroke="#9E1219" stroke-width=".7" stroke-linejoin="round" opacity=".9"`, glow)).join('');

  const legParts = (n) => [
    [seg('th', n), shade(n, 'skin')], [seg('sh', n), shade(n, 'skin')], [seg('th', n, front ? 0.05 : 0, 0.6, front ? 7.8 : 9.4, 7.2), shade(n, 'shorts')],
    [(p) => (p['T' + n] ? capsule(p['F' + n], p['T' + n], 4.4, 3.6) : ''), shade(n, 'shoe')],
  ];
  const pelvis = front
    ? [(p) => { const [px, py] = p.P, r = r1; return `M${r(px - 11.5)} ${r(py - 7)}L${r(px + 11.5)} ${r(py - 7)}L${r(px + 13)} ${r(py + 6)}L${r(px - 13)} ${r(py + 6)}Z`; }, PAL.shorts]
    : [(p) => capsule(mix(p.N, p.P, 0.8), p.P, 10.4, 9.8), PAL.shorts];
  const armParts = (n) => [[seg('ua', n), shade(n, 'skin')], [seg('fa', n), shade(n, 'skin')], [seg('ua', n, -0.05, 0.42, 6.6, 6.1), shade(n, 'shirt')]];
  const hand = (n) => path((p) => (p['W' + n] ? circlePath(p['W' + n], 3.9) : ''), `fill="${shade(n, 'skin')}" stroke="${L}" stroke-width="1.6"`);
  // De frente: torso en V (hombros anchos, cintura angosta); de costado: cápsula.
  const r = r1;
  const torso = front
    ? (p) => { const [x, y] = p.N, [px, py] = p.P; return `M${r(x - 15)} ${r(y + 3)}Q${r(x)} ${r(y - 3)} ${r(x + 15)} ${r(y + 3)}L${r(x + 13)} ${r(y + 10)}L${r(px + 11)} ${r(py - 6)}L${r(px - 11)} ${r(py - 6)}L${r(x - 13)} ${r(y + 10)}Z`; }
    : (p) => capsule(mix(p.N, p.P, -0.06), mix(p.N, p.P, 0.86), 11.5, 10);
  const upOf = (p) => unit(p.N[0] - p.P[0], p.N[1] - p.P[1]), fwOf = (p) => { const u = upOf(p); return [-u[1], u[0]]; };
  const at = (fn) => { const a = fn(A), b = fn(B || A); return (attrs) => `<circle cx="${r1(a[0])}" cy="${r1(a[1])}" ${attrs}>${anim('cx', r1(a[0]), r1(b[0]))}${anim('cy', r1(a[1]), r1(b[1]))}</circle>`; };
  const ears = front ? [-1, 1].map((k) => [(p) => circlePath([headOf(p)[0] + k * 10.4, headOf(p)[1] + 1.5], 2.6), PAL.skin]) : [];
  const face = front
    ? [-3.6, 3.6].map((dx) => at((p) => [headOf(p)[0] + dx, headOf(p)[1] + 1.5])(`r="1.3" fill="${L}"`)).join('')
    : at((p) => { const c = headOf(p), u = upOf(p), fw = fwOf(p); return [c[0] + fw[0] * 6 + u[0] * 1.5, c[1] + fw[1] * 6 + u[1] * 1.5]; })(`r="1.3" fill="${L}"`);
  const head = group([
    [(p) => capsule(p.N, mix(p.N, headOf(p), 0.55), 3.6, 3.6), PAL.skin], ...ears,
    [(p) => circlePath(headOf(p), 10.6), PAL.skin], [(p) => hairPath(headOf(p), upOf(p), front), PAL.hair],
  ], face);

  const props = (f.props || []).map((p) => ({ side: p.at.slice(-1), ...propSVG(p, A, B, anim, ease, animate, front) }));
  const propsOf = (n, layer) => props.filter((p) => (front || far(p.side) === far(n))).map((p) => p[layer]).join('');
  const arm = (n) => group(armParts(n), musOn(['ua', 'fa'], n));
  let body;
  if (front) {
    body = group([...legParts('1'), ...legParts('2'), pelvis], musOn(['th', 'sh'], '1') + musOn(['th', 'sh'], '2'))
      + group([[torso, PAL.shirt]], musOn(['pec', 'abs', 'lat'], '1') + musOn(['pec', 'lat'], '2'))
      + arm('1') + arm('2') + head + propsOf('1', 'under') + hand('1') + hand('2') + propsOf('1', 'over');
  } else {
    body = propsOf('2', 'under') + arm('2') + hand('2') + propsOf('2', 'over')
      + group(legParts('2'), musOn(['th', 'sh'], '2'))
      + group([pelvis, ...legParts('1')], musOn(['th', 'sh'], '1'))
      + group([[torso, PAL.shirt]], musOn(['to'], '1'))
      + head + propsOf('1', 'under') + arm('1') + hand('1') + propsOf('1', 'over');
  }
  // Miniaturas: encuadre cuadrado alrededor del cuerpo (todas las posturas), con margen.
  let vb = '0 -12 200 170';
  if (crop) {
    const pts = [A, B || A].flatMap((p) => [...Object.values(p), headOf(p)]);
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    const x0 = Math.min(...xs) - 16, x1 = Math.max(...xs) + 16, y0 = Math.min(...ys) - 16, y1 = Math.min(158, Math.max(...ys) + 10);
    const side = Math.max(x1 - x0, y1 - y0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    vb = `${r1(cx - side / 2)} ${r1(Math.min(cy - side / 2, 158 - side))} ${r1(side)} ${r1(side)}`;
  }
  return `<svg class="fig ${size}" viewBox="${vb}" role="img" aria-label="Ilustración: ${ex.name}">
    <rect x="-100" y="150" width="400" height="12" fill="${PAL.floor}"/>${(f.scene || []).map(sceneSVG).join('')}
    <ellipse cx="${shadowX(A)}" cy="151" rx="46" ry="4.5" fill="${PAL.shadow}"/>${body}</svg>`;
}
const shadowX = (p) => r1(Math.min(150, Math.max(50, ((p.F1?.[0] ?? 100) + (p.P[0])) / 2)));

function sceneSVG(s) {
  const L = PAL.line;
  if (s.t === 'wall') {
    const x0 = s.left ? s.x - 60 : s.x;
    return `<rect x="${x0}" y="-12" width="60" height="162" fill="${PAL.wall}"/><line x1="${s.x}" y1="-12" x2="${s.x}" y2="150" stroke="#BFC5CC" stroke-width="2"/>`;
  }
  if (s.t === 'chair') {
    const bx = s.back === 'left' ? s.x : s.x + s.w - 4, seat = `<rect x="${s.x - 2}" y="${s.y}" width="${s.w + 4}" height="6" rx="2" fill="${PAL.wood}" stroke="${L}" stroke-width="1.4"/>`;
    const legs = [s.x + 2, s.x + s.w - 6].map((x) => `<rect x="${x}" y="${s.y + 5}" width="4" height="${145 - s.y}" fill="${PAL.wood2}" stroke="${L}" stroke-width="1.2"/>`).join('');
    const back = `<rect x="${bx}" y="${s.y - 42}" width="4" height="44" fill="${PAL.wood2}" stroke="${L}" stroke-width="1.2"/><rect x="${s.back === 'left' ? bx - 1 : bx - 3}" y="${s.y - 42}" width="8" height="16" rx="2" fill="${PAL.wood}" stroke="${L}" stroke-width="1.2"/>`;
    return legs + back + seat;
  }
  if (s.t === 'bench') {
    const legs = [s.x + 8, s.x + s.w - 14].map((x) => `<rect x="${x}" y="${s.y + 6}" width="6" height="${144 - s.y}" fill="#9AA3AF" stroke="${L}" stroke-width="1.2"/>`).join('');
    return `${legs}<rect x="${s.x}" y="${s.y}" width="${s.w}" height="8" rx="3" fill="#2F343C" stroke="${L}" stroke-width="1.4"/>`;
  }
  if (s.t === 'bar') return `<rect x="58" y="${s.y - 2}" width="84" height="4" rx="2" fill="#9AA3AF" stroke="${L}" stroke-width="1.2"/><rect x="54" y="-12" width="5" height="162" fill="#C9CED5"/><rect x="141" y="-12" width="5" height="162" fill="#C9CED5"/>`;
  if (s.t === 'stack') {   // máquina genérica: torre de discos con polea
    const plates = Array.from({ length: 7 }, (_, i) => `<rect x="${s.x + 4}" y="${108 + i * 6}" width="22" height="5" rx="1" fill="#4B5563" stroke="${L}" stroke-width=".8"/>`).join('');
    return `<rect x="${s.x}" y="20" width="30" height="130" rx="3" fill="#D1D5DB" stroke="#9CA3AF" stroke-width="1.2"/>${plates}<line x1="${s.x + 15}" y1="28" x2="${s.x + 15}" y2="108" stroke="#6B7280" stroke-width="2"/><circle cx="${s.x + 15}" cy="28" r="5" fill="#9CA3AF" stroke="${L}" stroke-width="1"/>`;
  }
  if (s.t === 'post') return `<rect x="${s.x - 3}" y="-12" width="7" height="162" fill="#C9CED5" stroke="#AEB4BC" stroke-width="1"/>`;
  return '';
}

// Mancuerna según el agarre: 'end' de punta (palmas abajo o arriba: el mango apunta hacia quien mira y se ven los discos),
// 'neutral' de perfil y perpendicular al antebrazo, 'along' de perfil a lo largo del antebrazo.
// Con dos agarres (p. ej. ['end', 'neutral']) pasa de uno al otro: pronación y supinación.
function dumbbell(grip, A, B, p, front, ease, animate) {
  const L = PAL.line, n = p.at.slice(-1);
  if (Array.isArray(grip)) {
    const [g1, g2] = grip.map((g) => dumbbell(g, A, B, p, front, ease, animate));
    const fade = (v) => (animate ? `<animate attributeName="opacity" values="${v}" ${ease}/>` : '');
    const wrap = (s, v, o) => (s ? `<g opacity="${o}">${fade(v)}${s}</g>` : '');
    return { under: wrap(g1.under, '1;0;1', 1) + wrap(g2.under, '0;1;0', 0), over: wrap(g1.over, '1;0;1', 1) + wrap(g2.over, '0;1;0', 0) };
  }
  if (grip === 'end') {
    const [fx, fy] = front ? [0, -3.4] : [-2.6, -3.6], [nx, ny] = front ? [0, 2.4] : [2, 2.6];
    return {
      under: `<line x1="${fx}" y1="${fy}" x2="${nx}" y2="${ny}" stroke="${L}" stroke-width="5" stroke-linecap="round"/><line x1="${fx}" y1="${fy}" x2="${nx}" y2="${ny}" stroke="${PAL.bar}" stroke-width="2.4" stroke-linecap="round"/>`
        + `<circle cx="${fx}" cy="${fy}" r="6.2" fill="${PAL.db2}" stroke="${L}" stroke-width="1.5"/>`,
      over: `<circle cx="${nx}" cy="${ny}" r="6.6" fill="${PAL.db}" stroke="${L}" stroke-width="1.5"/><circle cx="${nx}" cy="${ny}" r="2.2" fill="${PAL.bar}" stroke="${L}" stroke-width="1.1"/>`,
    };
  }
  // De perfil: el ángulo sale del antebrazo en cada postura (el mango es simétrico: se elige el giro más corto).
  const angOf = (P) => deg([P['W' + n][0] - P['E' + n][0], P['W' + n][1] - P['E' + n][1]]) + (grip === 'along' ? 0 : 90);
  const a = r1(angOf(A)); let b = B ? angOf(B) : a;
  while (b - a > 90) b -= 180;
  while (a - b > 90) b += 180;
  b = r1(b);
  const spin = animate && B && a !== b ? `<animateTransform attributeName="transform" type="rotate" values="${a};${b};${a}" ${ease}/>` : '';
  const plate = (x) => `<rect x="${x}" y="-7.5" width="6" height="15" rx="2" fill="${PAL.db}" stroke="${L}" stroke-width="1.4"/><rect x="${x + 1.6}" y="-6" width="1.5" height="12" rx=".7" fill="${PAL.db2}"/>`;
  return { under: `<g transform="rotate(${a})">${spin}<rect x="-9" y="-1.8" width="18" height="3.6" rx="1.2" fill="${PAL.bar}" stroke="${L}" stroke-width="1.2"/>${plate(-14.5)}${plate(8.5)}</g>`, over: '' };
}

function propSVG(p, A, B, anim, ease, animate, front) {
  const L = PAL.line, a = A[p.at], b = B?.[p.at] || a;
  const move = animate && B && (a[0] !== b[0] || a[1] !== b[1])
    ? `<animateTransform attributeName="transform" type="translate" values="${a.join(' ')};${b.join(' ')};${a.join(' ')}" ${ease}/>` : '';
  const place = (s) => (s ? `<g transform="translate(${a.join(' ')})">${move}${s}</g>` : '');
  if (p.t === 'db') {
    const d = dumbbell(p.grip || (front ? 'end' : 'neutral'), A, B, p, front, ease, animate);
    return { under: place(d.under), over: place(d.over) };
  }
  if (p.t === 'kb') return { under: place(`<path d="M-5.5 5V-.5a5.5 5.5 0 0111 0V5" fill="none" stroke="${L}" stroke-width="5"/><path d="M-5.5 5V-.5a5.5 5.5 0 0111 0V5" fill="none" stroke="${PAL.kb}" stroke-width="2.6"/><circle cx="0" cy="12" r="9" fill="${PAL.kb}" stroke="${L}" stroke-width="1.5"/><path d="M-4 8a5 5 0 014-2" stroke="#6B7280" stroke-width="1.6" fill="none" stroke-linecap="round"/>`), over: '' };
  if (p.t === 'towel') {   // toalla enrollada entre las dos manos
    const c = A[p.to], e = B?.[p.to] || c;
    const ln = (w, extra) => `<line x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}" stroke-width="${w}" stroke-linecap="round" ${extra}>${anim('x1', a[0], b[0])}${anim('y1', a[1], b[1])}${anim('x2', c[0], e[0])}${anim('y2', c[1], e[1])}</line>`;
    return { under: ln(9, `stroke="${L}"`) + ln(6.4, 'stroke="#7FB3D5"') + ln(6.4, 'stroke="#5E97BF" stroke-dasharray="2 3"'), over: '' };
  }
  if (p.t === 'band') {
    const band = `<line x1="${p.x}" y1="${p.y}" x2="${a[0]}" y2="${a[1]}" stroke="#E5484D" stroke-width="3" stroke-linecap="round">${anim('x2', a[0], b[0])}${anim('y2', a[1], b[1])}</line>`;
    return { under: `${band}<circle cx="${p.x}" cy="${p.y}" r="3" fill="#E5484D" stroke="${L}" stroke-width="1"/>`, over: '' };
  }
  if (p.t === 'ring') {
    const strap = `<line x1="${p.x}" y1="-12" x2="${a[0]}" y2="${a[1] - 5}" stroke="#1F2937" stroke-width="2.2">${anim('x2', a[0], b[0])}${anim('y2', a[1] - 5, b[1] - 5)}</line>`;
    return { under: `${strap}${place(`<circle r="5.5" fill="none" stroke="${L}" stroke-width="3.6"/><circle r="5.5" fill="none" stroke="#8B5E3C" stroke-width="2"/>`)}`, over: '' };
  }
  return { under: '', over: '' };
}
