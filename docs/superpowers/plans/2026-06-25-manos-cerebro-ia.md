# Revelado cerebro/red neuronal (versión mano) - Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: usa superpowers:subagent-driven-development o superpowers:executing-plans para implementar tarea a tarea. Los pasos usan checkbox (`- [ ]`).

**Goal:** Al abrir la palma en `manos/`, el logo metálico se disuelve en partículas y se reensambla como un cerebro de partículas con sinapsis disparando y sonido; al cerrar, vuelve al logo.

**Architecture:** `ParticleField` pasa a interpolar entre dos nubes (logo y cerebro) con `morph(p)`; un nuevo `buildBrain()` muestrea un GLB de cerebro (puntos + pares de sinapsis); `manos/index.html` deriva `morph` de la apertura de mano y orquesta partículas, líneas/pulsos de sinapsis y sonido WebAudio procedural. Todo se verifica con harness Playwright headless (patrón `_kit-harness`/`verify-*`).

**Tech Stack:** three.js 0.160 (CDN, importmap), addons GLTFLoader/MeshSurfaceSampler/BufferGeometryUtils, MediaPipe HandLandmarker, WebAudio, Playwright (verificación).

## Global Constraints

- three.js 0.160.0 exactamente, vía CDN/importmap (no bundler).
- Sin em-dashes en todo el repo.
- CI Actions desactivado: verificar SIEMPRE en local con `npm run verify-*`.
- No romper `verify-genesis` ni `verify-kit` (ambos usan `premium.js`): `ParticleField` y `addBrandLights`/`buildLogo` deben seguir siendo retrocompatibles (parámetros nuevos opcionales).
- Paleta: azul `#235a97`, oro `#efa320` (pulsos en oro).
- Abrir PR al final y NO fusionar hasta que Malena lo pida.
- Añadir ficheros al commit por ruta explícita (no `git add -A`).

## File Structure

- Create `assets/source/brain.glb` - modelo de cerebro low-poly CC.
- Create `assets/CREDITS.md` - origen y licencia del asset.
- Modify `shared/premium.js` - `ParticleField` con `targetB`+`morph(p)`; nuevo `buildBrain()`.
- Create `shared/brain-audio.js` - sonido WebAudio procedural.
- Create `tools/_brain-harness.html` - test aislado de `buildBrain`+`morph`.
- Create `tools/verify-brain.mjs` - verificador del harness anterior.
- Modify `manos/index.html` - integración (morph, sinapsis, pulsos, sonido, hooks de test).
- Modify `tools/verify-manos.mjs` - asserts de cerebro/morph/sinapsis.
- Modify `package.json` - script `verify-brain`.

---

### Task 1: Asset del cerebro (GLB CC) + CREDITS

**Files:**
- Create: `assets/source/brain.glb`
- Create: `assets/CREDITS.md`

**Interfaces:**
- Produces: un fichero GLB válido en `assets/source/brain.glb` (cabecera mágica `glTF`).

- [ ] **Step 1: Conseguir un cerebro low-poly con licencia permisiva (CC0 preferido)**

Descargar un GLB de cerebro CC0/CC-BY a `assets/source/brain.glb`. Criterios de aceptación: licencia permisiva, geometría cerrada y reconocible como cerebro, peso razonable para móvil (objetivo < 3 MB; si pesa más, decimar). Candidatos: repositorios CC0 (p. ej. modelos de dominio público de anatomía). Si CC-BY, anotar la atribución.

Si no se encuentra un GLB convincente con licencia clara, PARAR y consultar (el spec prohíbe cambiar el diseño en silencio). Fallback temporal aceptable solo para desbloquear el pipeline: generar un GLB de cerebro paramétrico, marcándolo como provisional en `CREDITS.md` y avisando al usuario.

- [ ] **Step 2: Validar que el GLB es válido**

Run: `node -e "const b=require('fs').readFileSync('assets/source/brain.glb');console.log('magic',b.toString('utf8',0,4),'bytes',b.length)"`
Expected: `magic glTF bytes <N>` con N > 1000.

- [ ] **Step 3: Escribir `assets/CREDITS.md`**

```markdown
# Créditos de assets

## assets/source/brain.glb
- Origen: <URL del modelo>
- Autor: <autor>
- Licencia: <CC0 / CC-BY 4.0>
- Atribución (si CC-BY): "<texto de atribución requerido>"
- Notas: optimizado/decimado para móvil el 2026-06-25.
```

- [ ] **Step 4: Commit**

```bash
git add assets/source/brain.glb assets/CREDITS.md
git commit -m "feat(assets): cerebro low-poly CC + creditos"
```

---

### Task 2: `buildBrain()` en premium.js + harness aislado

**Files:**
- Modify: `shared/premium.js` (añadir import de `GLTFLoader` y la función `buildBrain`)
- Create: `tools/_brain-harness.html`
- Create: `tools/verify-brain.mjs`
- Modify: `package.json` (script `verify-brain`)

**Interfaces:**
- Consumes: `assets/source/brain.glb` (Task 1).
- Produces:
  - `buildBrain(glbUrl, opts={scaleToFit=1.0, nodeCount=280, neighbors=3})` → `Promise<{ brainPoints(count): Float32Array, synapses(opts?): { nodes: THREE.Vector3[], pairs: [number,number][] } }>`. Puntos en espacio centrado en origen, escalado a `scaleToFit` (misma convención de tamaño que `buildLogo`).

- [ ] **Step 1: Escribir el harness de test que falla (usa `buildBrain`, que aún no existe)**

Create `tools/_brain-harness.html`:

```html
<!doctype html>
<html lang="es"><head><meta charset="utf-8" /><title>brain harness</title>
<link rel="icon" href="data:," /><style>html,body{margin:0;height:100%;background:#0a0f1a;overflow:hidden}</style>
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
}}
</script></head><body>
<script type="module">
import * as THREE from "three";
import { addBrandLights, makeComposer, buildLogo, buildBrain, ParticleField } from "../shared/premium.js";
window.__BRAIN = { ready:false, particles:0, synapsePairs:0, morphMoved:false, error:null };
try {
  const renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true });
  renderer.setSize(innerWidth, innerHeight); document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.01, 100);
  camera.position.set(0,0,3);
  addBrandLights(scene);
  const { composer } = makeComposer(renderer, scene, camera);
  const COUNT = 4000;
  const { surfacePoints } = await buildLogo("../assets/iacademia-isotipo.svg", { scaleToFit: 1.2 });
  const brain = await buildBrain("../assets/source/brain.glb", { scaleToFit: 1.2 });
  const logoPts = surfacePoints(COUNT);
  const brainPts = brain.brainPoints(COUNT);
  const syn = brain.synapses();
  const field = new ParticleField(logoPts, { targetB: brainPts });
  scene.add(field.points);
  // morph 0 -> 1 debe mover las particulas
  const before = field.points.geometry.attributes.position.array[1];
  field.morph(1);
  const after = field.points.geometry.attributes.position.array[1];
  window.__BRAIN.morphMoved = Math.abs(after - before) > 1e-6;
  field.morph(0);
  window.__BRAIN.particles = field.count;
  window.__BRAIN.synapsePairs = syn.pairs.length;
  window.__BRAIN.ready = true;
  let t=0; renderer.setAnimationLoop(()=>{ t+=0.016; field.morph((Math.sin(t)+1)/2); composer.render(); });
} catch (e) { window.__BRAIN.error = String(e); }
</script></body></html>
```

Create `tools/verify-brain.mjs`:

```javascript
import { chromium } from "playwright";
import { spawn } from "node:child_process";
const srv = spawn("npx", ["--yes", "serve", "-l", "8093", "."], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ headless: false }); // WebGL real
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("http://localhost:8093/tools/_brain-harness.html", { waitUntil: "load" });
  await page.waitForFunction("window.__BRAIN && (window.__BRAIN.ready || window.__BRAIN.error)", { timeout: 30000 });
  const s = await page.evaluate(() => window.__BRAIN);
  console.log("BRAIN:", JSON.stringify(s), "errors:", JSON.stringify(errors));
  if (!s.ready) throw new Error("brain no listo: " + s.error);
  if (s.particles < 1) throw new Error("particulas no construidas");
  if (s.synapsePairs < 1) throw new Error("sinapsis no generadas");
  if (!s.morphMoved) throw new Error("morph no movio las particulas");
  if (errors.length) throw new Error("errores de consola: " + errors.join(" | "));
  console.log("VERIFY BRAIN OK");
} finally { await browser.close(); srv.kill(); }
```

Add to `package.json` scripts: `"verify-brain": "node tools/verify-brain.mjs"`.

- [ ] **Step 2: Ejecutar para verificar que falla**

Run: `npm run verify-brain`
Expected: FAIL (`buildBrain` no exportado / no es función).

- [ ] **Step 3: Implementar `buildBrain` en `shared/premium.js`**

Añadir import junto a los demás addons:

```javascript
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
```

Añadir la función (después de `buildLogo`):

```javascript
// Muestrea un GLB de cerebro: devuelve puntos de superficie (misma convencion de
// tamano que surfacePoints) y pares de sinapsis (vecinos cercanos) para dibujar lineas.
export async function buildBrain(glbUrl, opts = {}) {
  const { scaleToFit = 1.0, nodeCount = 280, neighbors = 3 } = opts;
  const gltf = await new GLTFLoader().loadAsync(glbUrl);
  gltf.scene.updateMatrixWorld(true);
  const geos = [];
  gltf.scene.traverse((o) => {
    if (o.isMesh) {
      let g = o.geometry.clone().applyMatrix4(o.matrixWorld);
      if (g.index) g = g.toNonIndexed();
      g.deleteAttribute("uv"); g.deleteAttribute("normal"); g.deleteAttribute("color");
      geos.push(g);
    }
  });
  const merged = mergeGeometries(geos, false);
  merged.computeBoundingBox();
  const bb = merged.boundingBox;
  const center = bb.getCenter(new THREE.Vector3());
  const size = bb.getSize(new THREE.Vector3());
  const fit = scaleToFit / Math.max(size.x, size.y, size.z);
  merged.translate(-center.x, -center.y, -center.z);
  merged.scale(fit, fit, fit);
  const sampler = new MeshSurfaceSampler(new THREE.Mesh(merged)).build();
  function brainPoints(count) {
    const arr = new Float32Array(count * 3);
    const tmp = new THREE.Vector3();
    for (let i = 0; i < count; i++) { sampler.sample(tmp); arr[i*3]=tmp.x; arr[i*3+1]=tmp.y; arr[i*3+2]=tmp.z; }
    return arr;
  }
  function synapses({ nodes = nodeCount, k = neighbors } = {}) {
    const pts = []; const tmp = new THREE.Vector3();
    for (let i = 0; i < nodes; i++) { sampler.sample(tmp); pts.push(tmp.clone()); }
    const pairs = [];
    for (let i = 0; i < nodes; i++) {
      const d = [];
      for (let j = 0; j < nodes; j++) if (j !== i) d.push([j, pts[i].distanceToSquared(pts[j])]);
      d.sort((a, b) => a[1] - b[1]);
      for (let n = 0; n < k && n < d.length; n++) { const j = d[n][0]; if (i < j) pairs.push([i, j]); }
    }
    return { nodes: pts, pairs };
  }
  return { brainPoints, synapses };
}
```

- [ ] **Step 4: Implementar `targetB` + `morph` en `ParticleField`** (necesario para que el harness pase)

En el constructor de `ParticleField`, leer `targetB` de opts y guardarlo:

```javascript
// dentro del destructuring de opts del constructor, anadir: targetB = null
// y tras crear this.target: 
this.targetB = targetB; // segunda nube objetivo (cerebro); null => sin morph
```

Añadir método (junto a `assemble`):

```javascript
// p 0..1: interpola de la nube objetivo A (logo) a la B (cerebro)
morph(p) {
  if (!this.targetB) return;
  const e = this._ease(Math.min(1, Math.max(0, p)));
  for (let i = 0; i < this.count * 3; i++) {
    this.current[i] = this.target[i] + (this.targetB[i] - this.target[i]) * e;
  }
  this.points.geometry.attributes.position.needsUpdate = true;
}
```

- [ ] **Step 5: Verificar sintaxis y que el test pasa**

Run: `node --input-type=module --check < shared/premium.js && echo OK`
Expected: `OK`

Run: `npm run verify-brain`
Expected: `VERIFY BRAIN OK`

- [ ] **Step 6: Verificar que no rompe el kit (retrocompatibilidad de ParticleField)**

Run: `npm run verify-kit`
Expected: `VERIFY KIT OK`

- [ ] **Step 7: Commit**

```bash
git add shared/premium.js tools/_brain-harness.html tools/verify-brain.mjs package.json
git commit -m "feat(premium): buildBrain + ParticleField morph doble objetivo"
```

---

### Task 3: Sonido WebAudio procedural (`shared/brain-audio.js`)

**Files:**
- Create: `shared/brain-audio.js`

**Interfaces:**
- Produces: `createBrainAudio()` → `{ init(), setMorph(p), whoosh(), chime(), ready }`. `init()` debe llamarse desde un gesto de usuario. Degrada en silencio si no hay `AudioContext`.

- [ ] **Step 1: Implementar el módulo**

Create `shared/brain-audio.js`:

```javascript
// Sonido procedural (sin ficheros) para el revelado del cerebro.
// init() en un gesto de usuario (politica de autoplay). Degrada en silencio.
export function createBrainAudio() {
  let ctx = null, master = null, hum = null, humGain = null;
  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 1.0; master.connect(ctx.destination);
    hum = ctx.createOscillator(); hum.type = "sine"; hum.frequency.value = 60;
    humGain = ctx.createGain(); humGain.gain.value = 0.0;
    hum.connect(humGain); humGain.connect(master); hum.start();
  }
  function setMorph(p) {
    if (!ctx) return;
    humGain.gain.setTargetAtTime(0.08 * p, ctx.currentTime, 0.1);
    hum.frequency.setTargetAtTime(60 + 40 * p, ctx.currentTime, 0.2);
  }
  function whoosh() {
    if (!ctx) return;
    const dur = 0.5;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = "lowpass";
    f.frequency.setValueAtTime(400, ctx.currentTime);
    f.frequency.linearRampToValueAtTime(4500, ctx.currentTime + dur);
    const g = ctx.createGain(); g.gain.value = 0.22;
    src.connect(f); f.connect(g); g.connect(master); src.start();
  }
  function chime() {
    if (!ctx) return;
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = 880;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + 0.5);
  }
  return { init, setMorph, whoosh, chime, get ready() { return !!ctx; } };
}
```

- [ ] **Step 2: Verificar sintaxis**

Run: `node --input-type=module --check < shared/brain-audio.js && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add shared/brain-audio.js
git commit -m "feat(audio): sonido WebAudio procedural para el revelado"
```

---

### Task 4: Integración en `manos/index.html`

**Files:**
- Modify: `manos/index.html`

**Interfaces:**
- Consumes: `buildBrain`, `ParticleField` con `morph`, `createBrainAudio`.
- Produces (hooks de test): `window.__MANOS` con `brainLoaded:boolean`, `particles:number`, `synapsePairs:number`, `audioReady:boolean`, `morph:number`, y método `testMorph(p)` que fuerza el morph (override) para verificación sin mano real.

- [ ] **Step 1: Importar lo nuevo**

En el bloque de imports de `manos/index.html`, ampliar la línea de `premium.js` y añadir el audio:

```javascript
import { addBrandLights, buildLogo, setCameraBackground, makeBloom, enableBloom, buildBrain, ParticleField } from "../shared/premium.js";
import { createBrainAudio } from "../shared/brain-audio.js";
```

- [ ] **Step 2: Construir holder + partículas + sinapsis tras `buildLogo`**

Tras crear `pivot` y antes de `makeBloom`, añadir:

```javascript
const COUNT = 4500;
const holder = new THREE.Group(); scene.add(holder);
holder.add(pivot); pivot.position.set(0, 0, 0); // el logo se posiciona via holder
// material del logo transparente para poder desvanecerlo al disolverse
pivot.traverse((o) => { if (o.isMesh) { o.material.transparent = true; } });
const { surfacePoints } = { surfacePoints: null }; // placeholder reemplazado abajo
```

Nota de implementación: `buildLogo` ya devuelve `surfacePoints`. Cambiar la línea de `buildLogo` para capturarlo:

```javascript
const { pivot, surfacePoints } = await buildLogo("../assets/iacademia-isotipo.svg", { scaleToFit: 1.0, finish: "metal" });
```

Construir cerebro, campo y sinapsis:

```javascript
const brain = await buildBrain("../assets/source/brain.glb", { scaleToFit: 1.0 });
const field = new ParticleField(surfacePoints(COUNT), { targetB: brain.brainPoints(COUNT), spread: 0.6, size: 0.02, goldRatio: 0.22 });
field.points.visible = false; holder.add(field.points);
// sinapsis: lineas azules aditivas + pulsos dorados
const syn = brain.synapses({ nodes: 260, k: 3 });
const linePos = new Float32Array(syn.pairs.length * 6);
syn.pairs.forEach(([a, b], i) => {
  const A = syn.nodes[a], B = syn.nodes[b];
  linePos.set([A.x, A.y, A.z, B.x, B.y, B.z], i * 6);
});
const lineGeo = new THREE.BufferGeometry();
lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0x6fc0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
lines.visible = false; holder.add(lines);
// pulsos: un Points dorado que viaja por un subconjunto de aristas
const PULSE = Math.min(120, syn.pairs.length);
const pulsePos = new Float32Array(PULSE * 3);
const pulsePhase = new Float32Array(PULSE);
const pulseEdge = new Int32Array(PULSE);
for (let i = 0; i < PULSE; i++) { pulseEdge[i] = (i * 7) % syn.pairs.length; pulsePhase[i] = Math.random(); }
const pulseGeo = new THREE.BufferGeometry();
pulseGeo.setAttribute("position", new THREE.BufferAttribute(pulsePos, 3));
const pulses = new THREE.Points(pulseGeo, new THREE.PointsMaterial({ color: 0xefa320, size: 0.03, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
pulses.visible = false; holder.add(pulses);
enableBloom(field.points); enableBloom(lines); enableBloom(pulses);
const audio = createBrainAudio();
```

- [ ] **Step 3: Estado de test + override de morph**

Ampliar el objeto de estado al principio del script:

```javascript
window.__MANOS = { ready: false, handLandmarkerLoaded: false, error: null, brainLoaded: false, particles: 0, synapsePairs: 0, audioReady: false, morph: 0, _force: null };
window.__MANOS.testMorph = (p) => { window.__MANOS._force = p; };
```

Tras construir todo:

```javascript
window.__MANOS.brainLoaded = true;
window.__MANOS.particles = field.count;
window.__MANOS.synapsePairs = syn.pairs.length;
```

Y en el handler de `#start`, tras arrancar la cámara, inicializar el audio y marcar `audioReady`:

```javascript
audio.init();
window.__MANOS.audioReady = audio.ready;
```

- [ ] **Step 4: Posicionar el holder y derivar morph en `place()`**

Reescribir `place(lm)` para mover el `holder` (no el `pivot`) y calcular `morph`:

```javascript
let morph = 0;            // suavizado entre frames
const FIST = 1.2, OPEN = 2.1;
function place(lm) {
  const { cx, cy, span, open } = palmInfo(lm);
  const nx = (MIRROR ? 1 - cx : cx) * 2 - 1;
  const ny = -(cy * 2 - 1);
  const v = new THREE.Vector3(nx, ny, 0.5).unproject(camera);
  const dir = v.sub(camera.position).normalize();
  holder.position.copy(camera.position).add(dir.multiplyScalar(2.2));
  const baseScale = THREE.MathUtils.clamp(span * 4.0, 0.3, 1.5);
  holder.scale.setScalar(fitScale * baseScale);
  // objetivo de morph desde la apertura (smoothstep FIST->OPEN)
  const raw = THREE.MathUtils.clamp((open - FIST) / (OPEN - FIST), 0, 1);
  window._morphTarget = raw * raw * (3 - 2 * raw);
  holder.visible = true;
}
```

(`fitScale` ya existe: `const fitScale = pivot.scale.x` antes de meter el pivot en el holder; al meterlo en el holder y poner `pivot.position=0`, conserva su escala interna de ajuste.)

- [ ] **Step 5: Animar morph, sinapsis, pulsos y sonido en `frame()`**

Reescribir el cuerpo de `frame()` (manteniendo la detección existente):

```javascript
function frame() {
  const dt = clock.getDelta();
  const t = clock.elapsedTime;
  let detected = false;
  if (video.readyState >= 2 && handLandmarker) {
    const res = handLandmarker.detectForVideo(video, performance.now());
    if (res.landmarks && res.landmarks.length) { place(res.landmarks[0]); detected = true; hint.style.display = "none"; }
    else { holder.visible = false; hint.style.display = "block"; }
  }
  // morph: override de test si existe, si no el objetivo suavizado de la mano
  const target = (window.__MANOS._force != null) ? window.__MANOS._force : (detected ? (window._morphTarget || 0) : 0);
  morph += (target - morph) * Math.min(1, dt * 6);
  window.__MANOS.morph = morph;
  field.morph(morph);
  // crossfade logo solido <-> particulas
  const showField = morph > 0.02;
  field.points.visible = showField;
  field.points.material.opacity = Math.min(1, morph * 1.4);
  pivot.visible = morph < 0.98;
  pivot.traverse((o) => { if (o.isMesh) o.material.opacity = 1 - Math.min(1, morph * 1.3); });
  if (pivot.visible) pivot.rotation.y += dt * 0.7;
  // sinapsis + pulsos solo con morph alto
  const synK = THREE.MathUtils.clamp((morph - 0.6) / 0.4, 0, 1);
  lines.visible = pulses.visible = synK > 0.001;
  lines.material.opacity = 0.5 * synK;
  pulses.material.opacity = synK;
  if (synK > 0.001) {
    const arr = pulses.geometry.attributes.position.array;
    for (let i = 0; i < PULSE; i++) {
      pulsePhase[i] = (pulsePhase[i] + dt * 0.6) % 1;
      const [a, b] = syn.pairs[pulseEdge[i]];
      const A = syn.nodes[a], B = syn.nodes[b], p = pulsePhase[i];
      arr[i*3] = A.x + (B.x - A.x) * p; arr[i*3+1] = A.y + (B.y - A.y) * p; arr[i*3+2] = A.z + (B.z - A.z) * p;
    }
    pulses.geometry.attributes.position.needsUpdate = true;
  }
  // latido del cerebro
  if (morph > 0.9) field.points.scale.setScalar(1 + 0.03 * Math.sin(t * 3.0));
  // sonido
  audio.setMorph(morph);
  if (cover) cover(window.innerWidth, window.innerHeight);
  bloom.render();
  requestAnimationFrame(frame);
}
```

(Detalle de sonido: disparar `whoosh()` al cruzar morph 0.5 al alza y `chime()` al volver por debajo de 0.05; mantener `let lastMorph` para detectar cruces.)

Añadir antes de `frame`:

```javascript
let lastMorph = 0;
```

y dentro de `frame()`, tras actualizar `morph`:

```javascript
if (lastMorph < 0.5 && morph >= 0.5) audio.whoosh();
if (lastMorph > 0.05 && morph <= 0.05) audio.chime();
lastMorph = morph;
```

- [ ] **Step 6: Quitar el `morph`/scale viejo del logo**

Eliminar de `place()` la línea antigua `pivot.scale.setScalar(fitScale * baseScale * openK)` y la variable `openK` si ya no se usa (ahora la escala la lleva `holder`). El `pivot` ya no se escala ni posiciona por separado.

- [ ] **Step 7: Verificar sintaxis del script inline**

Run: `awk '/<script type="module">/{f=1;next} /<\/script>/{f=0} f' manos/index.html | node --input-type=module --check && echo OK`
Expected: `OK`

- [ ] **Step 8: Ampliar `tools/verify-manos.mjs` con asserts del cerebro/morph**

Tras el bloque que comprueba `handLandmarkerLoaded`, añadir antes del `console.log("VERIFY MANOS OK")`:

```javascript
  // cerebro + morph
  if (!s.brainLoaded || s.particles < 1 || s.synapsePairs < 1) throw new Error("cerebro/particulas/sinapsis no construidos");
  // forzar morph 0 -> 1 -> 0 y comprobar que no peta
  await page.evaluate(() => window.__MANOS.testMorph(1));
  await page.waitForTimeout(400);
  const m1 = await page.evaluate(() => window.__MANOS.morph);
  await page.evaluate(() => window.__MANOS.testMorph(0));
  await page.waitForTimeout(400);
  const m0 = await page.evaluate(() => window.__MANOS.morph);
  await page.evaluate(() => window.__MANOS.testMorph(null));
  if (!(m1 > 0.8) || !(m0 < 0.2)) throw new Error("morph forzado no respondio: m1=" + m1 + " m0=" + m0);
  const crit2 = (await page.evaluate(() => null), errors).filter((e) => !/deprecat|GroupMarker|GL_/i.test(e));
  if (crit2.length) throw new Error("errores tras morph: " + crit2.join(" | "));
```

- [ ] **Step 9: Ejecutar verify-manos (debe pasar) y los demás (no regresión)**

Run: `npm run verify-manos`
Expected: `VERIFY MANOS OK`

Run: `npm run verify-genesis && npm run verify-kit && npm run verify-brain`
Expected: `VERIFY GENESIS OK`, `VERIFY KIT OK`, `VERIFY BRAIN OK`

- [ ] **Step 10: Commit**

```bash
git add manos/index.html tools/verify-manos.mjs
git commit -m "feat(manos): revelado cerebro/red neuronal por gesto + sinapsis + sonido"
```

---

### Task 5: Verificación final y PR

**Files:** ninguno (solo verificación y PR).

- [ ] **Step 1: Pasar todos los verificadores juntos**

Run: `npm run verify-manos && npm run verify-genesis && npm run verify-kit && npm run verify-brain`
Expected: las cuatro líneas `VERIFY ... OK`.

- [ ] **Step 2: Push de la rama**

Run: `git push -u origin feat/manos-cerebro-ia`

- [ ] **Step 3: Abrir PR (NO fusionar)**

Run: `gh pr create --base main --head feat/manos-cerebro-ia --title "Revelado cerebro/red neuronal por gesto (version mano)" --body "<resumen + resultados de los 4 verificadores + nota de prueba en movil + atribucion del asset si CC-BY>"`

- [ ] **Step 4: Avisar a Malena de que el PR está listo para revisar y queda pendiente su "merguea".**

---

## Self-Review

**Spec coverage:**
- Interacción morph desde apertura de mano → Task 4 (place/frame). OK
- ParticleField doble objetivo → Task 2. OK
- buildBrain (GLB + sinapsis) → Task 2. OK
- Sinapsis líneas+pulsos → Task 4. OK
- Sonido WebAudio procedural → Task 3 + Task 4 (wiring). OK
- Asset cerebro CC + CREDITS → Task 1. OK
- Crossfade logo<->partículas → Task 4 (step 5). OK
- Verificación ampliada + no romper genesis/kit → Task 2 (step 6), Task 4 (steps 8-9), Task 5. OK
- PR sin fusionar → Task 5. OK

**Placeholder scan:** El único "placeholder" textual es la línea de `_brain-harness` que se reemplaza explícitamente en el mismo paso (Task 4 step 2 aclara capturar `surfacePoints` de `buildLogo`); revisar al implementar que no quede la línea placeholder. Sin TBD/TODO reales.

**Type consistency:** `buildBrain` → `{brainPoints, synapses}` usado igual en Task 2 y Task 4. `synapses()` → `{nodes, pairs}` consistente. `ParticleField(..., {targetB})` + `morph(p)` consistente. `createBrainAudio()` → `{init,setMorph,whoosh,chime,ready}` consistente entre Task 3 y Task 4. `window.__MANOS.testMorph`/`morph` consistentes entre Task 4 y verify-manos.

**Riesgo conocido:** Task 1 puede requerir consulta si no hay GLB CC convincente (no cambiar diseño en silencio).
