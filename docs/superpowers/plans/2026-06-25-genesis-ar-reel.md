# GENESIS: reel AR de 3 actos - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir dos experiencias AR web (Modulo 1 "ruptura+genesis" sobre marcador, Modulo 2 "en tus manos" con seguimiento de mano) mas la tarjeta-marcador y una guia de rodaje, para grabar y montar un reel vertical donde la marca de iAcademia nace de los datos y acaba en la palma.

**Architecture:** Se amplia el repo existente `ar-flyer-demo` (GitHub Pages). Un kit JS compartido (`shared/premium.js`) provee bloom, materiales de marca, carga+extrusion del logo, muestreo de su superficie y un sistema de particulas que "ensambla" la nube en la forma del logo. El Modulo 1 (`genesis/`) usa MindAR (marcador) y una linea de tiempo por reloj; el Modulo 2 (`manos/`) usa MediaPipe HandLandmarker. Cada modulo es una pagina estatica a pantalla completa para grabar con el movil. El montaje final lo hace el equipo en un editor.

**Tech Stack:** HTML/JS ES modules; three@0.160.0 (+ addons: SVGLoader, EffectComposer, RenderPass, UnrealBloomPass, OutputPass, MeshSurfaceSampler, BufferGeometryUtils); mind-ar@1.2.5; @mediapipe/tasks-vision@0.10.18; Node + Playwright (ya instalado) para render/compilacion/verificacion. GitHub Pages.

## Global Constraints

- **Sin em-dashes (U+2014)** en codigo, textos ni commits. Usar punto, coma, dos puntos o parentesis.
- **Versiones fijadas:** three `0.160.0`, mind-ar `1.2.5`, @mediapipe/tasks-vision `0.10.18`. No cambiar sin verificar.
- **Colores de marca (literal, minusculas):** azul `#235a97`, azul oscuro `#1b3f6b`, dorado `#efa320`. La deteccion de color del logo es por igualdad exacta con `#efa320` (dorado); el resto azul.
- **Gotcha camara:** MindAR/el video van en `z-index:-2`. Poner `html`/`body` con fondo `transparent` al arrancar la camara para que se vea la realidad (ver `index.html` del demo). El error overlay si lleva fondo opaco.
- **Gotcha compilador de marcador:** corre Chromium NO-headless (necesita WebGL real; headless en este Mac no tiene). Patron ya existente en `tools/compile-target.mjs`.
- **Captura pensada para 9:16 vertical**, estetica oscura/cinematografica (oscurecer sutil el feed para que el glow destaque). Sin CTA ni venta.
- **Presupuesto de particulas:** por defecto 6000 (constante `PARTICLE_COUNT`); mantenerlo configurable y razonable para fluidez en movil.
- **Reutilizar el logo existente** `assets/iacademia-isotipo.svg` (raiz del repo). Las paginas en subcarpetas lo referencian con `../assets/iacademia-isotipo.svg`.
- **Directorio del proyecto:** `/Users/malenaps/GitHub_IAcademia/ar-flyer-demo`. **Pages URL base:** `https://mps136.github.io/ar-flyer-demo/`.
- **No romper el demo actual** (`index.html`, `flyer/`, `assets/`, `tools/` existentes).

> **Nota sobre TDD/verificacion:** es WebAR grafico; no admite TDD rojo-verde. La verificacion automatizable es: que los modulos CARGUEN en headless sin errores de consola y construyan su escena (exponen `window.__GEN` / `window.__MANOS` con flags), y captura de pantalla para juicio visual (controlador). Los valores esteticos (duraciones, tamanos, fuerza de bloom) se afinan visualmente: el codigo dado es un punto de partida funcional con parametros concretos y cada modulo tiene un paso de ajuste visual.

## File Structure

```
ar-flyer-demo/
  shared/
    premium.js              Kit compartido: BRAND, luces, makeComposer, buildLogo (+muestreo), ParticleField
  genesis/
    index.html             Modulo 1: ruptura + genesis (MindAR marcador + kit + timeline)
    assets/targets.mind     Marcador compilado de la tarjeta (Task 3)
  manos/
    index.html             Modulo 2: en tus manos (MediaPipe HandLandmarker + kit)
  marker/
    card.html              Diseno de la tarjeta-marcador (oscura, con detalle para tracking)
    card.png               Tarjeta renderizada (imprimible y fuente del marcador) (Task 2)
  tools/
    render-card.mjs        Renderiza marker/card.html -> marker/card.png (Playwright)
    compile-genesis-target.mjs  Compila marker/card.png -> genesis/assets/targets.mind (Chromium no-headless)
    verify-kit.mjs         Carga una pagina-arnes que usa el kit y comprueba logo+particulas
    verify-genesis.mjs     Carga genesis/ en headless y comprueba que la escena se construye
    verify-manos.mjs       Carga manos/ en headless y comprueba que HandLandmarker + escena cargan
    _kit-harness.html      Pagina minima para verify-kit (usa el kit, sin AR)
  docs/superpowers/
    plans/2026-06-25-genesis-ar-reel.md
    specs/2026-06-25-genesis-ar-reel-design.md
    GUIA-RODAJE-GENESIS.md  Guia de rodaje + montaje (Task 6)
```

---

### Task 1: Kit compartido `shared/premium.js` (+ arnes de verificacion)

**Files:**
- Create: `shared/premium.js`, `tools/_kit-harness.html`, `tools/verify-kit.mjs`

**Interfaces (lo que produce este task y consumen los modulos):**
- `BRAND = { blue:"#235a97", dark:"#1b3f6b", gold:"#efa320" }`
- `addBrandLights(scene)` -> anade luces; sin retorno.
- `makeComposer(renderer, scene, camera, opts?) -> { composer, bloom }` (opts: `{strength,radius,threshold}`; defaults 1.1/0.5/0.0). `composer.render()` sustituye a `renderer.render`.
- `async buildLogo(svgUrl, opts?) -> { pivot, surfacePoints(count) }` donde `pivot` es THREE.Group (logo extruido emisivo, centrado, escala `scaleToFit` def 1.0) y `surfacePoints(count)` devuelve `Float32Array` de `count*3` posiciones sobre la superficie del logo EN EL MISMO espacio local que `pivot` (para que particulas y logo coincidan).
- `new ParticleField(targetPositions, opts?)` con propiedades/metodos: `.points` (THREE.Points), `.count`, `.explode(p)` (p 0..1: de foco compacto a nube), `.assemble(p)` (p 0..1: de nube a `targetPositions`), `.swirl(dt)`.

- [ ] **Step 1: Escribir `shared/premium.js`**

```js
import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const BRAND = { blue: "#235a97", dark: "#1b3f6b", gold: "#efa320" };

export function addBrandLights(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.0));
  const d = new THREE.DirectionalLight(0xffffff, 1.2);
  d.position.set(1, 1, 2);
  scene.add(d);
}

export function makeComposer(renderer, scene, camera, opts = {}) {
  const { strength = 1.1, radius = 0.5, threshold = 0.0 } = opts;
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight), strength, radius, threshold
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  return { composer, bloom };
}

export async function buildLogo(svgUrl, opts = {}) {
  const { depth = 18, scaleToFit = 1.0 } = opts;
  const text = await (await fetch(svgUrl)).text();
  const data = new SVGLoader().parse(text);
  const group = new THREE.Group();
  for (const path of data.paths) {
    const rawFill = path.userData && path.userData.style && path.userData.style.fill;
    if (!rawFill || rawFill.toLowerCase() === "none") continue;
    const fill = rawFill.toLowerCase();
    const color = fill === BRAND.gold.toLowerCase() ? BRAND.gold : BRAND.blue;
    const mat = new THREE.MeshStandardMaterial({
      color, emissive: new THREE.Color(color), emissiveIntensity: 0.4, metalness: 0.4, roughness: 0.35,
    });
    for (const shape of SVGLoader.createShapes(path)) {
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth, bevelEnabled: true, bevelThickness: 2.5, bevelSize: 2, bevelSegments: 3, curveSegments: 24,
      });
      group.add(new THREE.Mesh(geo, mat));
    }
  }
  group.scale.y *= -1;
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  group.children.forEach((m) => m.position.sub(center));
  const fit = scaleToFit / Math.max(size.x, size.y);
  const pivot = new THREE.Group();
  pivot.add(group);
  pivot.scale.setScalar(fit);
  pivot.updateMatrixWorld(true);

  // Geometria fusionada en el espacio local del pivot (para muestreo alineado).
  const worldGeos = group.children.map((m) => m.geometry.clone().applyMatrix4(m.matrixWorld));
  const merged = mergeGeometries(worldGeos, false);
  const sampler = new MeshSurfaceSampler(new THREE.Mesh(merged)).build();

  function surfacePoints(count) {
    const arr = new Float32Array(count * 3);
    const tmp = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      sampler.sample(tmp);
      arr[i * 3] = tmp.x; arr[i * 3 + 1] = tmp.y; arr[i * 3 + 2] = tmp.z;
    }
    return arr;
  }
  return { pivot, surfacePoints };
}

export class ParticleField {
  constructor(targetPositions, opts = {}) {
    const { spread = 1.6, size = 0.014, goldRatio = 0.18 } = opts;
    this.count = targetPositions.length / 3;
    this.target = targetPositions;
    this.cloud = new Float32Array(this.count * 3);
    this.current = new Float32Array(this.count * 3);
    this.delay = new Float32Array(this.count);
    const colors = new Float32Array(this.count * 3);
    const blue = new THREE.Color(BRAND.blue), gold = new THREE.Color(BRAND.gold);
    for (let i = 0; i < this.count; i++) {
      const r = spread * (0.45 + Math.random() * 0.55);
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * spread * 0.5;
      this.cloud[i * 3] = Math.cos(a) * r;
      this.cloud[i * 3 + 1] = y;
      this.cloud[i * 3 + 2] = Math.sin(a) * r;
      this.current.set([0, 0, 0], i * 3);
      this.delay[i] = Math.random() * 0.35;
      const c = Math.random() < goldRatio ? gold : blue;
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.current, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size, vertexColors: true, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.points = new THREE.Points(geo, mat);
  }
  _ease(t) { return t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3); }
  // p 0..1: de foco compacto (origen) a la nube
  explode(p) {
    const e = this._ease(p);
    for (let i = 0; i < this.count * 3; i++) this.current[i] = this.cloud[i] * e;
    this.points.geometry.attributes.position.needsUpdate = true;
  }
  // p 0..1: de la nube a las posiciones objetivo (logo)
  assemble(p) {
    for (let i = 0; i < this.count; i++) {
      const local = (p - this.delay[i]) / (1 - this.delay[i] || 1);
      const e = this._ease(Math.min(1, Math.max(0, local)));
      for (let k = 0; k < 3; k++) {
        const idx = i * 3 + k;
        this.current[idx] = this.cloud[idx] + (this.target[idx] - this.cloud[idx]) * e;
      }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
  swirl(dt) { this.points.rotation.y += dt * 0.3; }
}
```

- [ ] **Step 2: Escribir `tools/_kit-harness.html`** (usa el kit sin AR, solo para verificar)

```html
<!doctype html>
<html lang="es"><head><meta charset="utf-8" /><title>kit harness</title>
<style>html,body{margin:0;height:100%;background:#0a0f1a;overflow:hidden}</style>
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
}}
</script></head><body>
<script type="module">
import * as THREE from "three";
import { addBrandLights, makeComposer, buildLogo, ParticleField } from "../shared/premium.js";
window.__KIT = { ready:false, meshes:0, particles:0, error:null };
try {
  const renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true });
  renderer.setSize(innerWidth, innerHeight); document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.01, 100);
  camera.position.set(0,0,3);
  addBrandLights(scene);
  const { composer } = makeComposer(renderer, scene, camera);
  const { pivot, surfacePoints } = await buildLogo("../assets/iacademia-isotipo.svg", { scaleToFit: 1.2 });
  scene.add(pivot);
  const field = new ParticleField(surfacePoints(4000));
  scene.add(field.points);
  window.__KIT.meshes = pivot.children[0].children.length;
  window.__KIT.particles = field.count;
  window.__KIT.ready = true;
  let t = 0;
  renderer.setAnimationLoop(() => { t += 0.016; field.assemble((Math.sin(t)+1)/2); pivot.rotation.y += 0.01; composer.render(); });
} catch (e) { window.__KIT.error = String(e); }
</script></body></html>
```

- [ ] **Step 3: Escribir `tools/verify-kit.mjs`**

```js
import { chromium } from "playwright";
import { spawn } from "node:child_process";
const srv = spawn("npx", ["--yes", "serve", "-l", "8092", "."], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ headless: false }); // WebGL real
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("http://localhost:8092/tools/_kit-harness.html", { waitUntil: "load" });
  await page.waitForFunction("window.__KIT && (window.__KIT.ready || window.__KIT.error)", { timeout: 20000 });
  const s = await page.evaluate(() => window.__KIT);
  console.log("KIT:", JSON.stringify(s), "errors:", JSON.stringify(errors));
  if (!s.ready) throw new Error("kit no listo: " + s.error);
  if (s.meshes < 1 || s.particles < 1) throw new Error("logo/particulas no construidos");
  if (errors.length) throw new Error("errores de consola: " + errors.join(" | "));
  console.log("VERIFY KIT OK");
} finally { await browser.close(); srv.kill(); }
```

- [ ] **Step 4: Ejecutar la verificacion**

Run: `cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && node tools/verify-kit.mjs`
Expected: `KIT: {"ready":true,"meshes":...,"particles":4000,...}` y `VERIFY KIT OK`, sin errores de consola. Si falla la carga de un addon, comprobar las rutas del importmap (`three/addons/`).

- [ ] **Step 5: Commit**

```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && git add shared/premium.js tools/_kit-harness.html tools/verify-kit.mjs && git commit -m "feat: kit premium compartido (bloom, logo, particulas)"
```

---

### Task 2: Tarjeta-marcador "Genesis" (diseno + render)

**Files:**
- Create: `marker/card.html`, `tools/render-card.mjs`, `marker/card.png` (output)

**Interfaces:**
- Produces: `marker/card.png` (imagen oscura con detalle para tracking, fuente del marcador del Modulo 1).

- [ ] **Step 1: Disenar `marker/card.html` PREMIUM con la skill de diseno**

Invoca la skill `high-end-visual-design` (o `design`) y aplica su guia para que la tarjeta tenga acabado de agencia (tipografia con jerarquia, profundidad, sombras suaves, acentos, espaciado). Mantener SIEMPRE: estetica oscura (`#0c1726`/`#16243a`) con acentos azul `#235a97` y dorado `#efa320`; el logo `../flyer/assets/logo.png`; y MUCHO detalle visual no repetitivo y de alto contraste, porque es ADEMAS el marcador AR (nada de grandes zonas planas uniformes ni patrones repetidos que confunden el tracking). Tras renderizar (Step 3), abrir el PNG, juzgar el nivel premium y la trackabilidad, e iterar el HTML hasta que quede de nivel agencia. El siguiente HTML es un PUNTO DE PARTIDA a elevar con la skill, NO el objetivo final:

```html
<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1000px;height:1400px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
  .card{position:relative;width:1000px;height:1400px;overflow:hidden;background:
    radial-gradient(circle at 22% 18%, rgba(35,90,151,.35), transparent 40%),
    radial-gradient(circle at 80% 82%, rgba(239,163,32,.22), transparent 42%),
    linear-gradient(160deg, #0c1726 0%, #16243a 55%, #0a1320 100%);color:#dfe8f5}
  .grid{position:absolute;inset:0;opacity:.20;
    background-image:linear-gradient(#3a5a86 1px,transparent 1px),linear-gradient(90deg,#3a5a86 1px,transparent 1px);
    background-size:64px 64px}
  .logo{position:absolute;top:120px;left:50%;transform:translateX(-50%);width:300px}
  .logo img{width:100%;display:block}
  .nodes{position:absolute;inset:0}
  .n{position:absolute;width:14px;height:14px;border-radius:50%;background:#efa320;box-shadow:0 0 18px #efa320}
  .b{position:absolute;height:2px;background:linear-gradient(90deg,#235a97,transparent);transform-origin:left center}
  .kicker{position:absolute;top:560px;left:0;right:0;text-align:center;letter-spacing:10px;font-size:24px;color:#7fa6d6;text-transform:uppercase}
  .title{position:absolute;top:610px;left:60px;right:60px;text-align:center;font-size:96px;font-weight:800;color:#fff;line-height:1}
  .sub{position:absolute;top:760px;left:120px;right:120px;text-align:center;font-size:26px;color:#9fb6d4}
  .corner{position:absolute;width:120px;height:120px;border:3px solid #efa320}
  .tl{top:50px;left:50px;border-right:none;border-bottom:none}
  .br{bottom:50px;right:50px;border-left:none;border-top:none}
  .hex{position:absolute;bottom:120px;left:50%;transform:translateX(-50%);font-size:22px;color:#6f8cb5;letter-spacing:4px}
</style></head><body>
<div class="card">
  <div class="grid"></div>
  <div class="corner tl"></div><div class="corner br"></div>
  <div class="nodes">
    <div class="n" style="top:300px;left:160px"></div>
    <div class="n" style="top:980px;left:820px"></div>
    <div class="n" style="top:1080px;left:230px"></div>
    <div class="n" style="top:380px;left:760px"></div>
    <div class="b" style="top:306px;left:174px;width:220px;transform:rotate(28deg)"></div>
    <div class="b" style="top:986px;left:600px;width:230px;transform:rotate(-18deg)"></div>
  </div>
  <div class="logo"><img src="../flyer/assets/logo.png" alt="iAcademia" /></div>
  <div class="kicker">Inteligencia Artificial</div>
  <div class="title">GENESIS</div>
  <div class="sub">Escanea, apunta y mira nacer la marca</div>
  <div class="hex">// iAcademia AR</div>
</div>
</body></html>
```

- [ ] **Step 2: Escribir `tools/render-card.mjs`** (mismo patron que `tools/render-flyer.mjs`)

```js
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1400 }, deviceScaleFactor: 2 });
await page.goto("file://" + process.cwd() + "/marker/card.html", { waitUntil: "networkidle" });
await page.screenshot({ path: "marker/card.png" });
await browser.close();
console.log("wrote marker/card.png");
```

- [ ] **Step 3: Renderizar y revisar**

Run: `cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && node tools/render-card.mjs`
Expected: `wrote marker/card.png`. Abrir `marker/card.png`: tarjeta oscura, logo arriba, titulo "GENESIS", rejilla/nodos visibles, esquinas doradas. Debe tener detalle asimetrico y contraste (no grandes zonas planas) para buen tracking. Si hay demasiada zona uniforme, reforzar nodos/rejilla y re-renderizar.

- [ ] **Step 4: Commit**

```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && git add marker/card.html tools/render-card.mjs marker/card.png && git commit -m "feat: tarjeta-marcador Genesis"
```

---

### Task 3: Compilar el marcador `genesis/assets/targets.mind`

**Files:**
- Create: `tools/compile-genesis-target.mjs`, `genesis/assets/targets.mind` (output)

**Interfaces:**
- Consumes: `marker/card.png`. Produces: `genesis/assets/targets.mind` (lo carga el Modulo 1).

- [ ] **Step 1: Escribir `tools/compile-genesis-target.mjs`** (adapta el patron de `tools/compile-target.mjs`: reutiliza `tools/compile.html` existente, cambia input y output)

```js
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

mkdirSync("genesis/assets", { recursive: true });
const img = readFileSync("marker/card.png");
const dataUrl = "data:image/png;base64," + img.toString("base64");

const browser = await chromium.launch({ headless: false }); // el compilador necesita WebGL real
const page = await browser.newPage();
page.setDefaultTimeout(300000);
page.on("console", (m) => console.log("[page]", m.text()));
await page.goto("file://" + process.cwd() + "/tools/compile.html", { waitUntil: "load" });
await page.waitForFunction('typeof window.compileFromDataUrl === "function"');
console.log("compilando marcador Genesis (1-3 min)...");
const b64 = await page.evaluate((d) => window.compileFromDataUrl(d), dataUrl);
const out = Buffer.from(b64, "base64");
writeFileSync("genesis/assets/targets.mind", out);
await browser.close();
console.log("wrote genesis/assets/targets.mind", out.length, "bytes");
```

- [ ] **Step 2: Compilar**

Run: `cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && node tools/compile-genesis-target.mjs`
Expected: `wrote genesis/assets/targets.mind <N> bytes` con N > 10000. `test -s genesis/assets/targets.mind` pasa. (Abre una ventana de Chromium ~1-3 min; es lo esperado.)

- [ ] **Step 3: Commit**

```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && git add tools/compile-genesis-target.mjs genesis/assets/targets.mind && git commit -m "feat: marcador compilado del Modulo 1 Genesis"
```

---

### Task 4: Modulo 1 "Ruptura + Genesis" (`genesis/index.html`)

**Files:**
- Create: `genesis/index.html`, `tools/verify-genesis.mjs`

**Interfaces:**
- Consumes: `../shared/premium.js`, `../assets/iacademia-isotipo.svg`, `./assets/targets.mind`.
- Produces: `window.__GEN = { ready, particles, error }`; un boton "Comenzar" arranca camara+AR; tocar la pantalla durante la experiencia REINICIA la linea de tiempo (para repetir tomas).

- [ ] **Step 1: Escribir `genesis/index.html`**

```html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<title>iAcademia Genesis</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:100%; height:100%; overflow:hidden; font-family: system-ui, -apple-system, sans-serif; background:#0a0f1a; }
  #ar { width:100vw; height:100vh; position:relative; }
  #start { position:absolute; left:50%; bottom:12%; transform:translateX(-50%); z-index:10;
    padding:16px 30px; font-size:18px; font-weight:600; color:#fff; background:#235a97;
    border:none; border-radius:999px; box-shadow:0 6px 22px rgba(0,0,0,.4); cursor:pointer; }
  #hint { position:absolute; left:50%; top:7%; transform:translateX(-50%); z-index:10; display:none;
    color:#cfe0f5; background:rgba(0,0,0,.5); padding:10px 18px; border-radius:999px; font-size:14px; }
  .error { position:absolute; inset:0; z-index:20; display:flex; align-items:center; justify-content:center;
    color:#fff; background:#0a0f1a; padding:28px; text-align:center; font-size:16px; line-height:1.5; }
</style>
</head>
<body>
<div id="ar"></div>
<button id="start">Comenzar</button>
<div id="hint">Apunta a la tarjeta. Toca para repetir.</div>
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/",
    "mindar-image-three": "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js"
  }
}
</script>
<script type="module">
import * as THREE from "three";
import { MindARThree } from "mindar-image-three";
import { addBrandLights, makeComposer, buildLogo, ParticleField } from "../shared/premium.js";

window.__GEN = { ready: false, particles: 0, error: null };
const PARTICLE_COUNT = 6000;

function showError(msg) {
  const d = document.createElement("div"); d.className = "error"; d.textContent = msg; document.body.appendChild(d);
}

async function main() {
  try {
    const mindarThree = new MindARThree({ container: document.querySelector("#ar"), imageTargetSrc: "./assets/targets.mind" });
    const { renderer, scene, camera } = mindarThree;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    addBrandLights(scene);
    const { composer } = makeComposer(renderer, scene, camera, { strength: 1.3, radius: 0.6, threshold: 0.0 });

    const anchor = mindarThree.addAnchor(0);
    const { pivot, surfacePoints } = await buildLogo("../assets/iacademia-isotipo.svg", { scaleToFit: 0.6 });
    const field = new ParticleField(surfacePoints(PARTICLE_COUNT), { spread: 1.4, size: 0.012 });
    pivot.position.set(0, 0, 0.2);
    pivot.visible = false;             // el solido aparece al final de la genesis
    field.points.position.set(0, 0, 0.2);
    anchor.group.add(field.points);
    anchor.group.add(pivot);

    // anillo de onda expansiva (ruptura)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x9fc4ff, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.08, 48), ringMat);
    ring.position.set(0, 0, 0.05);
    anchor.group.add(ring);

    window.__GEN.particles = field.count;
    window.__GEN.ready = true;

    const hint = document.getElementById("hint");
    anchor.onTargetFound = () => { hint.style.display = "block"; };
    anchor.onTargetLost = () => { hint.style.display = "none"; };

    // Linea de tiempo por reloj (segundos). Beats:
    // 0-1.2 ruptura (explode + anillo) | 1.2-2.8 swirl nube | 2.8-5.2 ensamblado | 5.2-7.5 cierre (solido+respira)
    let t0 = null;
    const clock = new THREE.Clock();
    function restart() { t0 = null; pivot.visible = false; pivot.scale.setScalar(0.6); }
    document.getElementById("ar").addEventListener("click", restart);

    function frame() {
      const dt = clock.getDelta();
      if (t0 === null) t0 = 0; else t0 += dt;
      const t = t0;
      if (t < 1.2) {                              // ruptura
        field.explode(t / 1.2);
        const rp = t / 1.2;
        ring.scale.setScalar(0.1 + rp * 6.0);
        ringMat.opacity = 0.6 * (1 - rp);
      } else if (t < 2.8) {                        // swirl
        field.explode(1);
        field.swirl(dt);
        ringMat.opacity = 0;
      } else if (t < 5.2) {                        // ensamblado
        const p = (t - 2.8) / 2.4;
        field.assemble(p);
        field.swirl(dt * (1 - p));
      } else {                                     // cierre: solido + respira
        field.assemble(1);
        pivot.visible = true;
        const b = 0.6 * (1 + 0.04 * Math.sin((t - 5.2) * 3.0));
        pivot.scale.setScalar(b);
        pivot.rotation.y += dt * 0.5;
        field.points.material.opacity = Math.max(0.25, 0.95 - (t - 5.2) * 0.4);
      }
      composer.render();
    }

    document.getElementById("start").addEventListener("click", async () => {
      try {
        document.getElementById("start").style.display = "none";
        await mindarThree.start();
        document.documentElement.style.background = "transparent";
        document.body.style.background = "transparent";
        renderer.setAnimationLoop(frame);
      } catch (e) { showError("No se pudo acceder a la camara. Revisa permisos y HTTPS."); }
    });
  } catch (e) {
    window.__GEN.error = String(e);
    showError("Error al iniciar: " + (e && e.message ? e.message : e));
  }
}
main();
</script>
</body>
</html>
```

- [ ] **Step 2: Escribir `tools/verify-genesis.mjs`**

```js
import { chromium } from "playwright";
import { spawn } from "node:child_process";
const srv = spawn("npx", ["--yes", "serve", "-l", "8093", "."], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ headless: false });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("http://localhost:8093/genesis/index.html", { waitUntil: "load" });
  await page.waitForFunction("window.__GEN && (window.__GEN.ready || window.__GEN.error)", { timeout: 20000 });
  const s = await page.evaluate(() => window.__GEN);
  console.log("GEN:", JSON.stringify(s), "errors:", JSON.stringify(errors));
  if (!s.ready) throw new Error("genesis no listo: " + s.error);
  if (s.particles < 1) throw new Error("sin particulas");
  if (errors.length) throw new Error("errores: " + errors.join(" | "));
  console.log("VERIFY GENESIS OK");
} finally { await browser.close(); srv.kill(); }
```

- [ ] **Step 3: Verificar carga headless**

Run: `cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && node tools/verify-genesis.mjs`
Expected: `GEN: {"ready":true,"particles":6000,...}` y `VERIFY GENESIS OK`, sin errores. (No llama a start(): no necesita camara ni target.)

- [ ] **Step 4: Captura visual del ensamblado (juicio del controlador)**

Crear un check rapido que fuerza el reloj para ver un fotograma ya ensamblado. Run:
```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && node -e "import('playwright').then(async({chromium})=>{const {spawn}=await import('node:child_process');const srv=spawn('npx',['--yes','serve','-l','8094','.'],{stdio:'ignore'});await new Promise(r=>setTimeout(r,2500));const b=await chromium.launch({headless:false});const p=await b.newPage({viewport:{width:390,height:844}});await p.goto('http://localhost:8094/genesis/index.html');await p.waitForFunction('window.__GEN&&window.__GEN.ready');await p.evaluate(()=>{document.body.style.background='#0a0f1a';});await p.screenshot({path:'/tmp/genesis-idle.png'});await b.close();srv.kill();console.log('shot /tmp/genesis-idle.png');})"
```
Abrir `/tmp/genesis-idle.png` y confirmar que se ve la nube de particulas/logo con glow (no pantalla negra ni error). La validacion fina del movimiento es en el rodaje. Si el bloom es excesivo o flojo, ajustar `strength/radius` en `makeComposer` y los tiempos del timeline, y repetir.

- [ ] **Step 5: Commit**

```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && git add genesis/index.html tools/verify-genesis.mjs && git commit -m "feat: Modulo 1 Genesis (ruptura + ensamblado de particulas)"
```

---

### Task 5: Modulo 2 "En tus manos" (`manos/index.html`)

**Files:**
- Create: `manos/index.html`, `tools/verify-manos.mjs`

**Interfaces:**
- Consumes: `../shared/premium.js`, `../assets/iacademia-isotipo.svg`, MediaPipe tasks-vision (CDN).
- Produces: `window.__MANOS = { ready, handLandmarkerLoaded, error }`; boton "Comenzar" arranca camara + deteccion de manos.

- [ ] **Step 1: Escribir `manos/index.html`**

```html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<title>iAcademia en tus manos</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:100%; height:100%; overflow:hidden; background:#0a0f1a; font-family: system-ui, sans-serif; }
  #wrap { position:fixed; inset:0; }
  #cam { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transform:scaleX(1); }
  #gl { position:absolute; inset:0; width:100%; height:100%; }
  #start { position:absolute; left:50%; bottom:12%; transform:translateX(-50%); z-index:10;
    padding:16px 30px; font-size:18px; font-weight:600; color:#fff; background:#235a97; border:none; border-radius:999px; box-shadow:0 6px 22px rgba(0,0,0,.4); }
  #hint { position:absolute; left:50%; top:7%; transform:translateX(-50%); z-index:10; display:none; color:#cfe0f5; background:rgba(0,0,0,.5); padding:10px 18px; border-radius:999px; font-size:14px; }
  .error { position:absolute; inset:0; z-index:20; display:flex; align-items:center; justify-content:center; color:#fff; background:#0a0f1a; padding:28px; text-align:center; }
</style>
</head>
<body>
<div id="wrap">
  <video id="cam" autoplay muted playsinline></video>
  <canvas id="gl"></canvas>
</div>
<button id="start">Comenzar</button>
<div id="hint">Muestra la palma abierta</div>
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/",
    "tasks-vision": "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18"
  }
}
</script>
<script type="module">
import * as THREE from "three";
import { HandLandmarker, FilesetResolver } from "tasks-vision";
import { addBrandLights, makeComposer, buildLogo } from "../shared/premium.js";

window.__MANOS = { ready: false, handLandmarkerLoaded: false, error: null };
const MIRROR = false; // poner true si se graba con camara frontal en modo espejo

function showError(m){ const d=document.createElement("div"); d.className="error"; d.textContent=m; document.body.appendChild(d); }

let handLandmarker = null;
async function loadHands() {
  const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm");
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", delegate: "GPU" },
    runningMode: "VIDEO", numHands: 1,
  });
  window.__MANOS.handLandmarkerLoaded = true;
}

async function main() {
  try {
    const canvas = document.getElementById("gl");
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.01, 100);
    camera.position.set(0, 0, 0); // camara en el origen mirando -z
    addBrandLights(scene);
    const { composer } = makeComposer(renderer, scene, camera, { strength: 1.2, radius: 0.6 });

    const { pivot } = await buildLogo("../assets/iacademia-isotipo.svg", { scaleToFit: 1.0 });
    pivot.visible = false; scene.add(pivot);

    await loadHands();
    window.__MANOS.ready = true;

    const video = document.getElementById("cam");
    const hint = document.getElementById("hint");

    // landmarks: 0 muneca, 9 MCP medio, puntas 4/8/12/16/20, MCP 5/9/13/17
    function palmInfo(lm) {
      const idx = [0, 5, 9, 13, 17];
      let cx=0, cy=0; for (const i of idx){ cx+=lm[i].x; cy+=lm[i].y; } cx/=idx.length; cy/=idx.length;
      const span = Math.hypot(lm[0].x-lm[9].x, lm[0].y-lm[9].y);
      // apertura: media de distancias yema-muneca normalizada por span
      const tips=[8,12,16,20]; let open=0; for(const i of tips){ open+=Math.hypot(lm[i].x-lm[0].x, lm[i].y-lm[0].y); }
      open=(open/tips.length)/(span||1);
      return { cx, cy, span, open };
    }

    function place(lm) {
      const { cx, cy, span, open } = palmInfo(lm);
      const nx = (MIRROR ? 1 - cx : cx) * 2 - 1;
      const ny = -(cy * 2 - 1);
      const v = new THREE.Vector3(nx, ny, 0.5).unproject(camera);
      const dir = v.sub(camera.position).normalize();
      const dist = 2.2;
      pivot.position.copy(camera.position).add(dir.multiplyScalar(dist));
      const baseScale = THREE.MathUtils.clamp(span * 6.0, 0.4, 2.2);
      const openK = THREE.MathUtils.clamp((open - 1.2) / 0.9, 0.15, 1.0); // puno ~1.2, abierta ~2.1
      pivot.scale.setScalar(baseScale * openK);
      pivot.visible = true;
    }

    function frame() {
      if (video.readyState >= 2 && handLandmarker) {
        const res = handLandmarker.detectForVideo(video, performance.now());
        if (res.landmarks && res.landmarks.length) { place(res.landmarks[0]); hint.style.display="none"; }
        else { pivot.visible = false; hint.style.display="block"; }
      }
      if (pivot.visible) pivot.rotation.y += 0.02;
      composer.render();
      requestAnimationFrame(frame);
    }

    document.getElementById("start").addEventListener("click", async () => {
      try {
        document.getElementById("start").style.display = "none";
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        video.srcObject = stream;
        await video.play();
        hint.style.display = "block";
        requestAnimationFrame(frame);
      } catch (e) { showError("No se pudo acceder a la camara. Revisa permisos y HTTPS."); }
    });
  } catch (e) {
    window.__MANOS.error = String(e);
    showError("Error al iniciar: " + (e && e.message ? e.message : e));
  }
}
main();
</script>
</body>
</html>
```

- [ ] **Step 2: Escribir `tools/verify-manos.mjs`** (verifica que el modelo y la escena cargan; sin mano)

```js
import { chromium } from "playwright";
import { spawn } from "node:child_process";
const srv = spawn("npx", ["--yes", "serve", "-l", "8095", "."], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ headless: false });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("http://localhost:8095/manos/index.html", { waitUntil: "load" });
  await page.waitForFunction("window.__MANOS && (window.__MANOS.ready || window.__MANOS.error)", { timeout: 40000 });
  const s = await page.evaluate(() => window.__MANOS);
  console.log("MANOS:", JSON.stringify(s), "errors:", JSON.stringify(errors));
  if (!s.ready) throw new Error("manos no listo: " + s.error);
  if (!s.handLandmarkerLoaded) throw new Error("HandLandmarker no cargo");
  // Filtrar errores no criticos de WebGL/wasm warnings:
  const crit = errors.filter((e) => !/deprecat|GroupMarker|GL_/i.test(e));
  if (crit.length) throw new Error("errores: " + crit.join(" | "));
  console.log("VERIFY MANOS OK");
} finally { await browser.close(); srv.kill(); }
```

- [ ] **Step 3: Verificar carga headless**

Run: `cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && node tools/verify-manos.mjs`
Expected: `MANOS: {"ready":true,"handLandmarkerLoaded":true,...}` y `VERIFY MANOS OK`. (El modelo se descarga de Google; puede tardar, por eso timeout 40s.) Si `HandLandmarker` no carga, revisar la version pin de tasks-vision y la URL del wasm.

- [ ] **Step 4: Captura visual con mano simulada (opcional pero recomendado)**

La camara simulada de Chromium NO produce una mano reconocible, asi que el reconocimiento real se valida en el rodaje. Verificacion minima del render: que la pagina no muestre error y el canvas exista. Run:
```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && node -e "import('playwright').then(async({chromium})=>{const {spawn}=await import('node:child_process');const srv=spawn('npx',['--yes','serve','-l','8096','.'],{stdio:'ignore'});await new Promise(r=>setTimeout(r,2500));const b=await chromium.launch({headless:false,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});const c=await b.newContext({permissions:['camera']});const p=await c.newPage({viewport:{width:390,height:844}});await p.goto('http://localhost:8096/manos/index.html');await p.waitForFunction('window.__MANOS&&window.__MANOS.ready');await p.click('#start').catch(()=>{});await p.waitForTimeout(4000);const err=await p.evaluate(()=>!!document.querySelector('.error'));console.log('error overlay?',err);await b.close();srv.kill();})"
```
Expected: `error overlay? false` (camara aceptada, sin pantalla de error). El "logo en la palma" se valida grabando con una mano real; documentar al usuario que el ajuste fino (escala/posicion/umbral de apertura `open`) se hace en el rodaje tocando las constantes `dist`, `baseScale`, `openK` en `manos/index.html`.

- [ ] **Step 5: Commit**

```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && git add manos/index.html tools/verify-manos.mjs && git commit -m "feat: Modulo 2 en tus manos (HandLandmarker + logo en la palma)"
```

---

### Task 6: Guia de rodaje + montaje

**Files:**
- Create: `docs/superpowers/GUIA-RODAJE-GENESIS.md`

- [ ] **Step 1: Escribir la guia**

```markdown
# Guia de rodaje y montaje: reel "GENESIS"

Reel vertical 9:16 (~12-15s) en 3 actos: Ruptura -> Genesis -> En tus manos.
Se graban DOS modulos por separado y se unen en edicion.

## Antes de grabar
- Movil reciente. Android Chrome es lo mas fiable; iOS Safari funciona, probar antes.
- Buena luz, fondo neutro y oscuro si se puede (el glow luce mas).
- Imprime la tarjeta `marker/card.png` (A5/A6, mate). Tenla a mano.
- Graba en vertical. Limpia la lente.

## Modulo 1 (Ruptura + Genesis): https://mps136.github.io/ar-flyer-demo/genesis/
1. Abre el enlace, pulsa Comenzar, acepta camara.
2. Encuadra la tarjeta centrada. Cuando aparezca el efecto, manten el pulso firme.
3. La secuencia dura ~7s: ruptura -> nube -> ensamblado -> logo que respira.
4. Toca la pantalla para repetir y graba varias tomas. Quedate con la mejor (idealmente termina con el logo ya formado).

## Modulo 2 (En tus manos): https://mps136.github.io/ar-flyer-demo/manos/
1. Abre el enlace, pulsa Comenzar, acepta camara.
2. Muestra la palma abierta en el encuadre. El hexagono se posa sobre la mano.
3. Juega: abre/cierra la mano, inclinala, acercala a camara.
4. Graba varias tomas. Quedate con la mas estable y expresiva.

## Montaje (CapCut / Premiere / lo que uses)
1. Pon la toma del Modulo 1 primero; corta justo cuando el logo esta formado y "despega".
2. Enlaza con la toma del Modulo 2 usando una transicion de destello/whip-pan/estallido (tapa el salto).
3. Musica: electronica/cinematica con un "drop" en el momento del ensamblado del logo.
4. Sonido: whoosh en la ruptura, shimmer/glitch en la genesis, golpe grave en el cierre.
5. Cierre: tarjeta de marca o el logo a pantalla completa 1-2s.
6. Exporta 1080x1920, 9:16.

## Ajustes si algo no sale
- Modulo 1: si el tracking baila, mas luz y tarjeta plana sin reflejos. Si el bloom satura, se baja en el codigo (makeComposer strength).
- Modulo 2: si el logo no cuadra en la palma, se ajustan en manos/index.html las constantes dist (distancia), baseScale (tamano) y el umbral de apertura openK.
```

- [ ] **Step 2: Commit**

```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && git add docs/superpowers/GUIA-RODAJE-GENESIS.md && git commit -m "docs: guia de rodaje y montaje del reel Genesis"
```

---

### Task 7: Despliegue + verificacion en vivo + captura de muestra

**Files:** ninguno nuevo (push + verificacion).

- [ ] **Step 1: Push**

Run: `cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && git push`
Expected: push correcto a `main`.

- [ ] **Step 2: Esperar Pages y verificar 200**

Run:
```bash
sleep 60 && for u in genesis/ manos/ shared/premium.js genesis/assets/targets.mind; do echo -n "$u -> "; curl -s -o /dev/null -w "%{http_code}\n" "https://mps136.github.io/ar-flyer-demo/$u"; done
```
Expected: los cuatro responden `200`. Si alguno da 404, esperar 1-2 min y reintentar (primer deploy).

- [ ] **Step 3: Verificacion en vivo (carga de escena, sin camara) de ambos modulos**

Run:
```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && node -e "import('playwright').then(async({chromium})=>{const b=await chromium.launch({headless:false});for(const [u,flag] of [['genesis','__GEN'],['manos','__MANOS']]){const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));await p.goto('https://mps136.github.io/ar-flyer-demo/'+u+'/',{waitUntil:'load'});await p.waitForFunction('window.'+flag+'&&(window.'+flag+'.ready||window.'+flag+'.error)',{timeout:40000});const s=await p.evaluate(f=>window[f],flag);console.log(u,JSON.stringify(s),'pageerrors',errs.length);await p.close();}await b.close();})"
```
Expected: `genesis {"ready":true,...}` y `manos {"ready":true,"handLandmarkerLoaded":true,...}` sin pageerrors. Esto confirma que en produccion cargan three, mind-ar, el kit, el SVG y (en manos) el modelo de MediaPipe.

- [ ] **Step 4: Captura de muestra del Modulo 1 para el usuario**

Run:
```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && node -e "import('playwright').then(async({chromium})=>{const b=await chromium.launch({headless:false});const p=await b.newPage({viewport:{width:390,height:844}});await p.goto('https://mps136.github.io/ar-flyer-demo/genesis/');await p.waitForFunction('window.__GEN&&window.__GEN.ready');await p.evaluate(()=>{document.body.style.background='#0a0f1a'});await p.screenshot({path:'/tmp/genesis-live.png'});await b.close();console.log('shot /tmp/genesis-live.png');})"
```
Then: abrir `/tmp/genesis-live.png` para confirmar que el efecto se ve (nube/logo con glow). Reportar al usuario que la validacion real (movimiento + AR sobre la tarjeta/mano) la hace grabando con el movil, segun la guia.

- [ ] **Step 5: Validacion en dispositivo (manual, del usuario)**

Documentar al usuario los enlaces y los pasos de la guia. NO afirmar que el reel funciona en movil hasta que el usuario lo confirme. Modulo 2 (palma) puede necesitar ajuste de constantes tras la primera prueba real.

---

### Task 8: Cierre (memoria)

- [ ] **Step 1: Actualizar memoria**

Editar `/Users/malenaps/.claude/projects/-Users-malenaps/memory/ar-flyer-webar-demo.md`: anadir que el repo ahora incluye el reel "GENESIS" (Modulo 1 `/genesis/` ruptura+genesis sobre marcador, Modulo 2 `/manos/` HandLandmarker), kit compartido `shared/premium.js`, guia de rodaje, y los gotchas nuevos (MediaPipe tasks-vision 0.10.18; verificaciones corren Chromium no-headless por WebGL; ajuste de palma por constantes dist/baseScale/openK). Actualizar la linea en `MEMORY.md`.

---

## Self-Review

**1. Spec coverage** (contra `2026-06-25-genesis-ar-reel-design.md`):
- Narrativa 3 actos (ruptura/genesis/en tus manos): Tasks 4 (actos 1-2) y 5 (acto 3). OK
- Dos modulos independientes + montaje editado: Tasks 4, 5, 6. OK
- Kit premium compartido (bloom, materiales, particulas, ensamblado por MeshSurfaceSampler): Task 1. OK
- Tarjeta-marcador + compilacion: Tasks 2, 3. OK
- Estetica oscura/cinematografica + glow: bloom en kit + fondos oscuros en paginas. OK
- Gotcha camara (fondo transparente al arrancar): aplicado en Task 4 (genesis) y Task 5 usa video propio + canvas (no aplica el z-index -2 de MindAR; el video es elemento propio detras del canvas). OK
- Guia de rodaje + montaje: Task 6. OK
- Hosting en el repo existente, subrutas /genesis/ y /manos/, sin romper el demo: Tasks 4,5,7. OK
- Reutiliza logo SVG existente: Tasks 1,4,5 via `../assets/iacademia-isotipo.svg`. OK
- Orden recomendado (kit -> M1 -> M2 -> guia -> deploy): refleja el orden de tasks. OK
- Fuera de alcance (relevo en vivo, CTA, audio in-AR): respetado. OK

**2. Placeholder scan:** Sin TBD/TODO. Los pasos de ajuste visual (Task 4 Step 4, Task 5 Step 4) dan codigo que SI corre y nombran exactamente las constantes a tocar (strength/radius, dist/baseScale/openK); no son placeholders sino afinado esperado en trabajo grafico.

**3. Type/interface consistency:**
- `buildLogo(svgUrl, opts) -> { pivot, surfacePoints(count) }`: definido en Task 1, consumido igual en `_kit-harness`, Task 4 y Task 5. OK
- `makeComposer(...) -> { composer, bloom }` y `composer.render()`: usado en kit, M1 y M2. OK
- `ParticleField(targetPositions, opts)` con `.points/.explode(p)/.assemble(p)/.swirl(dt)/.count`: definido en Task 1, usado en M1 (Task 4). OK
- `window.__GEN`/`window.__MANOS`/`window.__KIT` con `{ready,...,error}`: definidos en sus paginas y leidos por sus verify-*.mjs. OK
- Colores `#235a97`/`#efa320` consistentes (kit detecta dorado por igualdad). OK
- Rutas relativas desde subcarpetas (`../shared/premium.js`, `../assets/...`, `../flyer/assets/logo.png` en la tarjeta): coherentes con la estructura. OK

> Recordatorio de ejecucion: vigilar que ningun bloque pegado cuele caracteres no-ASCII (em-dashes, comillas tipograficas) en CSS/JS; todo en ASCII salvo acentos en textos visibles en espanol.
```
