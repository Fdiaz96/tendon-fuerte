// Reglas de XZ Fit, sin DOM: pesos sugeridos, calibración, progresión, modo dolor, volumen y calendario.
// Funciones puras para poder probarlas con node (tests/unit.mjs).

const REPS_MIN = 8, REPS_MAX = 12, TARGET_REPS = 10, TARGET_RIR = 2;
const START_FACTOR = 0.7;   // la primera vez se sugiere el 70 % del peso estimado: mejor quedarse corto
const PAIN_CAP = 0.6;       // con la zona en fase 1–2, los ejercicios que la exigen van al 60 %
const PAIN_MAX = 4;         // regla del video: dolor tolerable hasta 3–4 sobre 10
const VOLUME_STEP = 1.3;    // nunca más de +30 % de series de una semana a otra
const ISO_SETS = 3, ISO_SECS = 45, LENTO_SETS = 3, LENTO_REPS = 15;

// ——— Fechas (día local) ———
const dayKey = (d = new Date()) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const parseDay = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parseDay(k); d.setDate(d.getDate() + n); return dayKey(d); };
const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 864e5);
const weekKey = (k) => { const d = parseDay(k); return addDays(k, -((d.getDay() + 6) % 7)); };   // lunes de esa semana

// ——— Equipo ———
// Pesos disponibles para un implemento. db: { min, max, step } (por mancuerna); kb: lista de pesas rusas.
// Mancuernas de discos: db.plates = { bar, items: [{ kg, n }] } (n = discos de ese peso en total, para el par).
// Cada mancuerna lleva lo mismo de cada lado, así que de cada disco se usan múltiplos de 4. Devuelve peso → discos por lado.
function plateCombos(pl) {
  const types = (pl.items || []).filter((x) => x.kg > 0 && x.n >= 4).map((x) => ({ kg: x.kg, max: Math.floor(x.n / 4) })).sort((a, b) => b.kg - a.kg);
  const out = new Map();
  const walk = (i, side) => {
    if (i === types.length) {
      const w = Math.round((pl.bar + 2 * side.reduce((a, b) => a + b, 0)) * 100) / 100;
      if (!out.has(w) || out.get(w).length > side.length) out.set(w, side);
      return;
    }
    for (let k = 0; k <= types[i].max; k++) walk(i + 1, [...side, ...Array(k).fill(types[i].kg)]);
  };
  walk(0, []);
  return out;
}
const platesFor = (equip, w) => (equip.db?.plates?.on ? plateCombos(equip.db.plates).get(w) || null : null);

// Máquinas propias: impl 'm:<id>' con su propio { min, max, step }.
function weightSteps(equip, impl) {
  if (impl === 'kb') return [...(equip.kb || [])].sort((a, b) => a - b);
  if (impl === 'db' && equip.db?.plates?.on) return [...plateCombos(equip.db.plates).keys()].sort((a, b) => a - b);
  const range = impl === 'db' ? equip.db : impl?.startsWith?.('m:') ? (equip.machines || []).find((m) => 'm:' + m.id === impl) : null;
  if (!range || !(range.step > 0)) return [];
  const { min, max, step } = range, out = [];
  for (let w = min; w <= max + 1e-9; w = Math.round((w + step) * 100) / 100) out.push(w);
  return out;
}
// Con qué implemento se hace el ejercicio según el equipo, o null si no se puede.
function implFor(ex, equip) {
  if ((ex.needs || []).some((n) => !equip[n])) return null;   // p. ej. banco
  if (ex.impl === 'bw') return 'bw';
  if (ex.impl === 'rings') return equip.rings ? 'rings' : null;
  if (ex.impl === 'bar') return equip.bar ? 'bar' : ex.alsoRings && equip.rings ? 'rings' : null;
  if (ex.impl === 'band') return equip.band ? 'band' : null;
  if (ex.impl?.startsWith('m:')) return (equip.machines || []).some((m) => 'm:' + m.id === ex.impl) ? ex.impl : null;
  if (ex.impl === 'kb') return equip.kb?.length ? 'kb' : ex.alsoDb && equip.db ? 'db' : null;
  if (ex.impl === 'db') return equip.db ? 'db' : null;
  return null;
}
const roundDown = (steps, w) => { if (!steps.length) return 0; let best = steps[0]; for (const s of steps) if (s <= w + 1e-9) best = s; return best; };
const stepUp = (steps, w) => steps.find((s) => s > w + 1e-9) ?? w;
const stepDown = (steps, w) => { const lower = steps.filter((s) => s < w - 1e-9); return lower.length ? lower[lower.length - 1] : (steps[0] ?? w); };

// ——— Fuerza estimada ———
// El 1RM se estima como peso corporal × coeficiente del ejercicio (novato hombre), ajustado por sexo, experiencia y edad.
// Coeficientes propios y aproximados (no copiados de tablas comerciales). La altura casi no cambia el resultado; no se usa.
function strengthFactor(profile, ex) {
  const fem = ex.lower ? 0.7 : 0.55;
  const sex = profile.sex === 'm' ? fem : profile.sex === 'x' ? (1 + fem) / 2 : 1;
  const exp = { novato: 1, medio: 1.5, avanzado: 2 }[profile.exp] ?? 1;
  const a = Number(profile.age) || 30;
  const age = a < 40 ? 1 : a < 50 ? 0.92 : a < 60 ? 0.82 : 0.7;
  return sex * exp * age;
}
const epley1RM = (w, reps) => w * (1 + reps / 30);
const weightForReps = (oneRM, reps) => oneRM / (1 + reps / 30);
const estimate1RM = (profile, ex) => (Number(profile.weight) || 70) * (ex.ratio || 0) * strengthFactor(profile, ex);
// Peso sugerido la primera vez (serie de calibración de 10 repeticiones).
const startWeight = (profile, ex, steps) => roundDown(steps, START_FACTOR * weightForReps(estimate1RM(profile, ex), TARGET_REPS));
// Después de la serie de calibración: reps hechas + reps en reserva → 1RM estimado → peso de trabajo (10 reps dejando 2).
function calibrate(w, reps, rir, steps) {
  const e1rm = epley1RM(w, reps + (Number(rir) || 0));
  return { e1rm: Math.round(e1rm * 10) / 10, w: roundDown(steps, weightForReps(e1rm, TARGET_REPS + TARGET_RIR)) };
}
// Doble progresión: 12 en todas las series → sube un salto; alguna por debajo de 8 → baja un salto.
function progress(w, sets, steps) {
  const done = sets.filter((s) => s.reps > 0);
  if (!done.length) return w;
  if (done.every((s) => s.reps >= REPS_MAX)) return stepUp(steps, w);
  if (done.some((s) => s.reps < REPS_MIN)) return stepDown(steps, w);
  return w;
}
const painCap = (w, steps) => roundDown(steps, PAIN_CAP * w);

// ——— Modo dolor ———
// Últimos registros de dolor de una zona (de las sesiones), del más nuevo al más viejo.
function painLog(state, zone) {
  const out = [];
  for (const s of state.sessions) if (s.pain && s.pain[zone] != null) out.push({ date: s.date, val: s.pain[zone] });
  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}
// ¿La zona está mal estos días? Dolor > 4 en los últimos 3 días o amaneció peor.
function zoneFlare(state, zone, today) {
  if (painLog(state, zone).some((p) => daysBetween(p.date, today) <= 2 && p.val > PAIN_MAX)) return true;
  return state.checks.some((c) => c.zone === zone && c.val === 'peor' && daysBetween(c.date, today) <= 2);
}
// Zonas activas en fase 1–2 que el ejercicio exige. null = sin restricción.
function restriction(state, ex, today) {
  if (!state.painMode) return null;
  const zones = (ex.tag || []).filter((z) => state.zones[z] && state.zones[z].phase < 3);
  if (!zones.length) return null;
  const flare = zones.some((z) => zoneFlare(state, z, today));
  return { zones, mode: flare && ex.alt ? 'alt' : 'cap', flare };
}
// Ajuste de la carga del isométrico según el dolor de la sesión y cómo amaneció al día siguiente.
// Sin peso (o sin mancuernas) se juega con el tiempo: 20 a 60 s. Con peso, de a un salto.
function isoAdjust(z, ex, steps, pain, worse) {
  const up = pain <= 2 && !worse, down = pain > PAIN_MAX || worse;
  const secs = z.secs || ISO_SECS, load = z.load || 0, minLoad = ex.load0 === 0 ? 0 : (steps[0] ?? 0);
  const bySecs = { ...z, secs: up ? Math.min(60, secs + 5) : down ? Math.max(20, secs - 10) : secs };
  if (ex.impl === 'bw' || !steps.length) return bySecs;
  if (load === 0) return up && secs >= 60 ? { ...z, load: steps[0], secs: ISO_SECS } : bySecs;   // 60 s sin peso → agrega mancuernas
  if (up) return { ...z, load: stepUp(steps, load) };
  if (down) return load <= minLoad ? bySecs : { ...z, load: load === steps[0] ? minLoad : stepDown(steps, load) };
  return z;
}
// Lista para pasar de fase: ≥ 10 días en la fase, registros suficientes la última semana, todos ≤ 3 y sin "peor".
function phaseReady(state, zone, today) {
  const z = state.zones[zone];
  if (!z || z.phase >= 3 || daysBetween(z.since, today) < 10) return false;
  const week = painLog(state, zone).filter((p) => daysBetween(p.date, today) <= 6);
  if (week.length < (z.phase === 1 ? 5 : 3)) return false;
  if (week.some((p) => p.val > 3)) return false;
  return !state.checks.some((c) => c.zone === zone && c.val === 'peor' && daysBetween(c.date, today) <= 6);
}
// ¿Toca preguntar cómo amaneció? Hubo sesión con dolor ayer y hoy todavía no se respondió.
function pendingChecks(state, today) {
  if (!state.painMode) return [];
  const y = addDays(today, -1);
  return Object.keys(state.zones).filter((zone) =>
    state.sessions.some((s) => s.date === y && s.pain && s.pain[zone] != null) &&
    !state.checks.some((c) => c.zone === zone && c.date === today));
}

// ——— Volumen ———
const targetSets = (days, perDay) => days * perDay * 3;
// Presupuesto semanal de series: sube como mucho 30 % por semana hasta el objetivo.
function weekBudget(plan, days, perDay, today) {
  const target = targetSets(days, perDay), wk = weekKey(today);
  if (!plan.budget) return { budget: target, week: wk };
  if (plan.week === wk) return { budget: Math.min(plan.budget, target), week: wk };
  return { budget: Math.min(target, Math.max(plan.budget, Math.floor(plan.budget * VOLUME_STEP))), week: wk };
}
// Series por ejercicio en una sesión (2 a 4), los primeros (compuestos) se llevan las sobrantes.
function setsPerExercise(budget, days, n) {
  const per = budget / days, base = Math.max(2, Math.min(4, Math.floor(per / n)));
  const extra = Math.max(0, Math.min(n, Math.round(per - base * n)));
  return Array.from({ length: n }, (_, i) => Math.min(4, base + (i < extra ? 1 : 0)));
}
// Sugerir pasar de 2 a 3 días: ≥ 4 entrenos en 14 días y, con modo dolor, nada > 3 en ese lapso.
function suggestThreeDays(state, today) {
  if (state.profile.days !== 2) return false;
  const recent = state.sessions.filter((s) => s.type === 'entreno' && daysBetween(s.date, today) <= 13);
  if (recent.length < 4) return false;
  if (!state.painMode) return true;
  return Object.keys(state.zones).every((zone) => painLog(state, zone).filter((p) => daysBetween(p.date, today) <= 13).every((p) => p.val <= 3));
}

// ——— Entrada en calor ———
// Series de aproximación antes del primer ejercicio con peso: 8 reps al 50 % y 4 al 75 % (sin repetir pesos).
function warmupSets(w, steps) {
  const out = [];
  for (const [f, reps] of [[0.5, 8], [0.75, 4]]) {
    const x = roundDown(steps, w * f);
    if (x > 0 && x < w && !out.some((o) => o.w === x)) out.push({ w: x, reps });
  }
  return out;
}

// ——— Estancamiento ———
// Un ejercicio con peso está estancado si en las últimas 3 sesiones (sin tope por dolor ni descarga) usó el mismo peso
// y las repeticiones totales no subieron.
function stalled(state, exId) {
  const hist = [];
  for (const s of state.sessions) {
    if (s.type !== 'entreno') continue;
    const it = s.items.find((i) => i.ex === exId && !i.capped);
    if (it?.sets.length) hist.push(it);
    if (hist.length === 3) break;
  }
  if (hist.length < 3) return false;
  const top = (it) => Math.max(...it.sets.map((x) => x.w || 0)), reps = (it) => it.sets.reduce((a, x) => a + (x.reps || 0), 0);
  return hist.every((it) => top(it) === top(hist[0])) && reps(hist[0]) <= reps(hist[2]);
}
const DAY_KEYS = ['do', 'lu', 'ma', 'mi', 'ju', 'vi', 'sa'];
const weekdayKey = (k) => DAY_KEYS[parseDay(k).getDay()];

// ——— Semana y racha ———
// Entrenos y rehabilitaciones de la semana actual, con su objetivo.
function weekStats(state, today) {
  const wk = weekKey(today), mine = state.sessions.filter((s) => weekKey(s.date) === wk);
  const phases = state.painMode ? Object.values(state.zones).map((z) => z.phase) : [];
  const rehabTarget = phases.includes(1) ? 14 : phases.includes(2) ? 4 : 0;   // fase 1: mañana y noche; fase 2: día por medio
  return { train: mine.filter((s) => s.type === 'entreno').length, target: state.profile.days, rehab: mine.filter((s) => s.type === 'rehab').length, rehabTarget };
}
// Semanas seguidas cumpliendo los días de entreno (la actual cuenta si ya se cumplió).
function streak(state, today) {
  const per = {};
  for (const s of state.sessions) if (s.type === 'entreno') per[weekKey(s.date)] = (per[weekKey(s.date)] || 0) + 1;
  let wk = weekKey(today), n = 0;
  if ((per[wk] || 0) >= state.profile.days) n++;
  for (wk = addDays(wk, -7); (per[wk] || 0) >= state.profile.days; wk = addDays(wk, -7)) n++;
  return n;
}
// Resumen de un entreno: series, volumen (kg × reps) y duración en minutos.
function sessionSummary(session, ms) {
  const sets = session.items.reduce((n, i) => n + i.sets.length, 0);
  const vol = session.items.reduce((v, i) => v + i.sets.reduce((a, x) => a + (x.w || 0) * (x.reps || 0), 0), 0);
  return { sets, vol: Math.round(vol), min: Math.max(1, Math.round(ms / 60000)) };
}

// ——— Calendario (.ics) ———
const DAYS_ICS = { lu: 'MO', ma: 'TU', mi: 'WE', ju: 'TH', vi: 'FR', sa: 'SA', do: 'SU' };
function icsText(rem, painMode, today) {
  const start = today.replace(/-/g, ''), stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const t = (hhmm) => hhmm.replace(':', '') + '00';
  const ev = (uid, time, rule, title, desc) => ['BEGIN:VEVENT', `UID:${uid}@tendon-fuerte`, `DTSTAMP:${stamp}`, `DTSTART:${start}T${t(time)}`, `DURATION:PT15M`, `RRULE:${rule}`, `SUMMARY:${title}`, `DESCRIPTION:${desc}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT'];
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//XZ Fit//ES', 'CALSCALE:GREGORIAN'];
  if (painMode) {
    lines.push(...ev('rehab-am', rem.am, 'FREQ=DAILY', 'XZ Fit: isométricos (mañana)', 'Abrí la app y hacé tu sesión de rehabilitación.'));
    lines.push(...ev('rehab-pm', rem.pm, 'FREQ=DAILY', 'XZ Fit: isométricos (noche)', 'Abrí la app y hacé tu sesión de rehabilitación.'));
  }
  if (rem.train?.length) lines.push(...ev('entreno', rem.trainAt, `FREQ=WEEKLY;BYDAY=${rem.train.map((d) => DAYS_ICS[d]).join(',')}`, 'XZ Fit: entreno', 'Toca entreno de cuerpo completo.'));
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
