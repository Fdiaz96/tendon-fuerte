// Tendón Fuerte — rehabilitación de tendones y entreno con mancuernas. Los datos viven solo en el celular (IndexedDB).
// Protocolo de tendones del video de Jeremy Ethier con Keith Baar y Coach Q; reglas en logic.js, bocetos en figures.js.

const APP_VERSION = '1.2.0';
const DAY_NAMES = { lu: 'Lu', ma: 'Ma', mi: 'Mi', ju: 'Ju', vi: 'Vi', sa: 'Sá', do: 'Do' };
const SIDES = { der: 'derecha', izq: 'izquierda', ambos: 'ambos lados' };
const REST_SECS = 90, ISO_REST = 60;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => dayKey();
const fmtKg = (w) => (w ? `${String(w).replace('.', ',')} kg` : 'Sin peso');
const fmtDate = (k) => parseDay(k).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
const zoneName = (id) => ZONE[id]?.name || 'General';

// ——— Estado y guardado ———
const DEFAULT = () => ({
  v: 1, onboarded: false, painMode: false, hidePainTip: false,
  profile: { name: '', sex: 'h', weight: '', height: '', age: '', exp: 'novato', days: 2 },
  equip: { db: { min: 2, max: 24, step: 2 }, kb: [], rings: false, bench: false, bar: false, band: false, machines: [] },
  templates: JSON.parse(JSON.stringify(TEMPLATES)), exlib: [],
  zones: {}, lifts: {}, sessions: [], checks: [], custom: [],
  plan: { budget: 0, week: '', next: 'A' },
  rem: { am: '08:00', pm: '20:00', train: ['lu', 'ju'], trainAt: '19:00' },
});
let S = DEFAULT();

const db = {
  open() {   // una sola conexión; se cierra si otra pestaña borra o actualiza la base
    return (this.conn ||= new Promise((res, rej) => {
      const r = indexedDB.open('tendon-fuerte', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => { r.result.onversionchange = () => { r.result.close(); this.conn = null; }; res(r.result); };
      r.onerror = () => { this.conn = null; rej(r.error); };
    }));
  },
  async get(k) { const d = await this.open(); return new Promise((res, rej) => { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); },
  async set(k, v) { const d = await this.open(); return new Promise((res, rej) => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); },
};
const withDefaults = (d) => { const base = DEFAULT(); return { ...base, ...d, profile: { ...base.profile, ...d.profile }, equip: { ...base.equip, ...d.equip }, plan: { ...base.plan, ...d.plan }, rem: { ...base.rem, ...d.rem }, templates: d.templates || base.templates, exlib: d.exlib || [] }; };
let saving = Promise.resolve();
function persist() { const snap = JSON.parse(JSON.stringify(S)); saving = saving.then(() => db.set('data', snap)).catch((e) => toast('No se pudo guardar: ' + e.message)); return saving; }

// ——— Avisos ———
// Redibuja un diálogo sin perder el aviso, el descanso ni el tooltip que estén adentro.
const dlg = (id) => ({
  set html(v) { const d = $(id), kept = ['toast', 'rest', 'tip'].map($).filter((el) => el.parentNode === d); d.innerHTML = v; kept.forEach((el) => d.appendChild(el)); },
});
let toastTimer;
function overlayHost() { return [...document.querySelectorAll('dialog[open]')].pop() || document.body; }
function toast(msg) {
  const t = $('toast'); overlayHost().appendChild(t);
  t.querySelector('span').textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 3500);
}

// ——— Navegación ———
let tab = 'home';
function showTab(t) {
  tab = t;
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  document.querySelectorAll('.view').forEach((v) => (v.hidden = v.id !== `view-${t}`));
  render(); window.scrollTo(0, 0);
}
function render() {
  ({ home: renderHome, train: renderTrain, tendons: renderTendons, history: renderHistory, settings: renderSettings })[tab]();
  calmMotion(document);
}
function calmMotion(root) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) root.querySelectorAll('svg.fig').forEach((s) => s.pauseAnimations?.());
}

// ——— Plan de entreno ———
// Ejercicio de la biblioteca o uno propio (ids "c_…"), ya listo para dibujar y planificar.
function getEx(id) {
  if (EXERCISES[id]) return EXERCISES[id];
  const c = S.exlib.find((x) => x.id === id);
  return c ? { ...c, custom: true, tag: c.tag || [], cues: c.note ? [c.note] : ['Ejercicio propio: anotá el peso y las repeticiones de cada serie.'], fig: customFig(c.impl) } : null;
}
// Ilustración genérica para ejercicios propios según el equipo que usan.
function customFig(impl) {
  const props = impl === 'db' ? [{ t: 'db', at: 'W1' }] : impl === 'kb' ? [{ t: 'kb', at: 'W1' }] : impl === 'band' ? [{ t: 'band', at: 'W1', x: 176, y: 70 }] : [];
  const scene = impl?.startsWith('m:') ? [{ t: 'stack', x: 150 }] : impl === 'band' ? [{ t: 'post', x: 176 }] : [];
  const a = impl?.startsWith('m:') ? { ...STAND, E1: [112, 62], W1: [134, 60] } : STAND;
  return { a, b: impl?.startsWith('m:') ? { E1: [104, 70], W1: [124, 72] } : { E1: [105, 68], W1: [122, 51] }, props, scene };
}
function resolveEx(id) { return getEx(!S.equip.rings && NO_RINGS[id] ? NO_RINGS[id] : id); }
const perDay = () => Math.max(1, Math.round((S.templates.A.length + S.templates.B.length) / 2));
function syncBudget() { Object.assign(S.plan, weekBudget(S.plan, S.profile.days, perDay(), today())); }
// Cada ejercicio de la plantilla, ya adaptado al equipo y al modo dolor.
function planFor(tpl) {
  syncBudget();
  const ids = S.templates[tpl].filter((id) => resolveEx(id));
  const counts = setsPerExercise(S.plan.budget, S.profile.days, Math.max(1, ids.length));
  return ids.map((id, i) => {
    const orig = resolveEx(id);
    const r = restriction(S, orig, today());
    const ex = r?.mode === 'alt' ? resolveEx(orig.alt) : orig;
    const impl = implFor(ex, S.equip);
    const steps = weightSteps(S.equip, impl);
    const item = { ex, orig, r, impl, steps, sets: counts[i], missing: !impl };
    if (ex.kind === 'peso') {
      const lift = S.lifts[ex.id];
      item.calib = !lift;
      item.base = lift ? lift.w : ex.ratio ? startWeight(S.profile, ex, steps) : roundDown(steps, ex.start || 0);
      item.w = r ? painCap(item.base, steps) : item.base;
      item.capped = !!r && item.w < item.base;
    } else if (ex.kind === 'tiempo') item.secs = S.lifts[ex.id]?.secs || 30;
    else if (ex.kind === 'iso') { item.secs = 30; item.w = ex.load0 ? roundDown(steps, ex.load0) : 0; }
    return item;
  });
}
// Mantenimiento: zonas en fase 3 suman 3 isométricos de 30 s al final del entreno.
function maintenanceItems() {
  if (!S.painMode) return [];
  return Object.entries(S.zones).filter(([, z]) => z.phase === 3).map(([zone, z]) => {
    const ex = EXERCISES[REHAB[zone][1]], impl = implFor(ex, S.equip);
    return { ex, impl, steps: weightSteps(S.equip, impl), sets: 3, secs: 30, w: z.load || 0, maint: zone };
  });
}

// ——— Rehabilitación ———
function rehabItems() {
  const out = [];
  for (const [zone, z] of Object.entries(S.zones)) {
    if (z.phase >= 3) continue;
    const ex = EXERCISES[REHAB[zone][z.phase]], impl = implFor(ex, S.equip), steps = weightSteps(S.equip, impl);
    if (z.phase === 2 && lentoDoneRecently(ex.id)) continue;   // isotónicos: día por medio
    out.push({ ex, zone, impl, steps, w: impl === 'bw' ? 0 : z.load || 0, secs: z.secs || ISO_SECS, sets: z.phase === 1 ? ISO_SETS : LENTO_SETS, reps: LENTO_REPS });
  }
  return out;
}
const lentoDoneRecently = (exId) => S.sessions.some((s) => s.type === 'rehab' && daysBetween(s.date, today()) <= 1 && s.items.some((i) => i.ex === exId && i.sets.some((x) => x.done)));
const slotNow = () => (new Date().getHours() < 15 ? 'mañana' : 'noche');
const rehabDone = (slot) => S.sessions.some((s) => s.type === 'rehab' && s.date === today() && s.slot === slot);
const activeZones = () => Object.keys(S.zones);
function newZone(zone, pain = 5, side = 'der') {
  const ex = EXERCISES[REHAB[zone][1]], steps = weightSteps(S.equip, implFor(ex, S.equip));
  return { side, pain0: pain, phase: 1, since: today(), load: ex.load0 ? roundDown(steps, ex.load0) : 0, secs: ISO_SECS };
}

// ——— Inicio ———
function renderHome() {
  const t = today(), checks = pendingChecks(S, t);
  const hasZones = activeZones().length > 0;
  let h = `<p class="greet">${S.profile.name ? `Hola, ${esc(S.profile.name)}` : 'Hola'} · ${fmtDate(t)}</p><h1>Hoy</h1>`;
  for (const zone of checks) {
    h += `<div class="card pain"><h3>¿Cómo amaneció tu ${esc(zoneName(zone).toLowerCase())}?</h3><p class="muted small">Comparado con ayer. Si está peor, bajamos la carga.</p>
      <div class="btns">${['mejor', 'igual', 'peor'].map((v) => `<button class="sec" data-action="check" data-zone="${zone}" data-val="${v}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</div></div>`;
  }
  if (!S.painMode && hasZones && !S.hidePainTip) {
    h += `<div class="card pain"><h3>Tenés dolor en ${esc(activeZones().map((z) => zoneName(z).toLowerCase()).join(' y '))}</h3>
      <p class="muted small">El modo dolor agrega isométricos diarios y cuida esas zonas en el entreno. Lo activás vos.</p>
      <div class="btns"><button class="cta pain" data-action="pain-mode-on">Activar modo dolor</button></div>
      <button class="link" data-action="hide-pain-tip">Ahora no</button></div>`;
  }
  if (S.painMode) {
    const items = rehabItems();
    for (const zone of activeZones()) if (phaseReady(S, zone, t)) h += `<div class="card pain"><h3>${esc(zoneName(zone))}: lista para avanzar</h3><p class="muted small">Dolor ≤ 3 y sin empeorar toda la semana.</p><button class="link" data-action="phase" data-zone="${zone}" data-dir="1">Pasar a ${esc(PHASES[S.zones[zone].phase + 1].name)}</button></div>`;
    if (items.length || S.custom.length) {
      const slot = slotNow(), am = rehabDone('mañana'), pm = rehabDone('noche');
      h += `<div class="card pain"><div class="row"><span class="tag pain">Modo dolor</span><span class="muted small">Mañana ${am ? '✓' : '—'} · Noche ${pm ? '✓' : '—'}</span></div>
        <h3 style="margin-top:8px">Rehabilitación (${slot})</h3>
        <p class="muted small">${items.map((i) => esc(i.ex.name)).join(' · ') || 'Tus ejercicios del fisio'}</p>
        <button class="cta pain" data-action="start-rehab" ${rehabDone(slot) ? 'disabled' : ''}>${rehabDone(slot) ? `Hecha (${slot})` : 'Empezar'}</button></div>`;
    } else if (!activeZones().length) h += `<div class="card pain"><span class="tag pain">Modo dolor</span><p class="muted small">Marcá qué te duele en la pestaña Tendones para armar tu rehabilitación.</p></div>`;
  else h += `<div class="card pain"><span class="tag pain">Modo dolor</span><p class="muted small">Hoy no toca rehabilitación aparte${Object.values(S.zones).some((z) => z.phase === 3) ? ': los isométricos de mantenimiento van al final del entreno' : ''}.</p></div>`;
  }
  const next = S.plan.next, plan = planFor(next), last = S.sessions.find((s) => s.type === 'entreno');
  h += `<div class="card acc"><div class="row"><span class="tag acc">Entreno ${next}</span><span class="muted small">${last ? `Último: ${fmtDate(last.date)}` : 'Primer entreno'}</span></div>
    <h3 style="margin-top:8px">Cuerpo completo · ${plan.filter((p) => !p.missing).length} ejercicios</h3>
    <p class="muted small">${plan.filter((p) => !p.missing).map((p) => esc(p.ex.name)).join(' · ')}</p>
    <button class="cta" data-action="start-workout" data-tpl="${next}">Empezar</button></div>`;
  if (suggestThreeDays(S, t)) h += `<div class="card acc"><h3>¿Pasamos a 3 días por semana?</h3><p class="muted small">Venís constante. El volumen sube de a 30 % por semana.</p><button class="link" data-action="three-days">Sí, 3 días</button></div>`;
  $('view-home').innerHTML = h;
}

// ——— Entreno ———
let editRoutine = false;
function renderTrain() {
  let h = `<div class="title-row"><h1>Entreno</h1><button class="link" data-action="edit-routine">${editRoutine ? 'Listo' : 'Editar rutina'}</button></div>
    <p class="muted">Cuerpo completo A/B · ${S.profile.days} días por semana · doble progresión 8–12 reps.</p>`;
  if (!S.profile.weight) h += `<div class="note acc">Completá tu peso en Ajustes para que la app estime cuánto levantar.</div>`;
  if (editRoutine) h += `<div class="note acc">Cambiá, quitá, agregá u ordená ejercicios. Si tenés una máquina que no está, cargala en Ajustes → Equipo y creá tu ejercicio.</div>`;
  for (const tpl of ['A', 'B']) {
    const plan = planFor(tpl);
    h += `<h2>Día ${tpl}${S.plan.next === tpl ? ' · toca hoy' : ''}</h2><div class="card">`;
    h += plan.map((p, i) => `<div class="ex"${editRoutine ? '' : ` data-action="ex-detail" data-ex="${p.ex.id}"`} style="padding:6px 0">
        <div class="thumb">${figureSVG(p.ex, { animate: false, crop: true })}</div>
        <div class="info"><h3>${esc(p.ex.name)}</h3><p class="muted small">${p.missing ? 'Falta equipo' : `${p.sets} × ${setLabel(p)}`}${p.r ? ` · <span style="color:var(--pain)">${p.r.mode === 'alt' ? 'variante amable' : 'al 60 %'}</span>` : ''}</p></div>
        ${editRoutine ? `<div class="tools"><button data-action="routine-move" data-tpl="${tpl}" data-i="${i}" data-d="-1" aria-label="Subir" ${i ? '' : 'disabled'}>↑</button><button data-action="routine-move" data-tpl="${tpl}" data-i="${i}" data-d="1" aria-label="Bajar" ${i < plan.length - 1 ? '' : 'disabled'}>↓</button><button data-action="routine-pick" data-tpl="${tpl}" data-i="${i}" aria-label="Cambiar">⇄</button><button data-action="routine-del" data-tpl="${tpl}" data-i="${i}" aria-label="Quitar">✕</button></div>`
          : `<div class="w">${p.ex.kind === 'peso' ? `<span class="num">${p.w || '—'}</span><div class="small muted">${p.calib ? 'calibrar' : 'kg'}</div>` : ''}</div>`}</div>`).join('');
    h += editRoutine ? `<button class="sec" style="width:100%;margin-top:10px" data-action="routine-pick" data-tpl="${tpl}">+ Agregar ejercicio</button>`
      : `<button class="cta" style="margin-top:10px" data-action="start-workout" data-tpl="${tpl}" ${plan.some((p) => !p.missing) ? '' : 'disabled'}>Empezar día ${tpl}</button>`;
    h += `</div>`;
  }
  if (editRoutine) h += `<button class="link danger" data-action="routine-reset">Volver a la rutina original</button>`;
  $('view-train').innerHTML = h;
}
// Ids de la plantilla que existen (un ejercicio propio borrado desaparece de la rutina).
const tplIds = (tpl) => S.templates[tpl].filter((id) => resolveEx(id));
function routineSet(tpl, ids) { S.templates[tpl] = ids; syncBudget(); persist(); render(); }

// Selector de ejercicios (agregar o cambiar uno de la rutina)
let PK = null;   // { tpl, i }
function openPicker(tpl, i) {
  PK = { tpl, i: i === undefined || i === null ? null : Number(i) };
  const current = PK.i != null ? resolveEx(tplIds(tpl)[PK.i]) : null;
  const lib = Object.values(EXERCISES).filter((e) => e.cat);
  const row = (e) => {
    const ok = !!implFor(e, S.equip);
    return `<button class="pick${current?.id === e.id ? ' on' : ''}" data-action="pick-ex" data-ex="${e.id}" ${ok ? '' : 'disabled'}><div class="thumb">${figureSVG(e, { animate: false, crop: true })}</div><span><b>${esc(e.name)}</b><br><span class="small muted">${ok ? (e.tag?.length ? 'Exige ' + e.tag.map((z) => zoneName(z).toLowerCase()).join(', ') : 'No carga tendones sensibles') : 'Falta: ' + missingLabel(e)}</span></span></button>`;
  };
  const cats = Object.entries(CATS).sort(([a], [b]) => (a === current?.cat ? -1 : b === current?.cat ? 1 : 0));
  let h = `<div class="dlg"><div class="dlg-head"><button class="link" data-action="close" data-dlg="pickersheet">Cancelar</button><strong>${PK.i != null ? 'Cambiar ejercicio' : `Agregar al día ${tpl}`}</strong><span></span></div>`;
  h += `<h2>Mis ejercicios</h2>${S.exlib.map((c) => `<div class="pick-row">${row(getEx(c.id))}<button class="link" data-action="exform" data-id="${c.id}">Editar</button></div>`).join('')}
    <button class="sec" style="width:100%" data-action="exform">+ Crear ejercicio propio</button>`;
  for (const [c, name] of cats) h += `<h2>${esc(name)}${c === current?.cat ? ' · mismo grupo' : ''}</h2>${lib.filter((e) => e.cat === c).map(row).join('')}`;
  dlg('pickersheet').html = h + '</div>';
  if (!$('pickersheet').open) $('pickersheet').showModal();
}
function missingLabel(e) {
  const names = { bench: 'banco', bar: 'barra de dominadas', band: 'bandas', rings: 'aros', db: 'mancuernas', kb: 'pesas rusas' };
  const miss = (e.needs || []).filter((n) => !S.equip[n]).map((n) => names[n]);
  if (!miss.length) miss.push(e.impl?.startsWith('m:') ? 'la máquina' : names[e.impl] || e.impl);
  return miss.join(', ');
}
function pickExercise(id) {
  const ids = [...tplIds(PK.tpl)], swap = PK.i != null;
  if (swap) ids[PK.i] = id; else ids.push(id);
  $('pickersheet').close(); routineSet(PK.tpl, ids); PK = null;
  toast(swap ? 'Ejercicio cambiado.' : 'Ejercicio agregado.');
}

// Ejercicio propio (cualquier equipo, incluidas las máquinas que cargues)
let XF = null;   // borrador del formulario
function openExForm(id) {
  const c = S.exlib.find((x) => x.id === id) || { id: '', name: '', kind: 'peso', impl: S.equip.db ? 'db' : 'bw', tag: [], cat: 'empuje', start: '', note: '' };
  XF = { ...c, tag: [...(c.tag || [])] };
  renderExForm();
  if (!$('exformsheet').open) $('exformsheet').showModal();
}
function implOptions() {
  const e = S.equip, o = [];
  if (e.db) o.push(['db', 'Mancuernas']);
  if (e.kb?.length) o.push(['kb', 'Pesa rusa']);
  if (e.band) o.push(['band', 'Banda elástica']);
  for (const m of e.machines || []) o.push(['m:' + m.id, m.name]);
  o.push(['bw', 'Peso corporal']);
  return o;
}
function renderExForm() {
  const c = XF;
  dlg('exformsheet').html = `<div class="dlg"><div class="dlg-head"><button class="link" data-action="close" data-dlg="exformsheet">Cancelar</button><strong>${c.id ? 'Editar' : 'Nuevo'} ejercicio</strong><button class="link" data-action="exform-save">Guardar</button></div>
    <label class="field"><span>Nombre</span><input id="x-name" value="${esc(c.name)}" placeholder="Ej.: Prensa de piernas"></label>
    <label class="field"><span>Con qué se hace</span><select id="x-impl">${implOptions().map(([v, n]) => `<option value="${esc(v)}" ${c.impl === v ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
    <p class="faint small">¿Tu máquina no aparece? Agregala en Ajustes → Equipo → Máquinas.</p>
    <span class="small muted">Cómo se registra</span><div class="chips" style="margin:4px 0 8px">${[['peso', 'Kilos × reps'], ['reps', 'Solo reps'], ['tiempo', 'Segundos']].map(([k, n]) => `<button class="chip${c.kind === k ? ' on' : ''}" data-action="xf-kind" data-v="${k}">${n}</button>`).join('')}</div>
    ${c.kind === 'peso' ? `<label class="field"><span>Peso para empezar (kg, opcional: se calibra en la primera serie)</span><input id="x-start" type="number" inputmode="decimal" step="0.5" value="${esc(c.start || '')}"></label>` : ''}
    <label class="field"><span>Grupo</span><select id="x-cat">${Object.entries(CATS).map(([k, n]) => `<option value="${k}" ${c.cat === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <span class="small muted">Tendones que exige (para el modo dolor)</span><div class="chips" style="margin-top:4px">${ZONES.map((z) => `<button class="chip pain${c.tag.includes(z.id) ? ' on' : ''}" data-action="xf-tag" data-v="${z.id}">${esc(z.name)}</button>`).join('')}</div>
    <label class="field"><span>Nota o indicaciones</span><textarea id="x-note" rows="2">${esc(c.note)}</textarea></label>
    ${c.id ? '<button class="link danger" data-action="exform-del">Eliminar ejercicio</button>' : ''}</div>`;
}
function readExForm() { XF.name = $('x-name').value; XF.impl = $('x-impl').value; XF.cat = $('x-cat').value; XF.note = $('x-note').value; if ($('x-start')) XF.start = $('x-start').value; }
function saveExForm() {
  readExForm();
  const name = XF.name.trim(); if (!name) return toast('Poné un nombre.');
  const c = { id: XF.id || 'c_' + uid(), name, kind: XF.kind, impl: XF.impl, cat: XF.cat, tag: XF.tag, start: Number(XF.start) || 0, note: XF.note.trim() };
  const i = S.exlib.findIndex((x) => x.id === c.id), isNew = i < 0;
  isNew ? S.exlib.push(c) : (S.exlib[i] = c);
  $('exformsheet').close();
  if (isNew && PK && $('pickersheet').open) return pickExercise(c.id);
  persist(); if ($('pickersheet').open) openPicker(PK.tpl, PK.i); render();
  toast('Ejercicio guardado.');
}
function deleteExForm() {
  if (!confirm('¿Eliminar este ejercicio? Se quita también de la rutina.')) return;
  S.exlib = S.exlib.filter((x) => x.id !== XF.id);
  for (const t of ['A', 'B']) S.templates[t] = S.templates[t].filter((id) => id !== XF.id);
  $('exformsheet').close(); syncBudget(); persist(); if ($('pickersheet').open) openPicker(PK.tpl, PK.i); render();
}

// Máquinas propias: nombre y rango de peso (mínimo, máximo, salto)
function openMachine(id) {
  const m = S.equip.machines.find((x) => x.id === id) || { id: '', name: '', min: 5, max: 100, step: 5 };
  dlg('machsheet').html = `<div class="dlg"><div class="dlg-head"><button class="link" data-action="close" data-dlg="machsheet">Cancelar</button><strong>${m.id ? 'Editar' : 'Nueva'} máquina</strong><button class="link" data-action="mach-save" data-id="${m.id}">Guardar</button></div>
    <label class="field"><span>Nombre</span><input id="m-name" value="${esc(m.name)}" placeholder="Ej.: Polea, Prensa, Barra con discos"></label>
    <div class="grid2" style="grid-template-columns:1fr 1fr 1fr"><label class="field"><span>Mínimo (kg)</span><input id="m-min" type="number" inputmode="decimal" step="0.5" value="${m.min}"></label>
    <label class="field"><span>Máximo (kg)</span><input id="m-max" type="number" inputmode="decimal" step="0.5" value="${m.max}"></label>
    <label class="field"><span>Salto (kg)</span><input id="m-step" type="number" inputmode="decimal" step="0.25" value="${m.step}"></label></div>
    <p class="faint small">La app redondea los pesos sugeridos a estos saltos. Después creá tus ejercicios con esta máquina desde Entreno → Editar rutina.</p>
    ${m.id ? `<button class="link danger" data-action="mach-del" data-id="${m.id}">Eliminar máquina</button>` : ''}</div>`;
  if (!$('machsheet').open) $('machsheet').showModal();
}
function saveMachine(id) {
  const num = (k) => Number(String($(k).value).replace(',', '.'));
  const m = { id: id || uid(), name: $('m-name').value.trim(), min: num('m-min'), max: num('m-max'), step: num('m-step') };
  if (!m.name) return toast('Poné un nombre.');
  if (!(m.step > 0) || !(m.max >= m.min) || m.min < 0) return toast('Revisá el rango: mínimo ≤ máximo y salto mayor a 0.');
  const i = S.equip.machines.findIndex((x) => x.id === m.id);
  i >= 0 ? (S.equip.machines[i] = m) : S.equip.machines.push(m);
  persist(); $('machsheet').close(); $('onb').open ? renderOnb() : render();
  toast(i >= 0 ? 'Máquina actualizada.' : 'Máquina agregada. Creá tu ejercicio en Entreno → Editar rutina.');
}

function setLabel(p) {
  if (p.ex.kind === 'tiempo' || p.ex.kind === 'iso') return `${p.secs} s`;
  if (p.ex.kind === 'reps') return '8–12 reps';
  return '8–12 reps';
}
function openExercise(id) {
  const ex = getEx(id), lift = S.lifts[id];
  const hist = weightHistory(id);
  dlg('exsheet').html = `<div class="dlg"><div class="dlg-head"><strong>${esc(ex.name)}</strong><button class="link" data-action="close" data-dlg="exsheet">Cerrar</button></div>
    <div class="hero-fig">${figureSVG(ex)}</div>
    <ul class="muted">${ex.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
    ${ex.tag?.length ? `<p class="small muted">Exige: ${ex.tag.map(zoneName).join(', ')}</p>` : ''}
    ${lift ? `<p>Peso de trabajo: <b class="num">${fmtKg(lift.w)}</b>${lift.e1rm ? ` · 1RM estimado ${lift.e1rm} kg` : ''}</p>` : ''}
    ${hist.length > 1 ? `<h2>Progreso</h2>${lineChart(hist, { unit: 'kg', color: 'var(--acc)' })}` : ''}
    ${lift ? `<button class="link danger" data-action="recalibrate" data-ex="${id}">Volver a calibrar</button>` : ''}</div>`;
  $('exsheet').showModal(); calmMotion($('exsheet'));
}

// Sesión de entreno en curso
let W = null;   // { tpl, items, started }
function startWorkout(tpl) {
  const items = [...planFor(tpl).filter((p) => !p.missing), ...maintenanceItems()].map((p) => ({
    ...p, rows: Array.from({ length: p.sets }, () => ({ w: p.w || 0, reps: '', rir: '', secs: p.secs || '', done: false })),
  }));
  W = { tpl, items, started: Date.now() };
  renderWorkout(); $('wsheet').showModal(); calmMotion($('wsheet'));
}
function renderWorkout() {
  const body = W.items.map((it, i) => {
    const k = it.ex.kind, timed = k === 'tiempo' || k === 'iso', weighted = k === 'peso' || (k === 'iso' && it.w);
    const notes = [];
    if (it.calib) notes.push(`<div class="note acc">Serie de calibración: con ${fmtKg(it.w)} hacé todas las reps que puedas y frená cuando te queden 2 (RIR 2). Anotá reps y RIR: con eso calculamos tu peso real.</div>`);
    if (it.r?.mode === 'cap') notes.push(`<div class="note pain">Modo dolor (${it.r.zones.map(zoneName).join(', ')}): al 60 % → ${fmtKg(it.w)}.</div>`);
    if (it.r?.mode === 'alt') notes.push(`<div class="note pain">Modo dolor: ${esc(zoneName(it.r.zones[0]))} está sensible, hoy va ${esc(it.ex.name.toLowerCase())} en vez de ${esc(it.orig.name.toLowerCase())}.</div>`);
    if (it.maint) notes.push(`<div class="note pain">Mantenimiento de ${esc(zoneName(it.maint).toLowerCase())} (fase 3).</div>`);
    const head = `<div class="set head"><span>#</span><span>${weighted ? 'kg' : ''}</span><span>${timed ? 'seg' : 'reps'}</span><span>${k === 'peso' ? 'RIR' : ''}</span><span></span></div>`;
    const rows = it.rows.map((r, j) => `<div class="set${r.done ? ' done' : ''}">
      <span class="n">${j + 1}</span>
      ${weighted ? `<input type="number" inputmode="decimal" step="0.5" min="0" value="${r.w}" data-w="${i}.${j}.w" aria-label="Kilos">` : '<span></span>'}
      <input type="number" inputmode="numeric" min="0" value="${timed ? r.secs : r.reps}" placeholder="${timed ? it.secs : '10'}" data-w="${i}.${j}.${timed ? 'secs' : 'reps'}" aria-label="${timed ? 'Segundos' : 'Repeticiones'}">
      ${k === 'peso' ? `<select data-w="${i}.${j}.rir" aria-label="Repeticiones en reserva"><option value="">–</option>${[0, 1, 2, 3, 4].map((n) => `<option ${String(r.rir) === String(n) ? 'selected' : ''}>${n}</option>`).join('')}</select>` : '<span></span>'}
      <button class="ok" data-action="set-done" data-i="${i}" data-j="${j}" aria-label="Serie hecha">✓</button></div>`).join('');
    return `<div class="card${it.r || it.maint ? ' pain' : ''}"><div class="ex"><div class="thumb">${figureSVG(it.ex, { crop: true })}</div>
      <div class="info"><h3>${esc(it.ex.name)}</h3><p class="muted small">${it.sets} × ${setLabel(it)}${weighted ? ` · ${fmtKg(it.w)}` : ''}</p></div></div>
      ${notes.join('')}<details class="cues"><summary>Cómo se hace</summary><ul>${it.ex.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></details>
      <div class="sets">${head}${rows}</div></div>`;
  }).join('');
  dlg('wsheet').html = `<div class="dlg"><div class="dlg-head"><button class="link danger" data-action="cancel-workout">Salir</button><strong>Entreno ${W.tpl}</strong><button class="link" data-action="finish-workout">Terminar</button></div>${body}
    <button class="cta" data-action="finish-workout">Terminar entreno</button></div>`;
}
function setDone(i, j) {
  const it = W.items[i], r = it.rows[j], k = it.ex.kind;
  if (!r.done) {
    if ((k === 'peso' || k === 'reps') && !(Number(r.reps) > 0)) return toast('Anotá las repeticiones que hiciste.');
    if ((k === 'tiempo' || k === 'iso') && !(Number(r.secs) > 0)) r.secs = it.secs;
  }
  r.done = !r.done;
  if (r.done && it.calib && j === 0 && k === 'peso') {
    if (r.rir === '') { r.done = false; return toast('Elegí cuántas reps te quedaban (RIR).'); }
    const c = calibrate(Number(r.w), Number(r.reps), Number(r.rir), it.steps);
    S.lifts[it.ex.id] = { w: c.w, e1rm: c.e1rm };
    it.calib = false; it.calibrated = true; it.base = c.w;
    it.w = it.r ? painCap(c.w, it.steps) : c.w;
    it.rows.slice(1).forEach((x) => { if (!x.done) x.w = it.w; });
    persist();
    toast(`Calibrado: tu peso de trabajo es ${fmtKg(c.w)}${it.r ? ` (hoy ${fmtKg(it.w)} por modo dolor)` : ''}.`);
  }
  renderWorkout();
  if (r.done && it.rows.some((x) => !x.done)) startRest(k === 'iso' ? ISO_REST : REST_SECS);
}
function finishWorkout() {
  const items = W.items.map((it) => ({ ex: it.ex.id, name: it.ex.name, maint: it.maint || undefined, capped: !!it.r, sets: it.rows.filter((r) => r.done).map((r) => ({ w: Number(r.w) || 0, reps: Number(r.reps) || 0, rir: r.rir === '' ? null : Number(r.rir), secs: Number(r.secs) || 0 })) }))
    .filter((x) => x.sets.length);
  if (!items.length) return toast('Marcá al menos una serie como hecha.');
  for (const it of W.items) {
    const sets = it.rows.filter((r) => r.done);
    if (!sets.length) continue;
    if (it.ex.kind === 'peso' && S.lifts[it.ex.id]) {
      const lift = S.lifts[it.ex.id];
      const best = Math.max(...sets.map((s) => epley1RM(Number(s.w), Number(s.reps) + (Number(s.rir) || 0))));
      lift.e1rm = Math.round(Math.max(lift.e1rm || 0, best) * 10) / 10;
      // Con tope por dolor o recién calibrado no se progresa: el peso de trabajo ya quedó definido.
      if (!it.r && !it.calibrated) lift.w = progress(lift.w, sets.map((s) => ({ reps: Number(s.reps) })), it.steps);
    }
    if (it.ex.kind === 'tiempo') { const l = (S.lifts[it.ex.id] ||= { secs: 30 }); if (sets.every((s) => Number(s.secs) >= l.secs)) l.secs = Math.min(90, l.secs + 5); }
  }
  const session = { id: uid(), date: today(), type: 'entreno', tpl: W.tpl, items };
  const zones = [...new Set(W.items.flatMap((it) => (it.r ? it.r.zones : it.maint ? [it.maint] : [])))];
  S.plan.next = W.tpl === 'A' ? 'B' : 'A';
  stopRest(); W = null; $('wsheet').close();
  if (S.painMode && zones.length) askPain(session, zones);
  else saveSession(session);
}
function saveSession(session) {
  S.sessions.unshift(session); persist(); render();
  toast(session.type === 'entreno' ? '¡Entreno guardado! 💪' : 'Rehabilitación guardada.');
}

// Descanso entre series
let restTimer = null;
function startRest(secs) {
  stopRest();
  const el = $('rest'), end = Date.now() + secs * 1000;
  overlayHost().appendChild(el); el.hidden = false;
  const tick = () => {
    const left = Math.max(0, Math.round((end - Date.now()) / 1000));
    $('rest-time').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    if (!left) { stopRest(); navigator.vibrate?.(300); }
  };
  tick(); restTimer = setInterval(tick, 250);
}
function stopRest() { clearInterval(restTimer); restTimer = null; $('rest').hidden = true; }

// ——— Sesión de rehabilitación ———
let R = null;   // { slot, items, idx, set, phase: 'listo'|'hold'|'rest', end, timer }
function startRehab() {
  const items = rehabItems().map((it) => ({ ...it, done: 0 }));
  const custom = S.custom.filter((c) => !c.zone || S.zones[c.zone]).map((c) => ({ custom: c, done: false }));
  R = { slot: slotNow(), items, custom, idx: 0, state: 'listo' };
  renderRehab(); $('rsheet').showModal(); calmMotion($('rsheet'));
}
function renderRehab() {
  const it = R.items[R.idx];
  let main = '';
  if (it) {
    const iso = it.ex.kind === 'iso';
    const total = R.state === 'rest' ? ISO_REST : it.secs;
    const left = R.left ?? total;
    const C = 2 * Math.PI * 100;
    main = `<p class="muted small">${esc(zoneName(it.zone))} · ${esc(PHASES[S.zones[it.zone].phase].name)} · ejercicio ${R.idx + 1} de ${R.items.length}</p>
      <h1 style="font-size:28px">${esc(it.ex.name)}</h1>
      <div class="hero-fig">${figureSVG(it.ex)}</div>
      <p class="num" style="text-align:center;font-size:20px">${it.w ? fmtKg(it.w) + ' · ' : ''}${iso ? `${it.sets} × ${it.secs} s` : `${it.sets} × ${it.reps} reps (3 s subir, 3 s bajar)`}</p>
      ${iso ? `<div class="timer${R.state === 'rest' ? ' resting' : ''}"><svg viewBox="0 0 220 220"><circle class="track" cx="110" cy="110" r="100"/><circle class="bar" cx="110" cy="110" r="100" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - left / total)}"/></svg>
        <div class="label"><div><div class="big num" id="r-left">${left}</div><div class="muted">${R.state === 'rest' ? 'descanso' : R.state === 'hold' ? 'sostené' : `serie ${it.done + 1} de ${it.sets}`}</div></div></div></div>
        <button class="cta pain" data-action="${R.state === 'listo' ? 'rehab-go' : 'rehab-skip'}">${R.state === 'listo' ? `Empezar serie ${it.done + 1}` : R.state === 'hold' ? 'Terminar serie' : 'Saltar descanso'}</button>`
      : `<div class="chips" style="justify-content:center;margin:12px 0">${Array.from({ length: it.sets }, (_, s) => `<button class="chip${s < it.done ? ' on' : ''}" data-action="lento-set" data-s="${s}">Serie ${s + 1}</button>`).join('')}</div>
        <button class="cta pain" data-action="rehab-next" ${it.done < it.sets ? 'disabled' : ''}>Siguiente</button>`}
      <details class="cues"><summary>Cómo se hace</summary><ul>${it.ex.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></details>`;
  } else {
    main = `<h1 style="font-size:28px">${R.custom.length ? 'Tus ejercicios del fisio' : '¡Listo!'}</h1>
      ${R.custom.map((c, i) => `<div class="card"><div class="row"><div><h3>${esc(c.custom.name)}</h3><p class="muted small">${c.custom.sets} × ${c.custom.value} ${c.custom.mode === 'segundos' ? 's' : 'reps'}${c.custom.zone ? ' · ' + esc(zoneName(c.custom.zone)) : ''}</p>${c.custom.note ? `<p class="small">${esc(c.custom.note)}</p>` : ''}</div>
        <button class="chip${c.done ? ' on' : ''}" data-action="custom-done" data-i="${i}">${c.done ? 'Hecho' : 'Marcar'}</button></div></div>`).join('')}
      <button class="cta pain" data-action="finish-rehab">Terminar y anotar dolor</button>`;
  }
  dlg('rsheet').html = `<div class="dlg"><div class="dlg-head"><button class="link" data-action="cancel-rehab">Salir</button><strong>Rehab · ${R.slot}</strong><span></span></div>${main}</div>`;
  calmMotion($('rsheet'));
}
// Solo actualiza el número y el anillo: redibujar todo reiniciaría la animación del boceto.
function rehabTick() {
  const left = Math.max(0, Math.ceil((R.end - Date.now()) / 1000));
  if (left !== R.left) {
    R.left = left;
    const total = R.state === 'rest' ? ISO_REST : R.items[R.idx].secs, bar = $('rsheet').querySelector('.timer .bar');
    if ($('r-left')) $('r-left').textContent = left;
    if (bar) bar.style.strokeDashoffset = 2 * Math.PI * 100 * (1 - left / total);
  }
  if (left > 0) return;
  clearInterval(R.timer); R.timer = null; R.left = null;
  const it = R.items[R.idx];
  if (R.state === 'hold') {
    it.done++; navigator.vibrate?.([200, 100, 200]);
    if (it.done >= it.sets) { R.state = 'listo'; R.idx++; }
    else { R.state = 'rest'; R.end = Date.now() + ISO_REST * 1000; R.timer = setInterval(rehabTick, 250); }
  } else if (R.state === 'rest') R.state = 'listo';
  renderRehab();
}
function rehabGo() {
  const it = R.items[R.idx];
  R.state = 'hold'; R.end = Date.now() + it.secs * 1000; R.left = it.secs;
  R.timer = setInterval(rehabTick, 250); renderRehab();
}
function rehabSkip() { R.end = Date.now(); rehabTick(); }
function finishRehab() {
  clearInterval(R?.timer);
  const done = R.items.filter((it) => it.done > 0);
  const items = done.map((it) => ({ ex: it.ex.id, zone: it.zone, sets: Array.from({ length: it.done }, () => ({ w: it.w, secs: it.ex.kind === 'iso' ? it.secs : 0, reps: it.ex.kind === 'lento' ? it.reps : 0, done: true })) }))
    .concat(R.custom.filter((c) => c.done).map((c) => ({ ex: 'custom:' + c.custom.id, name: c.custom.name, zone: c.custom.zone || undefined, sets: [{ done: true }] })));
  const session = { id: uid(), date: today(), type: 'rehab', slot: R.slot, items };
  if (!items.length) { toast('No hiciste ningún ejercicio todavía.'); return; }
  const zones = [...new Set([...done.map((i) => i.zone), ...R.custom.filter((c) => c.done && c.custom.zone).map((c) => c.custom.zone)])];
  R = null; $('rsheet').close();
  if (zones.length) askPain(session, zones); else saveSession(session);
}

// ——— Dolor 0–10 ———
let P = null;   // { session, zones, vals }
function askPain(session, zones) {
  P = { session, zones, vals: {} };
  renderPain(); $('painsheet').showModal();
}
function renderPain() {
  dlg('painsheet').html = `<div class="dlg pain"><div class="dlg-head"><strong>¿Cuánto dolió?</strong><span></span></div>
    <p class="muted small">Durante el ejercicio, de 0 (nada) a 10 (máximo). Hasta 3–4 está bien.</p>
    ${P.zones.map((z) => `<h3 style="margin-top:14px">${esc(zoneName(z))}</h3><div class="chips scale">${Array.from({ length: 11 }, (_, n) => `<button class="chip${P.vals[z] === n ? ' on' : ''}" data-action="pain-val" data-zone="${z}" data-n="${n}">${n}</button>`).join('')}</div>`).join('')}
    <button class="cta pain" style="margin-top:18px" data-action="save-pain" ${P.zones.every((z) => P.vals[z] != null) ? '' : 'disabled'}>Guardar</button></div>`;
}
function savePain() {
  const { session, vals } = P;
  session.pain = vals;
  const msgs = [];
  if (session.type === 'rehab') {
    for (const [zone, val] of Object.entries(vals)) {
      const z = S.zones[zone]; if (!z || val <= PAIN_MAX) continue;
      // Pasó de 4: baja un salto ya, sin esperar a mañana.
      const ex = EXERCISES[REHAB[zone][Math.min(2, z.phase)]];
      S.zones[zone] = { ...isoAdjust(z, ex, weightSteps(S.equip, implFor(ex, S.equip)), val, false), adjustedOn: today() };
      msgs.push(zoneName(zone).toLowerCase());
    }
  }
  P = null; $('painsheet').close(); saveSession(session);
  if (msgs.length) toast(`Dolió más de 4 en ${msgs.join(' y ')}: bajamos la carga para la próxima.`);
}
// Respuesta de "¿cómo amaneció?": ajusta la carga del isométrico con el dolor de ayer.
function answerCheck(zone, val) {
  const t = today(), y = addDays(t, -1), z = S.zones[zone];
  S.checks.push({ date: t, zone, val });
  if (z && z.phase < 3) {
    const pains = S.sessions.filter((s) => s.date === y && s.type === 'rehab' && s.pain?.[zone] != null).map((s) => s.pain[zone]);
    const worse = val === 'peor';
    if (pains.length && !(z.adjustedOn === y && !worse)) {
      const ex = EXERCISES[REHAB[zone][z.phase]];
      const nz = isoAdjust(z, ex, weightSteps(S.equip, implFor(ex, S.equip)), Math.max(...pains), worse);
      if (nz.load !== z.load || nz.secs !== z.secs) toast(`${zoneName(zone)}: ${nz.load > (z.load || 0) || nz.secs > (z.secs || ISO_SECS) ? 'subimos' : 'bajamos'} a ${nz.load ? fmtKg(nz.load) + ' · ' : ''}${nz.secs} s.`);
      S.zones[zone] = { ...nz, adjustedOn: undefined };
    }
  }
  persist(); render();
}

// ——— Tendones ———
function renderTendons() {
  let h = `<h1>Tendones</h1>
    <div class="card pain"><div class="row"><div><h3>Modo dolor</h3><p class="muted small">Isométricos diarios, registro de dolor y entreno adaptado en las zonas que marques.</p></div>
    <label class="switch"><input type="checkbox" data-action="pain-mode" ${S.painMode ? 'checked' : ''} aria-label="Modo dolor"><i></i></label></div></div>
    <h2>¿Qué te duele?</h2>`;
  for (const zd of ZONES) {
    const z = S.zones[zd.id];
    h += `<div class="card${z ? ' pain' : ''}"><div class="row"><div><h3>${esc(zd.name)}${z ? ` <span class="tag pain">${esc(PHASES[z.phase].short)}</span>` : ''}</h3><p class="muted small">${esc(zd.hint)}</p></div>
      <label class="switch"><input type="checkbox" data-action="zone-toggle" data-zone="${zd.id}" ${z ? 'checked' : ''} aria-label="Me duele ${esc(zd.name)}"><i></i></label></div>`;
    if (z) {
      const ex = EXERCISES[REHAB[zd.id][Math.min(2, z.phase)]];
      h += `<div class="chips" style="margin-top:10px">${Object.entries(SIDES).map(([k, v]) => `<button class="chip${z.side === k ? ' on' : ''}" data-action="zone-side" data-zone="${zd.id}" data-side="${k}">${v}</button>`).join('')}</div>
        <p class="small" style="margin-top:10px"><b>${esc(PHASES[z.phase].name)}</b> · desde ${fmtDate(z.since)}<br><span class="muted">${esc(PHASES[z.phase].what)}</span></p>
        ${z.phase < 3 ? `<div class="ex" data-action="ex-detail" data-ex="${ex.id}"><div class="thumb">${figureSVG(ex, { animate: false, crop: true })}</div><div class="info"><h3>${esc(ex.name)}</h3><p class="muted small">${z.load ? fmtKg(z.load) + ' · ' : ''}${z.phase === 1 ? `${ISO_SETS} × ${z.secs || ISO_SECS} s` : `${LENTO_SETS} × ${LENTO_REPS}`}</p></div></div>` : ''}
        <div class="btns" style="margin-top:8px">${z.phase > 1 ? `<button class="sec" data-action="phase" data-zone="${zd.id}" data-dir="-1">← Fase ${z.phase - 1}</button>` : ''}${z.phase < 3 ? `<button class="sec" data-action="phase" data-zone="${zd.id}" data-dir="1">Fase ${z.phase + 1} →</button>` : ''}</div>
        <p class="faint small">${z.phase < 3 ? (phaseReady(S, zd.id, today()) ? '✓ Lista para avanzar.' : 'Para avanzar: 10 días en la fase y una semana con dolor ≤ 3 sin empeorar.') : ''}</p>`;
    }
    h += `</div>`;
  }
  h += `<h2>Ejercicios del fisio</h2><div class="card">${S.custom.length ? S.custom.map((c) => `<div class="row"><div><h3>${esc(c.name)}</h3><p class="muted small">${c.sets} × ${c.value} ${c.mode === 'segundos' ? 's' : 'reps'}${c.zone ? ' · ' + esc(zoneName(c.zone)) : ''}</p></div><button class="link" data-action="custom-edit" data-id="${c.id}">Editar</button></div>`).join('') : '<p class="muted small">Cargá los ejercicios que te dio tu fisio: aparecen en cada sesión de rehabilitación.</p>'}
    <button class="sec" style="margin-top:10px;width:100%" data-action="custom-edit">+ Agregar ejercicio</button></div>
    <p class="faint small">Esto no reemplaza a un profesional. Si el dolor es agudo, apareció de golpe, hay hinchazón o pérdida de fuerza, consultá antes de cargar el tendón.</p>`;
  $('view-tendons').innerHTML = h;
}
function openCustom(id) {
  const c = S.custom.find((x) => x.id === id) || { id: '', name: '', zone: '', sets: 3, mode: 'reps', value: 15, note: '' };
  dlg('customsheet').html = `<div class="dlg"><div class="dlg-head"><button class="link" data-action="close" data-dlg="customsheet">Cancelar</button><strong>${c.id ? 'Editar' : 'Nuevo'} ejercicio</strong><button class="link" data-action="custom-save" data-id="${c.id}">Guardar</button></div>
    <label class="field"><span>Nombre</span><input id="c-name" value="${esc(c.name)}" placeholder="Ej.: Excéntrico de muñeca con Flexbar"></label>
    <label class="field"><span>Zona</span><select id="c-zone"><option value="">General</option>${ZONES.map((z) => `<option value="${z.id}" ${c.zone === z.id ? 'selected' : ''}>${esc(z.name)}</option>`).join('')}</select></label>
    <div class="grid2"><label class="field"><span>Series</span><input id="c-sets" type="number" inputmode="numeric" min="1" value="${c.sets}"></label>
    <label class="field"><span>${'Por serie'}</span><input id="c-value" type="number" inputmode="numeric" min="1" value="${c.value}"></label></div>
    <div class="chips">${['reps', 'segundos'].map((m) => `<button class="chip${c.mode === m ? ' on' : ''}" data-action="custom-mode" data-mode="${m}">${m}</button>`).join('')}</div>
    <label class="field"><span>Nota</span><textarea id="c-note" rows="2">${esc(c.note)}</textarea></label>
    ${c.id ? `<button class="link danger" data-action="custom-del" data-id="${c.id}">Eliminar</button>` : ''}</div>`;
  $('customsheet').dataset.mode = c.mode;
  $('customsheet').showModal();
}

// ——— Historial ———
let histZone = '', histEx = '';
function weightHistory(exId) {
  return S.sessions.filter((s) => s.type === 'entreno').map((s) => {
    const it = s.items.find((i) => i.ex === exId && !i.capped);
    return it && it.sets.length ? { x: s.date, y: Math.max(...it.sets.map((x) => x.w)) } : null;
  }).filter(Boolean).reverse();
}
function painHistory(zone) {
  const byDay = {};
  for (const s of S.sessions) if (s.pain?.[zone] != null) byDay[s.date] = Math.max(byDay[s.date] ?? 0, s.pain[zone]);
  return Object.entries(byDay).sort().map(([x, y]) => ({ x, y }));
}
function renderHistory() {
  const zones = [...new Set([...activeZones(), ...S.sessions.flatMap((s) => Object.keys(s.pain || {}))])];
  if (!zones.includes(histZone)) histZone = zones[0] || '';
  const exIds = [...new Set(S.sessions.filter((s) => s.type === 'entreno').flatMap((s) => s.items.filter((i) => getEx(i.ex)?.kind === 'peso').map((i) => i.ex)))];
  if (!exIds.includes(histEx)) histEx = exIds[0] || '';
  let h = `<h1>Historial</h1>`;
  h += `<h2>Dolor por zona</h2><div class="card pain">${zones.length ? `<select data-action="hist-zone" aria-label="Zona">${zones.map((z) => `<option value="${z}" ${z === histZone ? 'selected' : ''}>${esc(zoneName(z))}</option>`).join('')}</select>
    ${lineChart(painHistory(histZone), { yMax: 10, limit: PAIN_MAX, unit: '/10', color: 'var(--pain)' })}` : '<p class="muted small">Cuando registres dolor vas a ver su evolución acá.</p>'}</div>`;
  h += `<h2>Peso por ejercicio</h2><div class="card acc">${exIds.length ? `<select data-action="hist-ex" aria-label="Ejercicio">${exIds.map((e) => `<option value="${e}" ${e === histEx ? 'selected' : ''}>${esc(getEx(e)?.name || e)}</option>`).join('')}</select>
    ${lineChart(weightHistory(histEx), { unit: 'kg', color: 'var(--acc)' })}` : '<p class="muted small">Después de tus primeros entrenos vas a ver el progreso acá.</p>'}</div>`;
  h += `<h2>Sesiones</h2><div class="card">${S.sessions.length ? S.sessions.slice(0, 60).map((s) => `<details class="sess-d"><summary class="sess"><span><span class="what">${s.type === 'entreno' ? `Entreno ${s.tpl}` : `Rehab · ${s.slot}`}</span><br><span class="muted small">${fmtDate(s.date)}${s.pain ? ' · dolor ' + Object.entries(s.pain).map(([z, v]) => `${zoneName(z).toLowerCase()} ${v}`).join(', ') : ''}</span></span><span class="tag ${s.type === 'entreno' ? 'acc' : 'pain'}">${s.items.length} ej.</span></summary>
      <ul class="small muted">${s.items.map((i) => `<li>${esc(getEx(i.ex)?.name || i.name || i.ex)}: ${i.sets.map((x) => (x.w ? `${x.w}×` : '') + (x.reps || (x.secs ? x.secs + 's' : '✓'))).join(', ')}</li>`).join('')}</ul>
      <button class="link danger small" data-action="del-session" data-id="${s.id}">Eliminar sesión</button></details>`).join('') : '<p class="muted small">Todavía no hay sesiones.</p>'}</div>`;
  $('view-history').innerHTML = h;
}
// Gráfico de una serie: fechas en x, valor en y; tocá un punto para ver el valor.
function lineChart(pts, { yMax, limit, unit, color }) {
  if (pts.length < 2) return `<div class="chart"><div class="empty">${pts.length ? `Un registro: ${pts[0].y}${unit === 'kg' ? ' kg' : unit}. Con dos ya se ve la línea.` : 'Sin registros todavía.'}</div></div>`;
  const W_ = 320, H = 150, L = 28, Rr = 8, T = 10, B = 22;
  const t0 = parseDay(pts[0].x), t1 = parseDay(pts[pts.length - 1].x), span = Math.max(1, t1 - t0);
  const max = yMax ?? (Math.max(...pts.map((p) => p.y)) * 1.15 || 1);
  const X = (k) => L + ((parseDay(k) - t0) / span) * (W_ - L - Rr), Y = (v) => T + (1 - v / max) * (H - T - B);
  const ticks = yMax === 10 ? [0, 5, 10] : [0, Math.round(max / 2), Math.round(max)];
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join('');
  return `<div class="chart"><svg viewBox="0 0 ${W_} ${H}" role="img" aria-label="Gráfico de ${pts.length} registros">
    ${ticks.map((v) => `<line class="grid" x1="${L}" x2="${W_ - Rr}" y1="${Y(v)}" y2="${Y(v)}"/><text class="axis" x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`).join('')}
    ${limit != null ? `<line class="limit" x1="${L}" x2="${W_ - Rr}" y1="${Y(limit)}" y2="${Y(limit)}"/>` : ''}
    <text class="axis" x="${L}" y="${H - 4}">${fmtDate(pts[0].x)}</text><text class="axis" x="${W_ - Rr}" y="${H - 4}" text-anchor="end">${fmtDate(pts[pts.length - 1].x)}</text>
    <path class="series" d="${d}" stroke="${color}"/>
    ${pts.map((p) => `<circle class="dot" cx="${X(p.x)}" cy="${Y(p.y)}" r="4" fill="${color}"/><circle class="hit" cx="${X(p.x)}" cy="${Y(p.y)}" r="14" data-tip="${esc(fmtDate(p.x))}|${p.y}${unit === 'kg' ? ' kg' : unit}"/>`).join('')}
  </svg></div>`;
}
function showTip(el) {
  const [date, val] = el.dataset.tip.split('|'), r = el.getBoundingClientRect(), tip = $('tip');
  overlayHost().appendChild(tip);
  tip.innerHTML = `<b>${esc(val)}</b> · ${esc(date)}`; tip.hidden = false;
  tip.style.left = `${r.left + r.width / 2}px`; tip.style.top = `${r.top + r.height / 2 - 6}px`;
}

// ——— Ajustes ———
function renderSettings() {
  const p = S.profile, e = S.equip;
  let h = `<h1>Ajustes</h1>
  <h2>Perfil</h2><div class="card">
    <label class="field"><span>Nombre</span><input data-set="profile.name" value="${esc(p.name)}"></label>
    <span class="small muted">Sexo</span><div class="chips" style="margin:4px 0 8px">${[['h', 'Hombre'], ['m', 'Mujer'], ['x', 'Prefiero no decir']].map(([k, v]) => `<button class="chip${p.sex === k ? ' on' : ''}" data-action="set-sex" data-v="${k}">${v}</button>`).join('')}</div>
    <div class="grid2"><label class="field"><span>Peso (kg)</span><input data-set="profile.weight" type="number" inputmode="decimal" value="${esc(p.weight)}"></label>
    <label class="field"><span>Altura (cm)</span><input data-set="profile.height" type="number" inputmode="numeric" value="${esc(p.height)}"></label>
    <label class="field"><span>Edad</span><input data-set="profile.age" type="number" inputmode="numeric" value="${esc(p.age)}"></label>
    <label class="field"><span>Días por semana</span><select data-set="profile.days">${[2, 3].map((d) => `<option ${p.days === d ? 'selected' : ''}>${d}</option>`).join('')}</select></label></div>
    <span class="small muted">Experiencia</span><div class="chips" style="margin-top:4px">${EXPERIENCE.map((x) => `<button class="chip${p.exp === x.id ? ' on' : ''}" data-action="set-exp" data-v="${x.id}">${x.name}</button>`).join('')}</div>
    <p class="faint small">Con sexo, peso, edad y experiencia estimamos tu peso inicial; la serie de calibración lo ajusta. La altura casi no cambia el cálculo.</p></div>
  <h2>Equipo</h2><div class="card">${equipFields()}</div>
  <h2>Recordatorios</h2><div class="card">
    <p class="muted small">Se agregan a tu calendario: es la forma más confiable de recibir avisos sin servidor.</p>
    <div class="grid2"><label class="field"><span>Isométricos mañana</span><input type="time" data-set="rem.am" value="${S.rem.am}"></label><label class="field"><span>Isométricos noche</span><input type="time" data-set="rem.pm" value="${S.rem.pm}"></label></div>
    <span class="small muted">Días de entreno</span><div class="chips" style="margin:4px 0">${Object.entries(DAY_NAMES).map(([k, v]) => `<button class="chip${S.rem.train.includes(k) ? ' on' : ''}" data-action="rem-day" data-v="${k}">${v}</button>`).join('')}</div>
    <label class="field"><span>Hora del entreno</span><input type="time" data-set="rem.trainAt" value="${S.rem.trainAt}"></label>
    <button class="sec" style="width:100%" data-action="ics">📅 Agregar al calendario</button>
    ${S.painMode ? '' : '<p class="faint small">Los isométricos se incluyen solo con el modo dolor activado.</p>'}</div>
  <h2>Copia de seguridad</h2><div class="card">
    <p class="muted small">Tus datos viven solo en este teléfono. Guardá una copia de vez en cuando (Drive, correo, WhatsApp).</p>
    <div class="btns"><button class="sec" data-action="export">Guardar copia</button><button class="sec" data-action="import">Restaurar copia</button></div>
    <input type="file" id="import-file" accept=".json,application/json" hidden>
    <p class="faint small" id="persist-status"></p></div>
  <h2>Fuentes</h2><div class="card small">
    <p class="muted">Protocolo de tendones basado en:</p><ul>${SOURCES.map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join('')}</ul>
    <p class="muted">Ilustraciones generadas por código para esta app (sin imágenes de terceros). Tendón Fuerte no es un consejo médico: consultá a un profesional ante dolor agudo, hinchazón o pérdida de fuerza.</p>
    <p class="faint">Versión ${APP_VERSION}</p></div>
  <button class="link danger" data-action="reset">Borrar todos los datos</button>`;
  $('view-settings').innerHTML = h;
  navigator.storage?.persisted?.().then((ok) => { const el = $('persist-status'); if (el) el.textContent = ok ? '✓ Almacenamiento persistente: el navegador no borra los datos por falta de espacio.' : 'El navegador podría borrar los datos si falta espacio: instalá la app y guardá copias.'; });
}
function equipFields(prefix = '') {
  const e = S.equip;
  return `<div class="row"><h3>Mancuernas</h3><label class="switch acc"><input type="checkbox" data-action="eq-db" ${e.db ? 'checked' : ''} aria-label="Tengo mancuernas"><i></i></label></div>
    ${e.db ? `<div class="grid2" style="grid-template-columns:1fr 1fr 1fr"><label class="field"><span>Mínimo (kg)</span><input type="number" inputmode="decimal" step="0.5" data-set="equip.db.min" value="${e.db.min}"></label><label class="field"><span>Máximo (kg)</span><input type="number" inputmode="decimal" step="0.5" data-set="equip.db.max" value="${e.db.max}"></label><label class="field"><span>Salto (kg)</span><input type="number" inputmode="decimal" step="0.25" data-set="equip.db.step" value="${e.db.step}"></label></div>` : ''}
    <label class="field"><span>Pesas rusas (kg, separadas por coma)</span><input data-set="equip.kb" ${prefix} value="${e.kb.join(', ')}" placeholder="Ej.: 12, 20"></label>
    <div class="row"><h3>Aros o TRX</h3><label class="switch acc"><input type="checkbox" data-action="eq-rings" ${e.rings ? 'checked' : ''} aria-label="Tengo aros"><i></i></label></div>
    ${[['bench', 'Banco'], ['bar', 'Barra de dominadas'], ['band', 'Bandas elásticas']].map(([k, n]) => `<div class="row"><h3>${n}</h3><label class="switch acc"><input type="checkbox" data-action="eq-flag" data-k="${k}" ${e[k] ? 'checked' : ''} aria-label="Tengo ${n.toLowerCase()}"><i></i></label></div>`).join('')}
    <h3 style="margin-top:14px">Máquinas y otros equipos</h3>
    ${(e.machines || []).map((m) => `<div class="row"><div><b>${esc(m.name)}</b><br><span class="small muted">${m.min}–${m.max} kg, de a ${m.step}</span></div><button class="link" data-action="mach-edit" data-id="${m.id}">Editar</button></div>`).join('') || '<p class="faint small">Polea, prensa, barra con discos… cualquier cosa con su rango de peso.</p>'}
    <button class="sec" style="width:100%;margin-top:8px" data-action="mach-edit">+ Agregar máquina</button>`;
}
function setPath(path, raw) {
  const keys = path.split('.'), last = keys.pop();
  let o = S; for (const k of keys) o = o[k];
  let v = raw;
  if (path === 'equip.kb') v = raw.split(/[,;\s]+/).map((x) => Number(x.replace(',', '.'))).filter((x) => x > 0).sort((a, b) => a - b);
  else if (path.startsWith('equip.db.')) { v = Number(String(raw).replace(',', '.')); if (!(v > 0)) return; }
  else if (path === 'profile.days') v = Number(raw);
  o[last] = v;
  if (path === 'profile.days') syncBudget();
  persist();
}

// ——— Primer uso ———
let onbStep = 0;
const ONB_STEPS = 4;
function renderOnb() {
  const p = S.profile;
  const steps = `<div class="steps">${Array.from({ length: ONB_STEPS }, (_, i) => `<i class="${i <= onbStep ? 'on' : ''}"></i>`).join('')}</div>`;
  let body = '';
  if (onbStep === 0) body = `<h1>Tendón Fuerte</h1><div class="hero-fig">${figureSVG(EXERCISES.iso_ext_muneca)}</div>
    <p>Rehabilitación de tendones y entreno con mancuernas, con reglas basadas en evidencia.</p>
    <p class="muted small">Protocolo de isométricos del video de Jeremy Ethier con el investigador Keith Baar y el fisioterapeuta Coach Q. No reemplaza a un profesional.</p>
    <p class="muted small">Tus datos quedan solo en este teléfono.</p>`;
  if (onbStep === 1) body = `<h1>Tu perfil</h1><p class="muted small">Sirve para estimar cuánto levantar al principio.</p>
    <label class="field"><span>Nombre o apodo</span><input data-set="profile.name" value="${esc(p.name)}"></label>
    <span class="small muted">Sexo</span><div class="chips" style="margin:4px 0 8px">${[['h', 'Hombre'], ['m', 'Mujer'], ['x', 'Prefiero no decir']].map(([k, v]) => `<button class="chip${p.sex === k ? ' on' : ''}" data-action="set-sex" data-v="${k}">${v}</button>`).join('')}</div>
    <div class="grid2"><label class="field"><span>Peso (kg)</span><input id="o-weight" data-set="profile.weight" type="number" inputmode="decimal" value="${esc(p.weight)}"></label>
    <label class="field"><span>Altura (cm)</span><input data-set="profile.height" type="number" inputmode="numeric" value="${esc(p.height)}"></label>
    <label class="field"><span>Edad</span><input data-set="profile.age" type="number" inputmode="numeric" value="${esc(p.age)}"></label>
    <label class="field"><span>Días por semana</span><select data-set="profile.days">${[2, 3].map((d) => `<option ${p.days === d ? 'selected' : ''}>${d}</option>`).join('')}</select></label></div>
    <span class="small muted">¿Cuánto hace que entrenás con pesas?</span><div class="chips" style="margin-top:4px">${EXPERIENCE.map((x) => `<button class="chip${p.exp === x.id ? ' on' : ''}" data-action="set-exp" data-v="${x.id}">${x.name}</button>`).join('')}</div>`;
  if (onbStep === 2) body = `<h1>Tu equipo</h1><p class="muted small">La app muestra solo lo que podés hacer y redondea los pesos a lo que tenés.</p><div class="card">${equipFields()}</div>`;
  if (onbStep === 3) body = `<h1>¿Te duele algo?</h1><p class="muted small">Opcional. Marcá las zonas y cuánto duelen hoy al usarlas. El modo dolor queda apagado: lo activás cuando quieras.</p>
    ${ZONES.map((z) => { const zz = S.zones[z.id]; return `<div class="card${zz ? ' pain' : ''}"><div class="row"><div><h3>${esc(z.name)}</h3><p class="muted small">${esc(z.hint)}</p></div><label class="switch"><input type="checkbox" data-action="zone-toggle" data-zone="${z.id}" ${zz ? 'checked' : ''} aria-label="Me duele ${esc(z.name)}"><i></i></label></div>
      ${zz ? `<div class="chips scale" style="margin-top:8px">${Array.from({ length: 11 }, (_, n) => `<button class="chip pain${zz.pain0 === n ? ' on' : ''}" data-action="zone-pain" data-zone="${z.id}" data-n="${n}">${n}</button>`).join('')}</div>
        <div class="chips" style="margin-top:8px">${Object.entries(SIDES).map(([k, v]) => `<button class="chip pain${zz.side === k ? ' on' : ''}" data-action="zone-side" data-zone="${z.id}" data-side="${k}">${v}</button>`).join('')}</div>` : ''}</div>`; }).join('')}`;
  dlg('onb').html = `<div class="dlg">${steps}${body}<div class="btns" style="margin-top:16px">${onbStep ? '<button class="sec" data-action="onb-back">Atrás</button>' : ''}<button class="cta" data-action="onb-next">${onbStep === ONB_STEPS - 1 ? 'Listo' : 'Siguiente'}</button></div></div>`;
  calmMotion($('onb'));
}
function onbNext() {
  if (onbStep === 1 && !(Number(S.profile.weight) > 0)) return toast('Poné tu peso para estimar las cargas.');
  if (onbStep < ONB_STEPS - 1) { onbStep++; renderOnb(); $('onb').querySelector('.dlg').scrollTop = 0; return; }
  S.onboarded = true; syncBudget(); persist();
  navigator.storage?.persist?.();
  $('onb').close(); render();
}

// ——— Archivos (copia y calendario) ———
async function shareFile(name, text, type) {
  const file = new File([text], name, { type });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
function exportData() { shareFile(`tendon-fuerte-${today()}.json`, JSON.stringify({ app: 'tendon-fuerte', version: APP_VERSION, data: S }, null, 1), 'application/json'); }
async function importData(file) {
  try {
    const j = JSON.parse(await file.text()), d = j.data || j;
    if (!d.profile || !Array.isArray(d.sessions)) throw new Error('no es una copia de Tendón Fuerte');
    if (!confirm(`¿Reemplazar tus datos por la copia (${d.sessions.length} sesiones)?`)) return;
    S = withDefaults(d); S.onboarded = true; await persist(); render(); toast('Copia restaurada.');
  } catch (e) { toast('No se pudo leer el archivo: ' + e.message); }
}

// ——— Eventos ———
document.addEventListener('click', (e) => {
  const tabBtn = e.target.closest('.tabbar button');
  if (tabBtn) return showTab(tabBtn.dataset.tab);
  const hit = e.target.closest('[data-tip]');
  if (hit) return showTip(hit);
  $('tip').hidden = true;
  const el = e.target.closest('[data-action]');
  if (!el || el.matches('input, select')) return;
  const a = el.dataset.action, d = el.dataset;
  const actions = {
    'start-workout': () => startWorkout(d.tpl),
    'cancel-workout': () => { if (confirm('¿Salir sin guardar el entreno?')) { stopRest(); W = null; $('wsheet').close(); } },
    'finish-workout': finishWorkout,
    'set-done': () => setDone(+d.i, +d.j),
    'skip-rest': stopRest,
    'ex-detail': () => openExercise(d.ex),
    'recalibrate': () => { if (confirm('¿Borrar el peso de trabajo y volver a calibrar?')) { delete S.lifts[d.ex]; persist(); $('exsheet').close(); render(); } },
    'close': () => $(d.dlg).close(),
    'start-rehab': startRehab,
    'rehab-go': rehabGo,
    'rehab-skip': rehabSkip,
    'lento-set': () => { const it = R.items[R.idx]; it.done = +d.s < it.done ? +d.s : +d.s + 1; renderRehab(); },
    'rehab-next': () => { R.idx++; R.state = 'listo'; renderRehab(); },
    'custom-done': () => { R.custom[+d.i].done = !R.custom[+d.i].done; renderRehab(); },
    'finish-rehab': finishRehab,
    'cancel-rehab': () => { if (confirm('¿Salir sin guardar la sesión?')) { clearInterval(R?.timer); R = null; $('rsheet').close(); } },
    'pain-val': () => { P.vals[d.zone] = +d.n; renderPain(); },
    'save-pain': savePain,
    'check': () => answerCheck(d.zone, d.val),
    'pain-mode-on': () => { S.painMode = true; persist(); render(); toast('Modo dolor activado.'); },
    'hide-pain-tip': () => { S.hidePainTip = true; persist(); render(); },
    'phase': () => {
      const z = S.zones[d.zone], to = z.phase + Number(d.dir);
      if (to < 1 || to > 3) return;
      if (Number(d.dir) > 0 && !phaseReady(S, d.zone, today()) && !confirm('Todavía no cumple el criterio (10 días y una semana con dolor ≤ 3). ¿Avanzar igual?')) return;
      S.zones[d.zone] = { ...z, phase: to, since: today() }; persist(); render();
    },
    'three-days': () => { S.profile.days = 3; syncBudget(); persist(); render(); toast('3 días por semana. El volumen sube de a 30 %.'); },
    'zone-side': () => { S.zones[d.zone].side = d.side; persist(); $('onb').open ? renderOnb() : render(); },
    'zone-pain': () => { S.zones[d.zone].pain0 = +d.n; persist(); renderOnb(); },
    'custom-edit': () => openCustom(d.id),
    'custom-mode': () => { $('customsheet').dataset.mode = d.mode; $('customsheet').querySelectorAll('[data-action="custom-mode"]').forEach((b) => b.classList.toggle('on', b.dataset.mode === d.mode)); },
    'custom-save': () => {
      const name = $('c-name').value.trim(); if (!name) return toast('Poné un nombre.');
      const c = { id: d.id || uid(), name, zone: $('c-zone').value, sets: Math.max(1, +$('c-sets').value || 1), mode: $('customsheet').dataset.mode, value: Math.max(1, +$('c-value').value || 1), note: $('c-note').value.trim() };
      const i = S.custom.findIndex((x) => x.id === c.id); i >= 0 ? (S.custom[i] = c) : S.custom.push(c);
      persist(); $('customsheet').close(); render();
    },
    'custom-del': () => { if (confirm('¿Eliminar este ejercicio?')) { S.custom = S.custom.filter((x) => x.id !== d.id); persist(); $('customsheet').close(); render(); } },
    'del-session': () => { if (confirm('¿Eliminar esta sesión?')) { S.sessions = S.sessions.filter((s) => s.id !== d.id); persist(); render(); } },
    'set-sex': () => { S.profile.sex = d.v; persist(); $('onb').open ? renderOnb() : render(); },
    'set-exp': () => { S.profile.exp = d.v; persist(); $('onb').open ? renderOnb() : render(); },
    'rem-day': () => { const t = S.rem.train; S.rem.train = t.includes(d.v) ? t.filter((x) => x !== d.v) : Object.keys(DAY_NAMES).filter((k) => t.includes(k) || k === d.v); persist(); render(); },
    'ics': () => shareFile('tendon-fuerte.ics', icsText(S.rem, S.painMode, today()), 'text/calendar'),
    'export': exportData,
    'import': () => $('import-file').click(),
    'reset': () => { if (confirm('¿Borrar todos los datos? No se puede deshacer.') && confirm('¿Seguro? Se pierde todo el historial.')) { S = DEFAULT(); persist(); onbStep = 0; renderOnb(); $('onb').showModal(); } },
    'onb-next': onbNext,
    'edit-routine': () => { editRoutine = !editRoutine; render(); },
    'routine-move': () => { const ids = [...tplIds(d.tpl)], i = +d.i, j = i + Number(d.d); [ids[i], ids[j]] = [ids[j], ids[i]]; routineSet(d.tpl, ids); },
    'routine-del': () => { const ids = tplIds(d.tpl); if (ids.length <= 1) return toast('Dejá al menos un ejercicio.'); routineSet(d.tpl, ids.filter((_, i) => i !== +d.i)); },
    'routine-pick': () => openPicker(d.tpl, d.i),
    'routine-reset': () => { if (confirm('¿Volver a la rutina original A/B? Tus ejercicios propios no se borran.')) { S.templates = JSON.parse(JSON.stringify(TEMPLATES)); syncBudget(); persist(); render(); } },
    'pick-ex': () => pickExercise(d.ex),
    'exform': () => openExForm(d.id),
    'xf-kind': () => { readExForm(); XF.kind = d.v; renderExForm(); },
    'xf-tag': () => { readExForm(); XF.tag = XF.tag.includes(d.v) ? XF.tag.filter((z) => z !== d.v) : [...XF.tag, d.v]; renderExForm(); },
    'exform-save': saveExForm,
    'exform-del': deleteExForm,
    'mach-edit': () => openMachine(d.id),
    'mach-save': () => saveMachine(d.id),
    'mach-del': () => {
      if (!confirm('¿Eliminar la máquina? Los ejercicios que la usan quedan como "falta equipo".')) return;
      S.equip.machines = S.equip.machines.filter((m) => m.id !== d.id); persist(); $('machsheet').close(); $('onb').open ? renderOnb() : render();
    },
    'onb-back': () => { onbStep--; renderOnb(); },
  };
  actions[a]?.();
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.set) { setPath(el.dataset.set, el.value); if (!$('onb').open && el.dataset.set.startsWith('equip')) render(); return; }
  if (el.dataset.w) { const [i, j, k] = el.dataset.w.split('.'); W.items[+i].rows[+j][k] = el.value; return; }
  const a = el.dataset.action;
  if (a === 'pain-mode') { S.painMode = el.checked; persist(); render(); toast(el.checked ? 'Modo dolor activado.' : 'Modo dolor apagado: el entreno usa los pesos completos.'); }
  if (a === 'zone-toggle') {
    if (el.checked) S.zones[el.dataset.zone] = newZone(el.dataset.zone);
    else if ($('onb').open || confirm(`¿Quitar ${zoneName(el.dataset.zone).toLowerCase()}? Se pierde la fase y la carga actual.`)) delete S.zones[el.dataset.zone];
    else el.checked = true;
    persist(); $('onb').open ? renderOnb() : render();
  }
  if (a === 'eq-db') { S.equip.db = el.checked ? { min: 2, max: 24, step: 2 } : null; persist(); $('onb').open ? renderOnb() : render(); }
  if (a === 'eq-rings') { S.equip.rings = el.checked; persist(); if (!$('onb').open) render(); }
  if (a === 'eq-flag') {
    S.equip[el.dataset.k] = el.checked; persist(); if (!$('onb').open) render();
    if (el.checked && el.dataset.k === 'bench' && S.templates.A.includes('press_suelo')) toast('Con banco podés cambiar el press en el suelo por press en banco: Entreno → Editar rutina.');
    if (el.checked && el.dataset.k === 'bar') toast('Las dominadas quedan disponibles en Entreno → Editar rutina (cuidado con el codo).');
  }
  if (a === 'hist-zone') { histZone = el.value; renderHistory(); }
  if (a === 'hist-ex') { histEx = el.value; renderHistory(); }
  if (el.id === 'import-file' && el.files[0]) { importData(el.files[0]); el.value = ''; }
});
document.addEventListener('input', (e) => { if (e.target.dataset.w) { const [i, j, k] = e.target.dataset.w.split('.'); W.items[+i].rows[+j][k] = e.target.value; } });
// Escape cierra los diálogos; en entreno y rehab se pregunta antes.
document.addEventListener('cancel', (e) => { if (['wsheet', 'rsheet', 'painsheet', 'onb'].includes(e.target.id)) e.preventDefault(); }, true);

// ——— Arranque ———
(async () => {
  try { const d = await db.get('data'); if (d) S = withDefaults(d); } catch (e) { toast('No se pudo abrir la base de datos: ' + e.message); }
  render();
  if (!S.onboarded) { renderOnb(); $('onb').showModal(); }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js');
})();
