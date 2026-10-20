// Pruebas de las reglas (logic.js) sin navegador. Uso: node tests/unit.mjs
import fs from 'fs';
import vm from 'vm';
const ctx = vm.createContext({});
for (const f of ['data.js', 'logic.js', 'figures.js']) vm.runInContext(fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'), ctx);
const L = (expr) => vm.runInContext(expr, ctx);
let failures = 0;
const ok = (c, msg) => { console.log(`${c ? '✓' : '✗'} ${msg}`); if (!c) failures++; };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg} (${JSON.stringify(a)})`);

// Equipo
const equip = { db: { min: 2, max: 24, step: 2 }, kb: [20, 12], rings: true };
ctx.equip = equip;
eq(L('weightSteps(equip, "db")').length, 12, 'mancuernas de 2 a 24 de a 2 = 12 pesos');
eq(L('weightSteps(equip, "kb")'), [12, 20], 'pesas rusas ordenadas');
eq(L('roundDown([2,4,6], 5.9)'), 4, 'redondea hacia abajo');
eq(L('roundDown([2,4,6], 1)'), 2, 'por debajo del mínimo usa el más liviano');
eq(L('stepUp([2,4,6], 6)'), 6, 'no sube más allá del máximo');
eq(L('implFor(EXERCISES.goblet, { db: equip.db, kb: [] })'), 'db', 'goblet sin pesa rusa usa mancuerna');
eq(L('implFor(EXERCISES.remo_aros, { db: null, kb: [] })'), null, 'sin aros no hay remo en aros');

// Estimación de peso
ctx.man = { sex: 'h', weight: 80, age: 30, exp: 'novato' };
ctx.woman = { sex: 'm', weight: 60, age: 30, exp: 'novato' };
const sw = (p, ex, impl) => L(`startWeight(${p}, EXERCISES.${ex}, weightSteps(equip, '${impl}'))`);
eq(sw('man', 'press_suelo', 'db'), 8, 'hombre 80 kg novato: press en el suelo arranca con 8 kg por mano');
eq(sw('man', 'goblet', 'kb'), 12, 'goblet arranca con la pesa rusa de 12');
eq(sw('man', 'lateral', 'db'), 2, 'elevaciones laterales arrancan con 2 kg');
ok(sw('woman', 'press_suelo', 'db') < sw('man', 'press_suelo', 'db'), 'mujer de 60 kg arranca más liviano');
ok(L('estimate1RM({ ...man, exp: "medio" }, EXERCISES.rdl)') > L('estimate1RM(man, EXERCISES.rdl)'), 'más experiencia → más peso estimado');
ok(L('estimate1RM({ ...man, age: 55 }, EXERCISES.rdl)') < L('estimate1RM(man, EXERCISES.rdl)'), 'más edad → menos peso estimado');

// Calibración: 8 kg × 10 reps con 4 en reserva → 1RM ≈ 11,7 → trabajo (10 reps, RIR 2) ≈ 8,4 → 8 kg
eq(L('calibrate(8, 10, 4, weightSteps(equip, "db"))'), { e1rm: 11.7, w: 8 }, 'calibración con Epley');
eq(L('calibrate(8, 28, 2, weightSteps(equip, "db"))').w, 10, 'si hizo muchas reps, sube el peso de trabajo');
eq(L('calibrate(8, 6, 0, weightSteps(equip, "db"))').w, 6, 'si apenas llegó a 6, baja el peso de trabajo');

// Doble progresión
const steps = '[2,4,6,8,10,12]';
eq(L(`progress(8, [{reps:12},{reps:12},{reps:12}], ${steps})`), 10, '12 en todas las series → sube un salto');
eq(L(`progress(8, [{reps:12},{reps:10},{reps:9}], ${steps})`), 8, 'dentro del rango → mismo peso');
eq(L(`progress(8, [{reps:9},{reps:7}], ${steps})`), 6, 'alguna por debajo de 8 → baja un salto');
eq(L(`painCap(10, ${steps})`), 6, 'modo dolor: 60 % redondeado hacia abajo');

// Modo dolor
const T = '2026-10-20';
ctx.st = { painMode: true, zones: { codo_lat: { phase: 1, since: '2026-10-01' } }, sessions: [], checks: [] };
eq(L(`restriction(st, EXERCISES.curl_martillo, '${T}')`), { zones: ['codo_lat'], mode: 'cap', flare: false }, 'curl martillo con codo en fase 1 → al 60 %');
eq(L(`restriction(st, EXERCISES.goblet, '${T}')`), null, 'la sentadilla no exige el codo → sin restricción');
L(`st.sessions.push({ date: '2026-10-19', pain: { codo_lat: 6 } })`);
eq(L(`restriction(st, EXERCISES.curl_martillo, '${T}')`).mode, 'alt', 'dolor > 4 ayer → variante amable');
eq(L(`restriction({ ...st, painMode: false }, EXERCISES.curl_martillo, '${T}')`), null, 'con el modo dolor apagado no hay restricciones');
eq(L(`pendingChecks(st, '${T}')`), ['codo_lat'], 'pregunta cómo amaneció si ayer hubo dolor registrado');
L(`st.checks.push({ date: '${T}', zone: 'codo_lat', val: 'igual' })`);
eq(L(`pendingChecks(st, '${T}')`), [], 'no vuelve a preguntar el mismo día');

// Carga de los isométricos
const z = '{ load: 4, secs: 45 }';
eq(L(`isoAdjust(${z}, EXERCISES.iso_ext_muneca, ${steps}, 2, false)`).load, 6, 'dolor ≤ 2 y no peor → sube un salto');
eq(L(`isoAdjust(${z}, EXERCISES.iso_ext_muneca, ${steps}, 5, false)`).load, 2, 'dolor > 4 → baja un salto');
eq(L(`isoAdjust(${z}, EXERCISES.iso_ext_muneca, ${steps}, 3, true)`).load, 2, 'amaneció peor → baja un salto');
eq(L(`isoAdjust(${z}, EXERCISES.iso_ext_muneca, ${steps}, 3, false)`).load, 4, 'dolor 3 → se mantiene');
eq(L(`isoAdjust({ load: 2, secs: 45 }, EXERCISES.iso_ext_muneca, ${steps}, 6, false)`).secs, 35, 'en el mínimo de peso, baja el tiempo');
eq(L(`isoAdjust({ load: 0, secs: 45 }, EXERCISES.iso_pared, [], 1, false)`).secs, 50, 'sin peso: sube 5 s');
eq(L(`isoAdjust({ load: 0, secs: 60 }, EXERCISES.iso_talones, ${steps}, 1, false)`), { load: 2, secs: 45 }, 'puntas de pie: después de 60 s agrega mancuernas');
eq(L(`isoAdjust({ load: 2, secs: 45 }, EXERCISES.iso_talones, ${steps}, 6, false)`).load, 0, 'puntas de pie: con dolor vuelve a sin peso');

// Avance de fase
ctx.ph = { painMode: true, zones: { codo_lat: { phase: 1, since: '2026-10-01' } }, checks: [],
  sessions: ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19'].map((d) => ({ date: d, pain: { codo_lat: 2 } })) };
ok(L(`phaseReady(ph, 'codo_lat', '${T}')`), 'lista para avanzar: 19 días en fase, 6 registros ≤ 3');
L(`ph.sessions[0].pain.codo_lat = 4`);
ok(!L(`phaseReady(ph, 'codo_lat', '${T}')`), 'un registro de 4 en la semana la frena');
L(`ph.sessions[0].pain.codo_lat = 2; ph.zones.codo_lat.since = '2026-10-15'`);
ok(!L(`phaseReady(ph, 'codo_lat', '${T}')`), 'menos de 10 días en la fase la frena');

// Volumen: +30 % máx por semana
eq(L(`weekBudget({}, 2, 6, '${T}')`).budget, 36, '2 días × 6 ejercicios × 3 series = 36');
eq(L(`weekBudget({ budget: 36, week: '2026-10-19' }, 3, 6, '${T}')`).budget, 36, 'cambiar a 3 días a mitad de semana no sube el volumen');
eq(L(`weekBudget({ budget: 36, week: '2026-10-12' }, 3, 6, '${T}')`).budget, 46, 'semana nueva: 36 × 1,3 = 46');
eq(L(`weekBudget({ budget: 46, week: '2026-10-12' }, 3, 6, '${T}')`).budget, 54, 'y después llega al objetivo de 54');
eq(L('setsPerExercise(36, 2, 6)'), [3, 3, 3, 3, 3, 3], '36 series en 2 días = 3 por ejercicio');
eq(L('setsPerExercise(36, 3, 6)'), [2, 2, 2, 2, 2, 2], 'mismas 36 en 3 días = 2 por ejercicio');
eq(L('setsPerExercise(46, 3, 6)').reduce((a, b) => a + b) * 3, 45, '46 en 3 días ≈ 45 (compuestos primero)');

// Calendario
const ics = L(`icsText({ am: '08:00', pm: '20:00', train: ['lu', 'ju'], trainAt: '19:00' }, true, '${T}')`);
ok(ics.includes('RRULE:FREQ=DAILY') && ics.includes('DTSTART:20261020T080000'), 'ics con isométricos diarios a las 8');
ok(ics.includes('BYDAY=MO,TH') && ics.includes('\r\n'), 'ics con entreno lunes y jueves (CRLF)');
ok(!L(`icsText({ am: '08:00', pm: '20:00', train: [], trainAt: '19:00' }, false, '${T}')`).includes('VEVENT'), 'sin modo dolor ni días, no hay eventos');

// Bocetos
const ids = L('Object.keys(EXERCISES)');
ok(ids.every((id) => L(`figureSVG(EXERCISES.${id}).startsWith('<svg')`)), `los ${ids.length} ejercicios tienen ilustración`);
ok(L('figureSVG(EXERCISES.goblet).includes("<animate")') && !L('figureSVG(EXERCISES.goblet, { animate: false }).includes("<animate")'), 'ilustraciones animadas y estáticas');
ok(Object.values(L('REHAB')).every((p) => L(`EXERCISES['${p[1]}'] && EXERCISES['${p[2]}']`)), 'cada zona tiene ejercicios de fase 1 y 2');
ok(Object.values(L('TEMPLATES')).flat().every((id) => L(`!!EXERCISES['${id}']`)), 'las plantillas usan ejercicios existentes');

console.log(failures ? `\n${failures} fallaron` : '\nTodo OK');
process.exit(failures ? 1 : 0);
