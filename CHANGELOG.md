# Changelog

Todos los cambios de Tendón Fuerte, del más nuevo al más viejo.

## 1.10.1 — Días de entreno en el primer uso y accesibilidad

- En el primer uso ahora elegís **qué días entrenás** (se usan para "hoy toca entrenar" y los recordatorios). Al pasar de 2 a 3 días se proponen lunes, miércoles y viernes.
- **Accesibilidad**: los avisos se anuncian en lectores de pantalla, el foco del teclado se ve claramente y la barra de pestañas tiene nombre.
- README actualizado con todas las funciones.

## 1.10.0 — Tema claro

- **Tema claro opcional** (Ajustes → *Tema*): Oscuro (sigue siendo el predeterminado), Claro o Según el sistema. El claro se lee mejor a pleno sol.
- En claro, el verde lima queda para los botones y los textos de acento pasan a verde oscuro para que se lean bien; los avisos naranjas y verdes también se adaptan.
- El tema se aplica antes de dibujar la pantalla, sin parpadeo, y también cambia el color de la barra del celular.

## 1.9.0 — Inicio más inteligente

- **Hoy toca o no**: la tarjeta de entreno dice "Hoy toca entrenar", "Hoy es día de descanso (podés entrenar igual)" o "✓ Entreno de hoy hecho", según los días que elegiste en Ajustes → Recordatorios.
- **Anotar el dolor en cualquier momento** (con el modo dolor): un botón en Inicio registra cómo está cada zona sin hacer una sesión. Cuenta para los gráficos, el informe y el criterio para avanzar de fase.
- **Detección de estancamiento**: si un ejercicio con peso repite el mismo peso 3 sesiones sin sumar repeticiones, aparece "Estancado · bajar 10 % y volver a subir" en Entreno.
- **Semana de descarga**: cuando hay 2 o más ejercicios estancados, Inicio la sugiere. Esa semana va con una serie menos y el 90 % del peso, sin progresar; la semana siguiente vuelve todo a la normalidad (se puede cancelar).

## 1.8.0 — Opciones de rehabilitación

- **Elegí el ejercicio de rehabilitación** de cada zona y fase (Tendones → tu zona → *Otras opciones para esta fase*). La primera opción sigue siendo la del protocolo del video.
- **5 ejercicios de rehabilitación nuevos con ilustración**:
  - **Codo de tenista, fase 2**: *excéntrico de muñeca* (subís con ayuda y bajás en 4 s) y *Tyler twist con toalla* (sin necesidad de Flexbar).
  - **Hombro, fase 1**: *rotación externa isométrica* contra un marco de puerta. Fase 2: *rotación externa con banda*.
  - **Rodilla, fase 1**: *extensión de rodilla isométrica sentado*.
  - **Aquiles, fase 1**: *gemelos isométrico sentado*, por si de pie molesta demasiado.
  - **Muñeca, fase 2**: también se puede usar la extensión de muñeca lenta.
- Solo aparecen las opciones que podés hacer con tu equipo. Al cambiar de ejercicio, la carga vuelve a empezar desde lo mínimo.
- La entrada en calor, el informe para el fisio y las sesiones usan el ejercicio que elegiste.

## 1.7.1 — Pulido

- **Deshacer**: al eliminar una sesión del historial aparece "Deshacer" durante 6 segundos (ya no pregunta antes).
- Durante el entreno, **tocá la ilustración** de un ejercicio para verla en grande, con las indicaciones y tu progreso.
- Prueba automática de **migración**: los datos guardados con la versión 1.0 se abren bien en la nueva (rutina, preferencias y equipo nuevos toman valores por defecto).

## 1.7.0 — Biblioteca ampliada

- **13 ejercicios nuevos con ilustración animada**, pensados para ganar músculo en casa con mancuernas, pesa rusa y peso corporal. Aparecen en Entreno → *Editar rutina* → cambiar/agregar:
  - **Piernas**: sentadilla búlgara (pie atrás en una silla), sentadilla sumo con pesa rusa, gemelos a una pierna.
  - **Cadera**: hip thrust con mancuerna (espalda en una silla), peso muerto a una pierna.
  - **Tirón**: remo inclinado con dos mancuernas, pullover (con banco).
  - **Empuje**: flexiones de brazos (con variantes más fáciles y apoyo neutro para la muñeca).
  - **Hombro**: elevación frontal.
  - **Brazos**: curl concentrado, patada de tríceps, press francés en el suelo.
  - **Core**: dead bug.
- Cada uno indica qué tendones exige, así el modo dolor los limita al 60 % o los cambia por una variante amable cuando corresponde.
- Ahora hay 44 ejercicios en total.

## 1.6.0 — Calculadora de discos e instalación

- **Mancuernas de discos** (Ajustes → Equipo → Mancuernas → *Son de discos*): cargás el peso de la barra y tus discos (peso y cantidad total). La app:
  - calcula **todos los pesos que podés armar** de verdad (de cada disco se usan múltiplos de 4: lo mismo de cada lado y en las dos mancuernas);
  - usa esos pesos para sugerir, calibrar y progresar;
  - en cada ejercicio muestra **qué discos poner de cada lado** (por ejemplo, "Por lado: 2,5 + 1,25 kg").
- Si un peso de trabajo anterior no se puede armar con tus discos, se redondea al posible más cercano por debajo.
- **Instalar la app**: en Android/Chrome aparece una tarjeta con botón *Instalar*; en iPhone, instrucciones para *Agregar a inicio* (así Safari no borra los datos).

## 1.5.0 — Entrada en calor e informe para el fisio

- **Entrada en calor** al empezar cada entreno, con casillas para tildar:
  - movilidad general de 3–5 min;
  - con el modo dolor, **un isométrico de cada zona sensible** antes de cargar (suele bajar el dolor para entrenar);
  - **series de aproximación** del primer ejercicio con peso: 8 reps al 50 % y 4 al 75 %, redondeadas a tu equipo (no cuentan para el volumen).
- **Informe para el fisio** (Historial → *Informe para el fisio*): un archivo HTML para compartir o imprimir como PDF con las últimas 6 semanas:
  - por zona: fase actual y desde cuándo, ejercicio y carga, gráfico de dolor, tabla de dolor promedio y máximo por semana, y cómo amaneció al día siguiente;
  - cantidad de sesiones de rehab y entrenos;
  - los ejercicios que te indicó el fisio.

## 1.4.0 — Progreso y motivación

- **Resumen al terminar el entreno**: minutos, series y volumen (kg × reps) en números grandes.
- **Récords**: si superás tu 1RM estimado en un ejercicio con peso, o tu máximo de repeticiones en uno sin peso, aparece 🏆 en el resumen y en el historial.
- **"La próxima vez"**: el resumen muestra qué ejercicios suben (o bajan) de peso para la sesión siguiente, según la doble progresión.
- **Tarjeta semanal en Inicio**: puntos con los entrenos de la semana contra tu objetivo, sesiones de rehabilitación hechas (14 por semana en fase 1, 4 en fase 2) y racha.
- **Racha** 🔥: semanas seguidas cumpliendo tus días de entreno.
- El historial muestra duración y series de cada entreno.

## 1.3.0 — Sesiones más cómodas

- **Pantalla siempre prendida** mientras hacés un entreno o una rehabilitación (se apaga sola al terminar).
- **Sonidos**: pitido al empezar, cuenta de los últimos 3 segundos y doble pitido al terminar cada serie y cada descanso. También vibra.
- **Voz opcional** en español: "Sostené", "Mitad", "Descansá", "Siguiente serie".
- **Isométricos manos libres**: después del descanso la serie siguiente arranca sola (se puede apagar).
- **Descanso configurable** entre series de entreno: 60 s, 90 s, 2 min o 3 min.
- **Novedades dentro de la app**: Ajustes → Fuentes → *Novedades* muestra este changelog, y cuando hay una versión nueva aparece una tarjeta en Inicio.
- Todo se configura en Ajustes → *Durante la sesión*.

## 1.2.0 — Tu equipo y tu rutina

- **Máquinas propias**: en Ajustes → Equipo → *Máquinas y otros equipos* cargás cualquier máquina (polea, prensa, barra con discos…) con su peso mínimo, máximo y salto. La app redondea las sugerencias a esos saltos.
- **Más equipo**: interruptores para *banco*, *barra de dominadas* y *bandas elásticas*.
- **4 ejercicios nuevos con ilustración**: press en banco con mancuernas, dominadas con agarre neutro (en barra o en aros), rotación externa con banda (ideal para hombros sensibles) y face pull con banda.
- **Rutina editable**: en Entreno → *Editar rutina* podés subir/bajar, cambiar (⇄), quitar o agregar ejercicios en los días A y B. El selector muestra primero los del mismo grupo y avisa qué equipo falta. Botón para volver a la rutina original.
- **Ejercicios propios de entreno**: nombre, con qué se hace (mancuernas, pesa rusa, banda, peso corporal o una de tus máquinas), cómo se registra (kilos × reps, solo reps o segundos), peso inicial opcional, grupo y **tendones que exige** (así el modo dolor también los cuida). Tienen una ilustración genérica según el equipo.
- Al activar el banco o la barra, la app sugiere dónde aprovecharlos.
- El historial guarda el nombre de cada ejercicio, por si después borrás uno propio.

## 1.1.0 — Ilustraciones nuevas

- **Ilustraciones nuevas para los 27 ejercicios**, inspiradas en el estilo de remera amarilla que te gustó, pero dibujadas desde cero: personaje plano con contorno, remera amarilla, short gris, zapatillas blancas, pelo, ojos y manos, sobre una lámina clara con piso y sombra.
- **Movimiento fluido real**: no alternan dos fotos, sino que cada parte del cuerpo se interpola entre la postura inicial y la final. Los ejercicios lentos (3 s subir / 3 s bajar) se animan a ese ritmo.
- Mancuernas con discos azules, pesa rusa, aros con correas, silla de madera y pared, todo dibujado.
- Vista de frente (elevaciones laterales) con torso en V y hombros reales.
- **Sin problemas de copyright**: las genera la IA (Claude) como código vectorial dentro de la app, sin imágenes de terceros. Pesan casi nada y funcionan sin internet.
- Descartado: la imagen de "remera amarilla" de wger (usuario Franpol) venía de sitios comerciales (varias tienen marca de agua de FitnessVolt), así que no se usó.

## 1.0.0 — Primera versión

- PWA instalable, datos solo en el teléfono (IndexedDB), funciona sin conexión.
- Primer uso: perfil, equipo y zonas con dolor (opcional).
- Peso sugerido con calibración (Epley) y redondeo al equipo disponible.
- Entreno cuerpo completo A/B, doble progresión 8–12, volumen +30 % máx por semana.
- Modo dolor opcional: 6 zonas, 3 fases, registro de dolor 0–10, ajuste automático de carga, tope del 60 % y variantes amables.
- Ejercicios del fisio, historial con gráficos, recordatorios `.ics`, copia de seguridad JSON.
