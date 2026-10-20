// Pruebas de punta a punta de Tendón Fuerte (Playwright + Chromium).
// Uso: python -m http.server 8124 & ; node tests/e2e.mjs   (SHOTS=carpeta guarda capturas)
import { chromium } from 'playwright';
import fs from 'fs';
const URL = process.env.URL || 'http://localhost:8124/';
const SHOTS = process.env.SHOTS;
let failures = 0;
const ok = (c, msg) => { console.log(`${c ? '✓' : '✗'} ${msg}`); if (!c) failures++; };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true, colorScheme: 'dark' });
await ctx.addInitScript(() => { delete Navigator.prototype.canShare; delete Navigator.prototype.share; });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png` });
const toastText = () => page.locator('#toast span').textContent();
const state = () => page.evaluate(() => JSON.parse(JSON.stringify(S)));
const click = async (sel) => { await page.click(sel); await page.waitForTimeout(80); };

// 1. Primer uso
await page.goto(URL);
await page.evaluate(() => new Promise((r) => { const q = indexedDB.deleteDatabase('tendon-fuerte'); q.onsuccess = q.onerror = q.onblocked = r; }));
await page.reload();
await page.waitForSelector('#onb[open]');
ok(true, 'la primera vez abre la bienvenida');
await shot('01-bienvenida');
await click('[data-action="onb-next"]');
await click('[data-action="onb-next"]');
ok((await toastText()).includes('peso'), 'pide el peso para estimar cargas');
await page.fill('#onb [data-set="profile.name"]', 'Fede'); await page.dispatchEvent('#onb [data-set="profile.name"]', 'change');
await page.fill('#o-weight', '80'); await page.dispatchEvent('#o-weight', 'change');
await page.fill('#onb [data-set="profile.age"]', '30'); await page.dispatchEvent('#onb [data-set="profile.age"]', 'change');
await page.fill('#onb [data-set="profile.height"]', '178'); await page.dispatchEvent('#onb [data-set="profile.height"]', 'change');
await shot('02-perfil');
await click('[data-action="onb-next"]');
await page.fill('#onb [data-set="equip.kb"]', '12, 20'); await page.dispatchEvent('#onb [data-set="equip.kb"]', 'change');
await page.check('#onb [data-action="eq-rings"]');
await shot('03-equipo');
await click('[data-action="onb-next"]');
await page.check('#onb [data-zone="codo_lat"][data-action="zone-toggle"]');
await page.check('#onb [data-zone="muneca"][data-action="zone-toggle"]');
await click('#onb [data-action="zone-pain"][data-zone="codo_lat"][data-n="5"]');
await shot('04-dolor');
await click('[data-action="onb-next"]');
let s = await state();
ok(s.onboarded && s.profile.weight === '80' && s.equip.kb.join() === '12,20' && s.equip.rings, 'guarda perfil y equipo');
ok(Object.keys(s.zones).join() === 'codo_lat,muneca' && s.zones.codo_lat.pain0 === 5, 'guarda las zonas con dolor');
ok(s.painMode === false, 'el modo dolor queda apagado');
ok(await page.locator('[data-action="pain-mode-on"]').count() === 1, 'sugiere activar el modo dolor, sin activarlo solo');
await shot('05-inicio');

// 2. Entreno con el modo dolor apagado: pesos completos
await click('[data-tab="train"]');
ok(await page.locator('#view-train >> text=al 60 %').count() === 0, 'sin modo dolor no hay tope del 60 %');
ok(await page.locator('#view-train >> text=Remo invertido en aros').count() === 1, 'con aros incluye el remo invertido');
await shot('06-entreno');

// 3. Modo dolor
await click('[data-tab="home"]');
await click('[data-action="pain-mode-on"]');
ok((await state()).painMode, 'activa el modo dolor');
ok(await page.locator('[data-action="start-rehab"]').count() === 1, 'aparece la rehabilitación del día');
await shot('07-inicio-dolor');
await click('[data-tab="train"]');
ok(await page.locator('#view-train >> text=al 60 %').count() >= 3, 'remo, peso muerto y curl van al 60 %');
await click('[data-tab="tendons"]');
ok(await page.locator('#view-tendons >> text=Extensión de muñeca isométrica').count() === 1, 'codo lateral → extensión de muñeca isométrica');
await shot('08-tendones');

// 4. Entreno A con calibración
await click('[data-tab="home"]');
await click('#view-home [data-action="start-workout"]');
await page.waitForSelector('#wsheet[open]');
const first = page.locator('#wsheet .card').first();
ok((await first.textContent()).includes('Serie de calibración'), 'el primer entreno pide calibrar');
ok((await first.locator('input[data-w="0.0.w"]').inputValue()) === '12', 'goblet arranca con la pesa rusa de 12');
await first.locator('input[data-w="0.0.reps"]').fill('20');
await first.locator('select[data-w="0.0.rir"]').selectOption('2');
await click('#wsheet [data-action="set-done"][data-i="0"][data-j="0"]');
ok((await toastText()).includes('Calibrado'), 'calcula el peso de trabajo');
ok(!(await page.locator('#rest').isHidden()), 'arranca el descanso');
await shot('09-entreno-sesion');
await click('#rest [data-action="skip-rest"]');
const row = page.locator('#wsheet .card').nth(2);
ok((await row.textContent()).includes('Modo dolor'), 'el remo avisa el modo dolor');
await row.locator('input[data-w="2.0.reps"]').fill('12');
await row.locator('select[data-w="2.0.rir"]').selectOption('3');
await click('#wsheet [data-action="set-done"][data-i="2"][data-j="0"]');
await click('#wsheet .dlg-head [data-action="finish-workout"]');
await page.waitForSelector('#painsheet[open]');
ok(true, 'al terminar pregunta el dolor de las zonas cuidadas');
await shot('10-dolor-entreno');
await click('#painsheet [data-zone="codo_lat"][data-n="3"]');
await click('#painsheet [data-zone="muneca"][data-n="2"]');
await click('[data-action="save-pain"]');
s = await state();
ok(s.sessions[0].type === 'entreno' && s.sessions[0].pain.codo_lat === 3, 'guarda el entreno con el dolor');
ok(s.lifts.goblet && s.lifts.goblet.w === 12, 'el goblet queda calibrado');
ok(s.plan.next === 'B', 'el próximo entreno es el B');

// 5. Rehabilitación
await click('[data-action="start-rehab"]');
await page.waitForSelector('#rsheet[open]');
await shot('11-rehab');
for (let i = 0; i < 20 && await page.locator('#rsheet [data-action="rehab-go"], #rsheet [data-action="rehab-skip"]').count(); i++) {
  await click('#rsheet [data-action="rehab-go"], #rsheet [data-action="rehab-skip"]');
}
await click('[data-action="finish-rehab"]');
await click('#painsheet [data-zone="codo_lat"][data-n="6"]');
await click('#painsheet [data-zone="muneca"][data-n="2"]');
await click('[data-action="save-pain"]');
s = await state();
ok(s.sessions[0].type === 'rehab' && s.sessions[0].items.length === 2 && s.sessions[0].items.every((i) => i.sets.length === 3), 'guarda 2 isométricos de 3 series');
ok(s.zones.codo_lat.load === 2 && s.zones.codo_lat.secs === 35, 'dolor 6 → baja la carga (en el mínimo, baja el tiempo)');
ok((await toastText()).includes('bajamos'), 'avisa que bajó la carga');

// 6. Al día siguiente: ¿cómo amaneció?
await page.evaluate(() => { const y = addDays(today(), -1); S.sessions.forEach((s) => (s.date = y)); Object.values(S.zones).forEach((z) => z.adjustedOn && (z.adjustedOn = y)); render(); });
ok(await page.locator('[data-action="check"][data-zone="muneca"]').count() === 3, 'pregunta cómo amaneció cada zona');
await shot('12-amanecio');
await click('[data-action="check"][data-zone="muneca"][data-val="mejor"]');
s = await state();
ok(s.zones.muneca.load === 4, 'muñeca con dolor 2 y amaneció mejor → sube a 4 kg');
await click('[data-action="check"][data-zone="codo_lat"][data-val="igual"]');
ok((await state()).zones.codo_lat.secs === 35, 'codo ya ajustado ayer → no vuelve a bajar');
ok(await page.locator('[data-action="check"]').count() === 0, 'no vuelve a preguntar');

// 7. Ejercicio propio del fisio
await click('[data-tab="tendons"]');
await click('[data-action="custom-edit"]');
await page.fill('#c-name', 'Tyler twist con toalla'); await page.selectOption('#c-zone', 'codo_lat');
await click('[data-action="custom-save"]');
ok((await state()).custom[0].name === 'Tyler twist con toalla', 'agrega un ejercicio del fisio');

// 8. Historial (con un registro de hace 3 días para que haya línea)
await page.evaluate(() => { S.sessions.push({ id: 'old', date: addDays(today(), -3), type: 'rehab', slot: 'noche', items: [], pain: { codo_lat: 5 } }); persist(); });
await click('[data-tab="history"]');
ok(await page.locator('#view-history .chart svg').count() >= 1, 'muestra el gráfico de dolor');
await page.locator('#view-history .hit').first().click();
ok(!(await page.locator('#tip').isHidden()), 'tocar un punto muestra el valor');
await shot('13-historial');

// 8b. Equipo propio y rutina editable
await click('[data-tab="settings"]');
await page.check('#view-settings [data-action="eq-flag"][data-k="bench"]');
ok((await state()).equip.bench === true, 'marca que tiene banco');
await click('#view-settings [data-action="mach-edit"]');
await page.fill('#m-name', 'Polea'); await page.fill('#m-min', '5'); await page.fill('#m-max', '50'); await page.fill('#m-step', '2.5');
await click('[data-action="mach-save"]');
s = await state();
ok(s.equip.machines.length === 1 && s.equip.machines[0].step === 2.5, 'agrega una máquina con su rango de peso');
await click('[data-tab="train"]');
await click('[data-action="edit-routine"]');
await click('#view-train [data-action="routine-pick"][data-tpl="A"][data-i="1"]');
await page.waitForSelector('#pickersheet[open]');
ok(!(await page.locator('#pickersheet [data-ex="press_banco"]').isDisabled()), 'con banco, el press en banco se puede elegir');
ok(!(await page.locator('#pickersheet [data-ex="dominadas"]').isDisabled()), 'con aros, las dominadas se pueden hacer en aros');
await shot('15-selector');
await click('#pickersheet [data-ex="press_banco"]');
ok((await state()).templates.A[1] === 'press_banco', 'cambia el press en el suelo por press en banco');
await click('#view-train [data-action="routine-pick"][data-tpl="B"]:not([data-i])');
await click('#pickersheet [data-action="exform"]');
await page.fill('#x-name', 'Jalón en polea'); await page.selectOption('#x-impl', 'm:' + s.equip.machines[0].id);
await click('#exformsheet [data-action="xf-tag"][data-v="codo_lat"]');
await click('[data-action="exform-save"]');
s = await state();
ok(s.exlib.length === 1 && s.exlib[0].impl.startsWith('m:') && s.templates.B.at(-1) === s.exlib[0].id, 'crea un ejercicio propio con la máquina y lo suma al día B');
await click('#view-train [data-action="routine-move"][data-tpl="B"][data-i="6"][data-d="-1"]');
ok((await state()).templates.B[5] === s.exlib[0].id, 'reordena la rutina');
await shot('16-editar-rutina');
await click('[data-action="edit-routine"]');
const jalon = page.locator('#view-train .ex', { hasText: 'Jalón en polea' });
ok((await jalon.locator('.num').textContent()).trim() === '5', 'arranca en el mínimo de la máquina (5 kg) para calibrar');

// 8c. Preferencias de sesión y novedades
await click('[data-tab="settings"]');
await click('#view-settings [data-action="pref"][data-k="rest"][data-v="120"]');
ok((await state()).prefs.rest === 120, 'cambia el descanso entre series a 2 min');
await click('#view-settings [data-action="news"]');
await page.waitForSelector('#newssheet[open] h2');
ok((await page.locator('#newssheet').textContent()).includes('1.3.0'), 'Novedades muestra el changelog');
await shot('17-novedades');
await click('#newssheet [data-action="close"]');

// 9. Calendario y copia
await click('[data-tab="settings"]');
await shot('14-ajustes');
let dl = page.waitForEvent('download'); await click('[data-action="ics"]');
const ics = fs.readFileSync(await (await dl).path(), 'utf8');
ok(ics.includes('BEGIN:VCALENDAR') && ics.includes('FREQ=DAILY') && ics.includes('BYDAY=MO,TH'), 'el .ics trae isométricos diarios y entreno lunes y jueves');
dl = page.waitForEvent('download'); await click('[data-action="export"]');
const backupPath = await (await dl).path();
const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
ok(backup.app === 'tendon-fuerte' && backup.data.sessions.length === 3, 'la copia trae las sesiones');
await page.evaluate(() => { S.sessions = []; persist(); });
await page.setInputFiles('#import-file', { name: 'copia.json', mimeType: 'application/json', buffer: fs.readFileSync(backupPath) });
await page.waitForTimeout(300);
ok((await state()).sessions.length === 3, 'restaurar la copia recupera las sesiones');

// 10. Datos persistentes y sin conexión
await page.reload(); await page.waitForTimeout(300);
ok((await state()).sessions.length === 3 && !(await page.locator('#onb').getAttribute('open')), 'los datos sobreviven a recargar');
await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 5000 }).catch(() => {});
await ctx.setOffline(true);
await page.reload(); await page.waitForTimeout(300);
ok(await page.locator('#view-home h1').count() === 1, 'abre sin conexión');
await ctx.setOffline(false);

ok(errors.length === 0, `sin errores de JavaScript${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
console.log(failures ? `\n${failures} fallaron` : '\nTodo OK');
process.exit(failures ? 1 : 0);
