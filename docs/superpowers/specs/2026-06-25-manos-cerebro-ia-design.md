# Revelado "cerebro / red neuronal" por gesto (versión de la mano)

Fecha: 2026-06-25
Módulo: `manos/index.html` (+ `shared/premium.js`)
Estado: diseño aprobado, pendiente de plan de implementación.

## Objetivo

Añadir un "payoff" temático de IA a la experiencia WebAR de la mano: al abrir la
palma, el isotipo metálico de iAcademia se disuelve en partículas y se reensambla
formando un **cerebro reconocible** de partículas de luz con **sinapsis disparando**;
al cerrar la mano, vuelve a ser el logo. Pensado como contenido para redes (vertical,
con sonido, gesto "magia" que invita a grabarse y a "pruébalo tú").

## Contexto actual (lo que ya existe)

- `manos/index.html`: detección de mano con MediaPipe `HandLandmarker`, cámara de
  fondo como `scene.background`, logo metálico (`buildLogo`, acabado `finish:"metal"`)
  colocado sobre la palma. Ya calcula la **apertura de la mano** (`open` y `openK` en
  `palmInfo`/`place`). Render con bloom selectivo (`makeBloom`) y entorno HDRI
  (`RoomEnvironment` + PMREM) ya integrados.
- `shared/premium.js`:
  - `buildLogo(svgUrl, {finish})` devuelve `{ pivot, surfacePoints(count) }`.
    `surfacePoints` muestrea la superficie del logo con `MeshSurfaceSampler`.
  - `ParticleField(targetPositions, opts)` con `explode(p)`, `assemble(p)`,
    `swirl(dt)`. Hoy admite **un solo** juego de posiciones objetivo.
  - `makeBloom`, `enableBloom`, `BLOOM_LAYER`, `addBrandLights`, `setCameraBackground`.
- El reel `genesis/index.html` ya usa `ParticleField` con una línea de tiempo
  (ruptura → swirl → ensamblado → logo). **No se toca** en este trabajo.

## Decisiones de diseño (aprobadas)

1. Vive en `manos/` (interactivo), no en el reel ni en el flyer.
2. Relación logo ↔ cerebro **por gesto**, continua y reversible (no automática).
3. Forma: **cerebro reconocible** (no red abstracta) → requiere un modelo 3D del que
   muestrear puntos.
4. Incluye **sinapsis disparando** (conexiones + pulsos) y **sonido in-experiencia**.
5. Paleta de marca: azul `#235a97`, oro `#efa320` (pulsos/acentos en oro).

## Diseño de la interacción

Parámetro maestro `morph` en `[0, 1]`, derivado de la apertura de la mano:

- `morph = 0` (mano relajada / puño): **logo metálico** visible sobre la palma.
  Partículas y cerebro ocultos. Comportamiento actual intacto.
- `0 < morph < 1` (abriendo): el logo metálico se desvanece, las **partículas**
  toman su lugar y migran de las posiciones del logo a las del cerebro. Sinapsis y
  sonido escalan con `morph`.
- `morph = 1` (palma abierta): **cerebro** completo de partículas + sinapsis
  disparando, latido suave. Logo metálico oculto.

`morph` se obtiene mapeando `open` (apertura ya calculada; puño ≈ 1.2, abierta ≈ 2.1)
a `[0,1]` con un `smoothstep` y **suavizado temporal** (lerp por frame) para que el
morph no tiemble con el ruido de detección. Histéresis ligera para evitar parpadeo
cerca de los umbrales.

## Arquitectura técnica

Unidades pequeñas y con una sola responsabilidad cada una:

### 1. `ParticleField` → doble objetivo (en `shared/premium.js`)

Extender la clase para admitir **dos** nubes objetivo del mismo tamaño (`count`):
`targetLogo` y `targetBrain`. La nube intermedia (`cloud`) se mantiene para la
dispersión.

- Constructor: `new ParticleField(targetLogo, { ...opts, targetB: targetBrain })`.
  Retrocompatible: si no se pasa `targetB`, se comporta como hoy.
- Nuevo método `morph(p)`: interpola por partícula entre `targetLogo` (p=0) y
  `targetBrain` (p=1) con un easing suave; escribe en el buffer de posiciones.
  Mantiene los colores existentes (azul/oro por `goldRatio`).
- Se conservan `explode`/`assemble`/`swirl` (no se rompen consumidores: genesis).

Restricción: ambas nubes deben tener exactamente `count` puntos. El muestreo del
cerebro devuelve un array del mismo tamaño que `surfacePoints(count)`.

### 2. `buildBrain(glbUrl, opts)` (nuevo helper en `shared/premium.js`)

- Carga el GLB con `GLTFLoader`, fusiona sus mallas y muestrea la superficie con
  `MeshSurfaceSampler` (mismo patrón que `buildLogo`).
- Normaliza/centra/escala el cerebro a un tamaño comparable al logo (`scaleToFit`),
  alineado con el pivote del logo para que el morph sea coherente en el espacio.
- Devuelve:
  - `brainPoints(count)`: `Float32Array` de posiciones de superficie (espacio del
    pivote, igual convención que `surfacePoints`).
  - `synapses(opts)`: lista de pares de índices de nodos para las conexiones
    (vecinos cercanos, K-NN sobre un subconjunto de N nodos), para dibujar líneas.

### 3. Sinapsis (en `manos/` usando datos de `buildBrain`)

- `LineSegments` con `LineBasicMaterial` aditivo, color azul claro, `depthWrite:false`,
  en `BLOOM_LAYER` para que brillen. Geometría construida desde los pares de
  `synapses()` sobre las posiciones del cerebro.
- **Pulsos**: un `Points` (oro) que viaja a lo largo de un subconjunto de aristas;
  cada pulso interpola entre los dos extremos de su arista con una fase propia que
  avanza cada frame y reaparece (modulo). Opacidad/cantidad escalan con `morph`.
- Sinapsis y pulsos solo visibles cuando `morph` supera un umbral (~0.6) y se
  desvanecen por debajo.

### 4. Sonido (nuevo módulo ligero, sin ficheros de audio)

WebAudio procedural, inicializado en el handler del botón **Comenzar** (gesto de
usuario, requisito de autoplay):

- `whoosh`: ruido filtrado con barrido de paso-bajo, disparado cuando `morph` cruza
  al alza un umbral (transformación).
- `hum`: oscilador grave + ligero detune, con ganancia proporcional a `morph`
  (zumbido mientras el cerebro está activo).
- `chime`: seno corto al volver a `morph≈0` (logo formado).

Un único `AudioContext`, nodos `GainNode` para mezclar; se respeta silencio del
dispositivo. Si `AudioContext` no está disponible, la experiencia funciona sin sonido
(degradación elegante).

### 5. Cableado en `manos/index.html`

- En el arranque: además del `pivot` del logo, construir el `ParticleField`
  (logo + cerebro), las `LineSegments` de sinapsis y los pulsos; añadirlos a la escena
  y marcarlos con `enableBloom`. Ocultos al inicio.
- En `place(lm)`: calcular `morph` desde `open` (smoothstep + suavizado), posicionar
  partículas/sinapsis sobre la palma (igual transform que el logo).
- En `frame()`: actualizar `field.morph(morph)`, visibilidad/opacidad del `pivot`
  (visible solo con `morph` bajo), animar pulsos, latido del cerebro, y la mezcla de
  sonido. Render con el `makeBloom` ya existente.

## Asset y licencia

- Modelo de cerebro **low-poly** con licencia permisiva (CC0 preferido; si CC-BY,
  añadir atribución).
- Optimizar para móvil (reducir polígonos si hace falta; el muestreo de superficie no
  necesita texturas).
- Guardar en `assets/` (p. ej. `assets/source/brain.glb`) y registrar origen + licencia
  en `assets/CREDITS.md`.

## Rendimiento

- Reusar el orden de magnitud de partículas del reel (~4000–6000).
- Sinapsis: ~200–400 segmentos; pulsos: subconjunto pequeño.
- `pixelRatio ≤ 2` (ya aplicado). Mantener `makeBloom`.
- Objetivo: fluido en móvil de gama media; si baja, reducir `count`/segmentos.

## Verificación

- Ampliar `tools/verify-manos.mjs` (o el harness equivalente) para comprobar, en
  Chromium headless con WebGL por software: el campo se construye, el cerebro carga
  (puntos > 0), `morph` se puede ejecutar de 0→1→0 sin errores, y `window.__MANOS.error`
  es `null` con `errors: []`.
- Prueba de humo de carga (como en el PR del metal): sin `pageerror`, WebGL inicia,
  sin overlay de error.
- Comprobación final en `main` tras fusionar; aspecto real (cámara + mano) a verificar
  en móvil.

## Fuera de alcance (YAGNI)

- No tocar `genesis/` ni `marker/`.
- No añadir audio en tendencia dentro de la app (se añade en la edición del vídeo).
- No menús/ajustes de usuario para el efecto.
- No segunda mano ni gestos adicionales (pellizco, etc.) en esta iteración.

## Riesgos / notas

- El parecido a "cerebro" depende de la calidad del GLB CC encontrado; si ninguno
  convence, se evaluará con el usuario antes de implementar (no se cambia el diseño en
  silencio).
- Mantener la retrocompatibilidad de `ParticleField` para no romper el reel: cubierto
  por `verify-genesis`/`verify-kit`.
