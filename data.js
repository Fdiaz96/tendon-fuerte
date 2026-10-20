// Datos fijos de Tendón Fuerte: zonas de tendón, ejercicios (con sus bocetos) y plantillas de entreno.
// Bocetos: articulaciones en un lienzo de 200×170 (y de -10 a 160, piso en y=150), vista de costado mirando a la derecha.
// N cuello, P cadera, E codo, W mano, K rodilla, F tobillo, T punta del pie. 1 = lado cercano, 2 = lado lejano.

const ZONES = [
  { id: 'codo_lat', name: 'Codo lateral', hint: 'Codo de tenista: duele afuera del codo al agarrar o extender la muñeca.' },
  { id: 'codo_med', name: 'Codo medial', hint: 'Codo de golfista: duele adentro del codo al agarrar o flexionar la muñeca.' },
  { id: 'muneca', name: 'Muñeca', hint: 'Dorso de la muñeca al agarrar, girar o apoyar peso.' },
  { id: 'hombro', name: 'Hombro', hint: 'Duele al empujar o levantar el brazo (press, elevaciones).' },
  { id: 'rodilla', name: 'Rodilla', hint: 'Tendón rotuliano: debajo de la rótula al saltar, subir escaleras o hacer sentadilla.' },
  { id: 'aquiles', name: 'Aquiles', hint: 'Detrás del tobillo al correr, saltar o pararte en puntas.' },
];
const ZONE = Object.fromEntries(ZONES.map((z) => [z.id, z]));

// Rehabilitación por zona y fase (1 isométricos, 2 isotónicos lentos, 3 integración + mantenimiento).
const REHAB = {
  codo_lat: { 1: 'iso_ext_muneca', 2: 'ext_muneca_lenta' },
  codo_med: { 1: 'iso_flex_muneca', 2: 'flex_muneca_lenta' },
  muneca: { 1: 'iso_prono', 2: 'prono_lenta' },
  hombro: { 1: 'iso_pared', 2: 'lateral_lenta' },
  rodilla: { 1: 'sentadilla_pared', 2: 'goblet_lenta' },
  aquiles: { 1: 'iso_talones', 2: 'talones_lenta' },
};
const PHASES = {
  1: { name: 'Fase 1 · Isométricos', short: 'Isométricos', what: '3 sostenidas de 45 s, mañana y noche. Calman el dolor y le dan señal de reparación a todo el tendón.' },
  2: { name: 'Fase 2 · Isotónicos lentos', short: 'Lentos', what: '3×15 subiendo en 3 s y bajando en 3 s, día por medio. Recuperan fuerza con movimiento.' },
  3: { name: 'Fase 3 · Integración', short: 'Integración', what: 'Vuelven los ejercicios normales con todo el peso. 5–10 min de isométricos después de entrenar para mantener.' },
};

// Posturas base reutilizadas.
const STAND = { N: [100, 45], P: [100, 88], E1: [105, 68], W1: [109, 91], K1: [102, 119], F1: [100, 150] };
const SEATED = { N: [106, 68], P: [92, 108], E1: [110, 100], W1: [134, 100], K1: [128, 110], F1: [130, 150], E2: [106, 99], W2: [114, 108], K2: [124, 111], F2: [126, 150] };
const CHAIR_SEAT = { t: 'chair', x: 74, y: 112, w: 40, back: 'left' };

// kind: peso (kg × reps), iso (sostener s), lento (reps a tempo 3/3), tiempo (s, sin peso), reps (sin peso).
// tag: tendones que exige. ratio: 1RM de un novato hombre por implemento / peso corporal. alt: variante amable.
const EXERCISES = {
  // ——— Rehabilitación ———
  iso_ext_muneca: {
    name: 'Extensión de muñeca isométrica', kind: 'iso', impl: 'db', load0: 2, zone: 'codo_lat',
    cues: ['Sentado, antebrazo apoyado en el muslo, palma hacia abajo y la mano fuera de la rodilla.', 'Sostené la mancuerna con la muñeca recta o apenas levantada, sin moverla.', 'Dolor tolerable: hasta 3–4 sobre 10.'],
    fig: { a: SEATED, props: [{ t: 'db', at: 'W1' }], scene: [CHAIR_SEAT] },
  },
  ext_muneca_lenta: {
    name: 'Extensión de muñeca lenta', kind: 'lento', impl: 'db', load0: 2, zone: 'codo_lat',
    cues: ['Misma posición, palma hacia abajo.', 'Subí la mano en 3 s y bajala en 3 s.', 'Si duele más de 4, bajá el peso.'],
    fig: { a: { ...SEATED, W1: [132, 112] }, b: { ...SEATED, W1: [133, 90] }, props: [{ t: 'db', at: 'W1' }], scene: [CHAIR_SEAT], dur: 6 },
  },
  iso_flex_muneca: {
    name: 'Flexión de muñeca isométrica', kind: 'iso', impl: 'db', load0: 2, zone: 'codo_med',
    cues: ['Sentado, antebrazo en el muslo, palma hacia arriba.', 'Sostené la mancuerna con la muñeca recta, sin moverla.', 'Dolor tolerable: hasta 3–4 sobre 10.'],
    fig: { a: SEATED, props: [{ t: 'db', at: 'W1' }], scene: [CHAIR_SEAT] },
  },
  flex_muneca_lenta: {
    name: 'Flexión de muñeca lenta', kind: 'lento', impl: 'db', load0: 2, zone: 'codo_med',
    cues: ['Palma hacia arriba, antebrazo apoyado.', 'Subí la mano en 3 s y bajala en 3 s.'],
    fig: { a: { ...SEATED, W1: [132, 112] }, b: { ...SEATED, W1: [133, 90] }, props: [{ t: 'db', at: 'W1' }], scene: [CHAIR_SEAT], dur: 6 },
  },
  iso_prono: {
    name: 'Sostén neutro de muñeca', kind: 'iso', impl: 'db', load0: 2, zone: 'muneca',
    cues: ['Sentado, antebrazo en el muslo, la mancuerna vertical como un martillo.', 'Agarrala de un extremo (más difícil) o del centro (más fácil).', 'Muñeca recta, sin moverla.'],
    fig: { a: SEATED, props: [{ t: 'db', at: 'W1', rot: [90] }], scene: [CHAIR_SEAT] },
  },
  prono_lenta: {
    name: 'Pronación y supinación lenta', kind: 'lento', impl: 'db', load0: 2, zone: 'muneca',
    cues: ['Mancuerna vertical agarrada de un extremo.', 'Girá la palma hacia abajo en 3 s y hacia arriba en 3 s.', 'El antebrazo no se mueve.'],
    fig: { a: SEATED, props: [{ t: 'db', at: 'W1', rot: [0, 180] }], scene: [CHAIR_SEAT], dur: 6 },
  },
  iso_pared: {
    name: 'Empuje isométrico contra la pared', kind: 'iso', impl: 'bw', zone: 'hombro',
    cues: ['De pie frente a la pared, manos a la altura del pecho como en un press.', 'Empujá fuerte sin mover nada (al 50–70 % de tu fuerza).', 'Si duele más de 4, empujá más suave.'],
    fig: { a: { N: [100, 45], P: [96, 88], E1: [124, 50], W1: [148, 52], E2: [121, 52], W2: [146, 55], K1: [104, 119], F1: [110, 150], K2: [92, 119], F2: [86, 150] }, scene: [{ t: 'wall', x: 152 }] },
  },
  lateral_lenta: {
    name: 'Elevación lateral lenta', kind: 'lento', impl: 'db', load0: 2, zone: 'hombro',
    cues: ['De pie, brazos al costado, codos apenas flexionados.', 'Subí hasta la altura de los hombros en 3 s y bajá en 3 s.'],
    fig: { front: true, a: { N: [100, 45], P: [100, 88], E1: [93, 69], W1: [91, 92], E2: [107, 69], W2: [109, 92], K1: [94, 119], F1: [93, 150], K2: [106, 119], F2: [107, 150] }, b: { E1: [77, 50], W1: [55, 52], E2: [123, 50], W2: [145, 52] }, props: [{ t: 'db', at: 'W1' }, { t: 'db', at: 'W2' }], dur: 6 },
  },
  sentadilla_pared: {
    name: 'Sentadilla isométrica en pared', kind: 'iso', impl: 'bw', zone: 'rodilla',
    cues: ['Espalda apoyada en la pared, bajá hasta un ángulo cómodo (no hace falta llegar a 90°).', 'Rodillas en línea con los pies.', 'Si duele más de 4, subí un poco.'],
    fig: { a: { N: [70, 68], P: [70, 112], E1: [76, 90], W1: [98, 104], K1: [102, 112], F1: [102, 150] }, scene: [{ t: 'wall', x: 60, left: true }] },
  },
  goblet_lenta: {
    name: 'Sentadilla goblet lenta', kind: 'lento', impl: 'kb', alsoDb: true, load0: 8, zone: 'rodilla',
    cues: ['Pesa rusa o mancuerna contra el pecho.', 'Bajá en 3 s y subí en 3 s, hasta donde no duela más de 4.'],
    fig: 'goblet', dur: 6,
  },
  iso_talones: {
    name: 'Puntas de pie isométrico', kind: 'iso', impl: 'db', load0: 0, zone: 'aquiles',
    cues: ['De pie, subí a media punta y quedate ahí.', 'Apoyá una mano en la pared si necesitás equilibrio.', 'Para más carga, sostené mancuernas.'],
    fig: { a: { ...STAND, N: [100, 39], P: [100, 82], E1: [102, 62], W1: [104, 86], K1: [102, 113], F1: [100, 144], T1: [109, 150] }, props: [{ t: 'db', at: 'W1' }] },
  },
  talones_lenta: {
    name: 'Elevación de talones lenta', kind: 'lento', impl: 'db', load0: 0, zone: 'aquiles',
    cues: ['Subí en 3 s y bajá en 3 s.', 'Con el tiempo hacelo a una pierna o con mancuernas.'],
    fig: { a: STAND, b: { N: [100, 37], P: [100, 80], E1: [102, 60], W1: [104, 84], K1: [102, 111], F1: [100, 142], T1: [109, 150] }, props: [{ t: 'db', at: 'W1' }], dur: 6 },
  },

  // ——— Entreno ———
  goblet: {
    name: 'Sentadilla goblet', kind: 'peso', impl: 'kb', alsoDb: true, ratio: 0.35, lower: true, tag: ['rodilla'],
    cues: ['Pesa rusa contra el pecho, codos hacia abajo.', 'Bajá con la espalda recta hasta que los codos rocen las rodillas.', 'Sin rebotar abajo.'],
    fig: { a: { N: [100, 45], P: [100, 88], E1: [110, 68], W1: [114, 56], K1: [102, 119], F1: [100, 150] }, b: { N: [100, 78], P: [82, 118], E1: [110, 100], W1: [114, 88], K1: [112, 122], F1: [100, 150] }, props: [{ t: 'kb', at: 'W1' }] },
  },
  press_suelo: {
    name: 'Press en el suelo con mancuernas', kind: 'peso', impl: 'db', ratio: 0.2, tag: ['hombro', 'codo_med'],
    cues: ['Acostado, rodillas flexionadas, codos a 45° del cuerpo.', 'Apoyá suave los brazos en el piso en cada repetición, sin rebotar.'],
    fig: { a: { N: [60, 143], P: [103, 143], E1: [80, 145], W1: [80, 122], K1: [128, 118], F1: [138, 150] }, b: { E1: [66, 120], W1: [64, 96] }, props: [{ t: 'db', at: 'W1' }] },
  },
  remo_silla: {
    name: 'Remo a un brazo apoyado en silla', kind: 'peso', impl: 'db', ratio: 0.25, tag: ['codo_lat', 'muneca'], alt: 'remo_aros_iso',
    cues: ['Mano libre en el asiento de una silla, espalda recta.', 'Tirá el codo hacia la cadera, agarre neutro (palma mirando al cuerpo).', 'Usá straps si te molesta el agarre.'],
    fig: { a: { N: [130, 84], P: [88, 92], E1: [128, 108], W1: [127, 132], E2: [137, 100], W2: [140, 115], K1: [84, 121], F1: [80, 150], K2: [96, 122], F2: [100, 150] }, b: { E1: [112, 76], W1: [118, 98] }, props: [{ t: 'db', at: 'W1', rot: [90] }], scene: [{ t: 'chair', x: 130, y: 115, w: 40, back: 'right' }] },
  },
  rdl: {
    name: 'Peso muerto rumano con mancuernas', kind: 'peso', impl: 'db', ratio: 0.25, lower: true, tag: ['codo_lat', 'muneca'], alt: 'puente',
    cues: ['Mancuernas pegadas a las piernas, rodillas apenas flexionadas.', 'Llevá la cadera atrás hasta sentir los isquios, espalda recta.'],
    fig: { a: { ...STAND, W1: [103, 92] }, b: { N: [124, 68], P: [88, 90], E1: [124, 92], W1: [123, 116], K1: [96, 120], F1: [96, 150] }, props: [{ t: 'db', at: 'W1' }] },
  },
  lateral: {
    name: 'Elevaciones laterales', kind: 'peso', impl: 'db', ratio: 0.06, tag: ['hombro'],
    cues: ['Subí hasta la altura de los hombros, codos apenas flexionados.', 'Bajá controlando, sin balancearte.'],
    fig: 'lateral_lenta', dur: 3,
  },
  plancha: {
    name: 'Plancha', kind: 'tiempo', impl: 'bw', tag: ['hombro'],
    cues: ['Antebrazos en el piso, codos debajo de los hombros.', 'Cuerpo en línea recta, apretá abdomen y glúteos.'],
    fig: { a: { N: [140, 128], P: [98, 132], E1: [138, 150], W1: [162, 150], K1: [66, 138], F1: [36, 146], T1: [34, 150] } },
  },
  zancada: {
    name: 'Zancada inversa con mancuernas', kind: 'peso', impl: 'db', ratio: 0.15, lower: true, tag: ['rodilla'],
    cues: ['Paso largo hacia atrás, bajá la rodilla de atrás cerca del piso.', 'El peso sobre el talón de adelante.'],
    fig: { a: STAND, b: { N: [100, 69], P: [100, 112], E1: [102, 92], W1: [103, 116], K1: [118, 118], F1: [118, 150], K2: [96, 144], F2: [74, 146], T2: [70, 150] }, props: [{ t: 'db', at: 'W1' }] },
  },
  press_hombros: {
    name: 'Press de hombros con mancuernas', kind: 'peso', impl: 'db', ratio: 0.15, tag: ['hombro', 'codo_med'],
    cues: ['De pie o sentado en una silla sin respaldo alto.', 'Empujá hacia arriba sin arquear la espalda baja.'],
    fig: { a: { ...STAND, E1: [113, 64], W1: [114, 42] }, b: { E1: [107, 22], W1: [108, -3] }, props: [{ t: 'db', at: 'W1' }] },
  },
  remo_aros: {
    name: 'Remo invertido en aros', kind: 'reps', impl: 'rings', tag: ['codo_lat', 'codo_med', 'muneca'], alt: 'remo_aros_iso',
    cues: ['Cuerpo recto inclinado, talones en el piso.', 'Tirá el pecho hacia los aros, palmas enfrentadas.', 'Más fácil: pies más atrás. Más difícil: pies más adelante.'],
    fig: { a: { N: [132, 100], P: [94, 121], E1: [131, 77], W1: [129, 54], K1: [66, 136], F1: [40, 150] }, b: { N: [124, 85], P: [90, 113], E1: [108, 82], W1: [124, 66], K1: [64, 132], F1: [40, 150] }, props: [{ t: 'ring', at: 'W1', x: 128 }] },
  },
  swing: {
    name: 'Swing con pesa rusa', kind: 'peso', impl: 'kb', alsoDb: true, ratio: 0.3, lower: true, tag: ['codo_lat', 'muneca'], alt: 'puente',
    cues: ['La fuerza sale de la cadera, no de los brazos.', 'Subí la pesa hasta la altura del pecho y dejala caer entre las piernas.'],
    fig: { a: { N: [120, 66], P: [86, 92], E1: [118, 90], W1: [110, 112], K1: [98, 120], F1: [98, 150] }, b: { ...STAND, E1: [124, 50], W1: [148, 52] }, props: [{ t: 'kb', at: 'W1' }], dur: 1.6 },
  },
  curl_martillo: {
    name: 'Curl martillo', kind: 'peso', impl: 'db', ratio: 0.12, tag: ['codo_lat', 'muneca'], alt: 'curl_iso',
    cues: ['Palmas enfrentadas, codos pegados al cuerpo.', 'Subí sin balancear y bajá en 2–3 s.'],
    fig: { a: STAND, b: { E1: [105, 68], W1: [122, 51] }, props: [{ t: 'db', at: 'W1', rot: [90] }] },
  },
  triceps: {
    name: 'Extensión de tríceps sobre la cabeza', kind: 'peso', impl: 'db', ratio: 0.15, tag: ['codo_med', 'hombro'],
    cues: ['Una mancuerna con las dos manos sobre la cabeza.', 'Bajala detrás de la cabeza doblando solo los codos.'],
    fig: { a: { ...STAND, E1: [109, 22], W1: [108, -3] }, b: { E1: [109, 22], W1: [90, 36] }, props: [{ t: 'db', at: 'W1', rot: [90] }] },
  },
  // Variantes amables (modo dolor)
  remo_aros_iso: {
    name: 'Remo isométrico en aros', kind: 'iso', impl: 'rings', tag: ['codo_lat', 'muneca'],
    cues: ['Quedate arriba del remo con el pecho cerca de los aros.', 'Sin moverte; dolor hasta 3–4 sobre 10.'],
    fig: { a: { N: [124, 85], P: [90, 113], E1: [108, 82], W1: [124, 66], K1: [64, 132], F1: [40, 150] }, props: [{ t: 'ring', at: 'W1', x: 126 }] },
  },
  puente: {
    name: 'Puente de glúteos con mancuerna', kind: 'peso', impl: 'db', ratio: 0.4, lower: true, tag: [],
    cues: ['Acostado, mancuerna sobre la cadera, sostenida con las manos.', 'Subí la cadera apretando glúteos, sin arquear la espalda.'],
    fig: { a: { N: [60, 143], P: [103, 145], E1: [80, 146], W1: [100, 140], K1: [128, 118], F1: [138, 150] }, b: { P: [103, 124], W1: [100, 120], E1: [80, 136], K1: [130, 114] }, props: [{ t: 'db', at: 'W1' }] },
  },
  curl_iso: {
    name: 'Curl isométrico a mitad de recorrido', kind: 'iso', impl: 'db', load0: 2, tag: ['codo_lat'],
    cues: ['Codo a 90°, palma hacia el cuerpo, sostené sin moverte.', 'Peso liviano: dolor hasta 3–4 sobre 10.'],
    fig: { a: { ...STAND, W1: [124, 66] }, props: [{ t: 'db', at: 'W1', rot: [90] }] },
  },
};
for (const [id, ex] of Object.entries(EXERCISES)) {
  ex.id = id;
  if (typeof ex.fig === 'string') ex.fig = { ...EXERCISES[ex.fig].fig, dur: ex.dur ?? EXERCISES[ex.fig].fig.dur };
}

// Cuerpo completo A/B (6 ejercicios por día). Sin banco: press en el suelo y remo apoyado en silla.
const TEMPLATES = {
  A: ['goblet', 'press_suelo', 'remo_silla', 'rdl', 'lateral', 'plancha'],
  B: ['zancada', 'press_hombros', 'remo_aros', 'swing', 'curl_martillo', 'triceps'],
};

const EXPERIENCE = [
  { id: 'novato', name: 'Menos de 6 meses', mult: 1 },
  { id: 'medio', name: '6 meses a 2 años', mult: 1.5 },
  { id: 'avanzado', name: 'Más de 2 años', mult: 2 },
];

const SOURCES = [
  { title: 'Jeremy Ethier — It\'s Weird, But It Re-Builds Your Tendons In 30 Days (con Keith Baar y Coach Q)', url: 'https://www.youtube.com/watch?v=GSwL3Lgw6zI' },
  { title: 'Built With Science (Jeremy Ethier)', url: 'https://builtwithscience.com/' },
  { title: 'Fuente Oswald — SIL Open Font License 1.1', url: 'fonts/OFL.txt' },
];

// Si falta el equipo: aros → remo en silla; pesa rusa → mancuerna (alsoDb).
const NO_RINGS = { remo_aros: 'remo_silla', remo_aros_iso: 'curl_iso' };
