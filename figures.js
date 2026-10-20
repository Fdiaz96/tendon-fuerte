// Ilustraciones de ejercicios: personaje plano con ropa (remera amarilla, short gris, zapatillas), con contorno,
// animado entre la postura a y la b (SMIL, sin librerías). Generadas por código para esta app: sin imágenes de terceros.
// Cada parte del cuerpo es una cápsula que se afina hacia la punta; se anima interpolando su contorno (atributo d).

const PAL = {
  line: '#262A31', skin: '#F1C6A3', skin2: '#D9A684', shirt: '#F6C514', shirt2: '#D7A90B', shorts: '#5E6673', shorts2: '#454C58',
  shoe: '#FFFFFF', shoe2: '#D3D7DD', sole: '#3B4250', hair: '#3A2A1F', db: '#2F7BEA', db2: '#1F5FBF', bar: '#9AA3AF', kb: '#33383F',
  wood: '#8A5A3C', wood2: '#6E452D', wall: '#E3E6EA', floor: '#D9DDE2', shadow: 'rgba(38,42,49,.10)',
};
const FAR = new Set(['E2', 'W2', 'K2', 'F2', 'T2']);

// Completa las articulaciones que no se dieron: el lado lejano copia al cercano un poco corrido; la punta del pie, adelante del tobillo.
function completePose(p, front) {
  const q = { ...p }, off = (pt, dx, dy) => [pt[0] + dx, pt[1] + dy];
  if (!front) {
    q.E2 ??= off(q.E1, -3, 1); q.W2 ??= off(q.W1, -3, 1); q.K2 ??= off(q.K1, -4, 0); q.F2 ??= off(q.F1, -4, 0);
    q.T1 ??= off(q.F1, 10, 0); q.T2 ??= off(q.F2, 10, 0);
  }
  return q;
}
const unit = (dx, dy) => { const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
const headOf = (p) => { const [ux, uy] = unit(p.N[0] - p.P[0], p.N[1] - p.P[1]); return [p.N[0] + ux * 13, p.N[1] + uy * 13]; };
const mix = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
const r1 = (n) => Math.round(n * 10) / 10;

// Contorno de una cápsula de p a q, radio r1 en p y r2 en q (misma estructura siempre, para poder interpolar).
function capsule(p, q, ra, rb) {
  const [ux, uy] = unit(q[0] - p[0], q[1] - p[1]), nx = -uy, ny = ux;
  const P = (c, r, s) => `${r1(c[0] + nx * r * s)} ${r1(c[1] + ny * r * s)}`;
  return `M${P(p, ra, 1)}L${P(q, rb, 1)}A${rb} ${rb} 0 0 0 ${P(q, rb, -1)}L${P(p, ra, -1)}A${ra} ${ra} 0 0 0 ${P(p, ra, 1)}Z`;
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

function figureSVG(ex, { animate = true, size = '', crop = false } = {}) {
  const f = ex.fig, front = !!f.front;
  const A = completePose(f.a, front);
  const B = f.b ? completePose({ ...f.a, ...f.b }, front) : null;
  const dur = `${f.dur || 3}s`;
  const ease = `keyTimes="0;.5;1" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1" dur="${dur}" repeatCount="indefinite"`;
  const anim = (attr, a, b) => (animate && B && a !== b ? `<animate attributeName="${attr}" values="${a};${b};${a}" ${ease}/>` : '');
  // Forma que depende de la postura: se calcula para a y b y se anima el contorno.
  const shape = (fn, fill, extra = '') => {
    const da = fn(A); if (!da) return '';
    const db = B ? fn(B) : da;
    return `<path d="${da}" fill="${fill}" stroke="${PAL.line}" stroke-width="1.6" stroke-linejoin="round" ${extra}>${anim('d', da, db)}</path>`;
  };
  const cap = (k1, k2, ra, rb, t0 = 0, t1 = 1) => (p) => (p[k1] && p[k2] ? capsule(mix(p[k1], p[k2], t0), mix(p[k1], p[k2], t1), ra, rb) : '');
  const dot = (fn, r, fill) => {
    const a = fn(A), b = B ? fn(B) : a;
    return `<circle cx="${r1(a[0])}" cy="${r1(a[1])}" r="${r}" fill="${fill}" stroke="${PAL.line}" stroke-width="1.4">${anim('cx', r1(a[0]), r1(b[0]))}${anim('cy', r1(a[1]), r1(b[1]))}</circle>`;
  };
  const far = (n) => n === '2' && !front;
  // Hombro: de costado un poco debajo del cuello; de frente, a cada lado.
  const sh = (p, n) => (front ? [p.N[0] + (n === '1' ? -12.5 : 12.5), p.N[1] + 4] : mix(p.N, p.P, 0.12));
  const armCap = (n, ra, rb, t0 = 0, t1 = 1) => (p) => (p['E' + n] ? capsule(mix(sh(p, n), p['E' + n], t0), mix(sh(p, n), p['E' + n], t1), ra, rb) : '');
  const leg = (n) => {
    const s = far(n) ? '2' : '';
    return shape(cap('P', 'K' + n, 7.6, 5.8), PAL['skin' + s]) + shape(cap('K' + n, 'F' + n, 5.6, 3.9), PAL['skin' + s])
      + shape(cap('P', 'K' + n, front ? 7.8 : 9.4, 7.2, front ? 0.05 : 0, 0.6), PAL['shorts' + s]) + shape(cap('F' + n, 'T' + n, 4.4, 3.6), PAL['shoe' + s]);
  };
  const arm = (n) => {
    const s = far(n) ? '2' : '';
    return shape(armCap(n, 5.2, 4.3), PAL['skin' + s]) + shape(cap('E' + n, 'W' + n, 4.3, 3.3), PAL['skin' + s])
      + shape(armCap(n, 6.6, 6.1, -0.05, 0.42), PAL['shirt' + s]);
  };
  const hand = (n) => dot((p) => p['W' + n], 3.9, PAL[far(n) ? 'skin2' : 'skin']);
  // De frente: torso en V (hombros anchos, cintura angosta) y short como cadera; de costado: cápsulas.
  const r = (n) => r1(n);
  const torso = front
    ? shape((p) => { const [x, y] = p.N, [px, py] = p.P; return `M${r(x - 15)} ${r(y + 3)}Q${r(x)} ${r(y - 3)} ${r(x + 15)} ${r(y + 3)}L${r(x + 13)} ${r(y + 10)}L${r(px + 11)} ${r(py - 6)}L${r(px - 11)} ${r(py - 6)}L${r(x - 13)} ${r(y + 10)}Z`; }, PAL.shirt)
      + shape((p) => { const [px, py] = p.P; return `M${r(px - 11.5)} ${r(py - 7)}L${r(px + 11.5)} ${r(py - 7)}L${r(px + 12.5)} ${r(py + 6)}L${r(px - 12.5)} ${r(py + 6)}Z`; }, PAL.shorts)
    : shape((p) => capsule(mix(p.N, p.P, -0.06), mix(p.N, p.P, 0.86), 11.5, 10), PAL.shirt)
      + shape((p) => capsule(mix(p.N, p.P, 0.8), p.P, 10.4, 9.8), PAL.shorts);
  const neck = shape((p) => capsule(p.N, mix(p.N, headOf(p), 0.55), 3.6, 3.6), PAL.skin);
  const headC = (p) => headOf(p), upOf = (p) => unit(p.N[0] - p.P[0], p.N[1] - p.P[1]);
  const head = dot(headC, 10.6, PAL.skin)
    + shape((p) => hairPath(headOf(p), upOf(p), front), PAL.hair)
    + (front
      ? [-3.6, 3.6].map((dx) => `<circle r="1.3" fill="${PAL.line}" cx="${r1(headOf(A)[0] + dx)}" cy="${r1(headOf(A)[1] + 1.5)}">${anim('cx', r1(headOf(A)[0] + dx), r1(headOf(B || A)[0] + dx))}${anim('cy', r1(headOf(A)[1] + 1.5), r1(headOf(B || A)[1] + 1.5))}</circle>`).join('')
      : (() => {
        const eye = (p) => { const c = headOf(p), u = upOf(p), fw = [-u[1], u[0]]; return [c[0] + fw[0] * 6 + u[0] * 1.5, c[1] + fw[1] * 6 + u[1] * 1.5]; };
        const a = eye(A), b = eye(B || A);
        return `<circle r="1.3" fill="${PAL.line}" cx="${r1(a[0])}" cy="${r1(a[1])}">${anim('cx', r1(a[0]), r1(b[0]))}${anim('cy', r1(a[1]), r1(b[1]))}</circle>`;
      })());
  const props = (f.props || []).map((p) => propSVG(p, A, B, anim, ease, animate));
  const backProps = props.filter((_, i) => far(f.props[i].at.slice(-1))).join('');
  const frontProps = props.filter((_, i) => !far(f.props[i].at.slice(-1))).join('');
  const body = front
    ? leg('1') + leg('2') + torso + arm('1') + arm('2') + neck + head + frontProps + hand('1') + hand('2')
    : backProps + arm('2') + hand('2') + leg('2') + leg('1') + torso + neck + head + arm('1') + frontProps + hand('1');
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

function propSVG(p, A, B, anim, ease, animate) {
  const L = PAL.line, a = A[p.at], b = B?.[p.at] || a;
  const move = animate && B && (a[0] !== b[0] || a[1] !== b[1])
    ? `<animateTransform attributeName="transform" type="translate" values="${a.join(' ')};${b.join(' ')};${a.join(' ')}" ${ease}/>` : '';
  const rot = p.rot || [0];
  const spin = animate && rot.length > 1 ? `<animateTransform attributeName="transform" type="rotate" values="${rot[0]};${rot[1]};${rot[0]}" ${ease}/>` : '';
  let shape = '';
  if (p.t === 'db') {
    const plate = (x) => `<rect x="${x}" y="-7" width="6" height="14" rx="2" fill="${PAL.db}" stroke="${L}" stroke-width="1.3"/><rect x="${x + 1.5}" y="-7" width="1.6" height="14" fill="${PAL.db2}"/>`;
    shape = `<g transform="rotate(${rot[0]})">${spin}<rect x="-9" y="-1.8" width="18" height="3.6" rx="1" fill="${PAL.bar}" stroke="${L}" stroke-width="1.1"/>${plate(-14)}${plate(8)}</g>`;
  }
  if (p.t === 'kb') shape = `<path d="M-5.5 5V-.5a5.5 5.5 0 0111 0V5" fill="none" stroke="${L}" stroke-width="5"/><path d="M-5.5 5V-.5a5.5 5.5 0 0111 0V5" fill="none" stroke="${PAL.kb}" stroke-width="2.6"/><circle cx="0" cy="12" r="9" fill="${PAL.kb}" stroke="${L}" stroke-width="1.4"/><path d="M-4 8a5 5 0 014-2" stroke="#6B7280" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  if (p.t === 'band') {
    const band = `<line x1="${p.x}" y1="${p.y}" x2="${a[0]}" y2="${a[1]}" stroke="#E5484D" stroke-width="3" stroke-linecap="round">${anim('x2', a[0], b[0])}${anim('y2', a[1], b[1])}</line>`;
    return `${band}<circle cx="${p.x}" cy="${p.y}" r="3" fill="#E5484D" stroke="${L}" stroke-width="1"/>`;
  }
  if (p.t === 'ring') {
    const strap = `<line x1="${p.x}" y1="-12" x2="${a[0]}" y2="${a[1] - 5}" stroke="#1F2937" stroke-width="2.2">${anim('x2', a[0], b[0])}${anim('y2', a[1] - 5, b[1] - 5)}</line>`;
    return `${strap}<g transform="translate(${a.join(' ')})">${move}<circle r="5.5" fill="none" stroke="${L}" stroke-width="3.6"/><circle r="5.5" fill="none" stroke="#8B5E3C" stroke-width="2"/></g>`;
  }
  return `<g transform="translate(${a.join(' ')})">${move}${shape}</g>`;
}
