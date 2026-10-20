# Tendón Fuerte — rehabilitación de tendones y entreno con mancuernas

App web instalable (PWA) para recuperar tendones con isométricos y ganar músculo con mancuernas, pesas rusas y aros.

## Privacidad

- Todos los datos viven **solo en el celular** (IndexedDB). No hay servidor, cuentas ni llamadas externas.
- Copia de seguridad en un archivo JSON desde Ajustes, compartible con el menú Compartir del celular.

## Funciones

- **Primer uso:** perfil (sexo, peso, altura, edad, experiencia, días por semana), equipo y zonas con dolor (opcional).
- **Peso sugerido:** se estima con peso corporal × coeficiente del ejercicio, ajustado por sexo, experiencia y edad. La primera vez se sugiere el 70 % y una **serie de calibración** (reps + reps en reserva → 1RM con Epley) fija el peso real. Se redondea a las mancuernas y pesas rusas que tengas.
- **Entreno:** cuerpo completo A/B, doble progresión 8–12 repeticiones, volumen que sube como mucho 30 % por semana; sugiere pasar de 2 a 3 días cuando venís constante.
- **Modo dolor (lo activa el usuario):** 6 zonas (codo lateral y medial, muñeca, hombro, rodilla, Aquiles) en 3 fases:
  1. Isométricos: 3 × 45 s, mañana y noche.
  2. Isotónicos lentos: 3 × 15 a tempo 3 s / 3 s, día por medio.
  3. Integración: vuelven los pesos completos y 5–10 min de isométricos al final del entreno.
  - Registra el dolor 0–10 y al día siguiente pregunta cómo amaneció: dolor ≤ 2 y no peor → sube la carga; > 4 o peor → baja.
  - En el entreno, los ejercicios que exigen una zona en fase 1–2 van al 60 %, o a una variante amable si la zona está sensible.
- **Ejercicios del fisio:** se cargan a mano y aparecen en cada sesión de rehabilitación.
- **Bocetos animados** propios en SVG para cada ejercicio.
- **Historial:** gráficos de dolor por zona y de peso por ejercicio.
- **Recordatorios:** archivo `.ics` para el calendario del teléfono (isométricos diarios y días de entreno).

## Fuentes

- Jeremy Ethier con Keith Baar y Coach Q — [It's Weird, But It Re-Builds Your Tendons In 30 Days](https://www.youtube.com/watch?v=GSwL3Lgw6zI).
- Fuente Oswald bajo [SIL Open Font License 1.1](fonts/OFL.txt).

No es un consejo médico: ante dolor agudo, hinchazón o pérdida de fuerza, consultá a un profesional.

## Estructura

| Archivo | Qué tiene |
|---|---|
| `data.js` | Zonas, ejercicios con sus bocetos, plantillas A/B |
| `logic.js` | Reglas puras: pesos, calibración, progresión, modo dolor, volumen, calendario |
| `figures.js` | Dibujo y animación de los bocetos |
| `app.js` | Pantallas, sesiones y guardado |
| `sw.js` | Caché para usarla sin conexión |

## Pruebas

```
npm i && npx playwright install chromium
node tests/unit.mjs                       # reglas
python -m http.server 8124 &
node tests/e2e.mjs                        # punta a punta (SHOTS=carpeta guarda capturas)
node tests/icon.mjs                       # regenera los íconos
```
