// Bocetos de ejercicios: figura de palitos en SVG, animada entre la postura a y la b (SMIL, sin librerías).
// Dibujos propios: no usan imágenes de terceros.

const BONES = [['N', 'P'], ['N', 'E1'], ['E1', 'W1'], ['N', 'E2'], ['E2', 'W2'], ['P', 'K1'], ['K1', 'F1'], ['F1', 'T1'], ['P', 'K2'], ['K2', 'F2'], ['F2', 'T2']];
const FAR = new Set(['E2', 'W2', 'K2', 'F2', 'T2']);

// Completa las articulaciones que no se dieron: el lado lejano copia al cercano un poco corrido; la punta del pie, adelante del tobillo.
function completePose(p, front) {
  const q = { ...p }, off = (pt, dx, dy) => [pt[0] + dx, pt[1] + dy];
  if (!front) {
    q.E2 ??= off(q.E1, -3, 1); q.W2 ??= off(q.W1, -3, 1); q.K2 ??= off(q.K1, -4, 0); q.F2 ??= off(q.F1, -4, 0);
    q.T1 ??= off(q.F1, 9, 0); q.T2 ??= off(q.F2, 9, 0);
  }
  return q;
}
const headOf = (p) => { const dx = p.N[0] - p.P[0], dy = p.N[1] - p.P[1], l = Math.hypot(dx, dy) || 1; return [p.N[0] + (dx / l) * 12, p.N[1] + (dy / l) * 12]; };

function figureSVG(ex, { animate = true, size = '' } = {}) {
  const f = ex.fig, front = !!f.front;
  const A = completePose(f.a, front);
  const B = f.b ? completePose({ ...f.a, ...f.b }, front) : null;
  const dur = `${f.dur || 3}s`;
  const anim = (attr, a, b) => (animate && B && a !== b
    ? `<animate attributeName="${attr}" values="${a};${b};${a}" keyTimes="0;.5;1" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1" dur="${dur}" repeatCount="indefinite"/>` : '');
  const line = (k1, k2, cls) => {
    if (!A[k1] || !A[k2]) return '';
    const [x1, y1] = A[k1], [x2, y2] = A[k2], b1 = B?.[k1] || A[k1], b2 = B?.[k2] || A[k2];
    return `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${anim('x1', x1, b1[0])}${anim('y1', y1, b1[1])}${anim('x2', x2, b2[0])}${anim('y2', y2, b2[1])}</line>`;
  };
  const isFar = (k1, k2) => !front && (FAR.has(k1) || FAR.has(k2));
  const bones = [...BONES.filter(([a, b]) => isFar(a, b)), ...BONES.filter(([a, b]) => !isFar(a, b))]
    .map(([a, b]) => line(a, b, isFar(a, b) ? 'bone far' : 'bone')).join('');
  const hA = headOf(A), hB = B ? headOf(B) : hA;
  const head = `<circle class="head" cx="${hA[0]}" cy="${hA[1]}" r="8">${anim('cx', hA[0], hB[0])}${anim('cy', hA[1], hB[1])}</circle>`;
  return `<svg class="fig ${size}" viewBox="0 -12 200 170" role="img" aria-label="Boceto: ${ex.name}">
    <line class="floor" x1="8" y1="150" x2="192" y2="150"/>${(f.scene || []).map(sceneSVG).join('')}
    ${bones}${head}${(f.props || []).map((p) => propSVG(p, A, B, anim, dur, animate)).join('')}</svg>`;
}

function sceneSVG(s) {
  if (s.t === 'wall') return `<line class="scene" x1="${s.x}" y1="-8" x2="${s.x}" y2="150"/>`;
  if (s.t === 'chair') {
    const bx = s.back === 'left' ? s.x : s.x + s.w;
    return `<path class="scene" d="M${s.x} ${s.y}H${s.x + s.w}M${s.x + 3} ${s.y}V150M${s.x + s.w - 3} ${s.y}V150M${bx} ${s.y}V${s.y - 40}"/>`;
  }
  return '';
}

function propSVG(p, A, B, anim, dur, animate) {
  const a = A[p.at], b = B?.[p.at] || a;
  const move = animate && B && (a[0] !== b[0] || a[1] !== b[1])
    ? `<animateTransform attributeName="transform" type="translate" values="${a.join(' ')};${b.join(' ')};${a.join(' ')}" keyTimes="0;.5;1" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1" dur="${dur}" repeatCount="indefinite"/>` : '';
  const rot = p.rot || [0];
  const spin = animate && rot.length > 1
    ? `<animateTransform attributeName="transform" type="rotate" values="${rot[0]};${rot[1]};${rot[0]}" dur="${dur}" repeatCount="indefinite"/>` : '';
  let shape = '';
  if (p.t === 'db') shape = `<g transform="rotate(${rot[0]})">${spin}<line class="prop" x1="-7" y1="0" x2="7" y2="0"/><rect class="prop-fill" x="-11" y="-5" width="5" height="10" rx="1.5"/><rect class="prop-fill" x="6" y="-5" width="5" height="10" rx="1.5"/></g>`;
  if (p.t === 'kb') shape = `<path class="prop" d="M-5 4V-1a5 5 0 0110 0v5"/><circle class="prop-fill" cx="0" cy="11" r="8"/>`;
  if (p.t === 'ring') {
    const strap = `<line class="strap" x1="${p.x}" y1="-12" x2="${a[0]}" y2="${a[1]}">${anim('x2', a[0], b[0])}${anim('y2', a[1], b[1])}</line>`;
    return `${strap}<g transform="translate(${a.join(' ')})">${move}<circle class="prop" r="5"/></g>`;
  }
  return `<g transform="translate(${a.join(' ')})">${move}${shape}</g>`;
}
