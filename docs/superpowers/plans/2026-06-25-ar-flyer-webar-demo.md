# Demo WebAR flyer + isotipo iAcademia 3D - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una página WebAR estática que, al apuntar el móvil a un flyer impreso (vía QR), muestra el isotipo de iAcademia en 3D girando anclado al papel, sin app y sin servicios de pago.

**Architecture:** Sitio estático en GitHub Pages. `index.html` carga MindAR (seguimiento de imagen) + Three.js desde CDN, reconstruye el isotipo como SVG vectorial limpio, lo extruye a 3D y lo ancla al marcador del flyer. Las piezas auxiliares (SVG del logo, QR, flyer PNG, marcador `.mind`) se generan con scripts de Node que se apoyan en Playwright/MindAR cuando hace falta un navegador.

**Tech Stack:** HTML/JS (ES modules), three@0.160.0, mind-ar@1.2.5 (ambos por CDN), Node 25 + Playwright (devDep) para render/compilación, qrcode (devDep) para el QR. GitHub Pages para hosting. gh CLI (cuenta MPS136) para crear el repo.

## Global Constraints

- **Sin em-dashes** (U+2014) en código, textos ni commits. Usar punto, dos puntos, coma o paréntesis.
- **Versiones fijadas:** three `0.160.0`, mind-ar `1.2.5` (combinación documentada compatible). No cambiar sin verificar.
- **HTTPS o localhost obligatorio:** `getUserMedia` (cámara) solo funciona en contexto seguro. Local = `localhost`; producción = GitHub Pages (HTTPS).
- **Repo público, sin secretos:** es un demo, no contiene claves ni datos. Pages gratis requiere repo público.
- **Colores de marca (sólidos para el 3D):** azul `#235a97`, azul oscuro `#1b3f6b`, dorado `#efa320`.
- **Sin instalar herramientas de sistema** (brew/etc.). Todo con paquetes npm del proyecto.
- **Directorio del proyecto:** `/Users/malenaps/GitHub_IAcademia/ar-flyer-demo`.
- **Cuenta gh / owner Pages:** `MPS136` -> URL Pages `https://mps136.github.io/ar-flyer-demo/` (host en minúsculas; confirmar valor exacto en Task 2).
- **Fuente del logo real (para el flyer impreso):** `/Users/malenaps/GitHub_IAcademia/iacademia-hub/identidad/Logos IAcademia/Logo IAcademia fondo trasparante.png` (símbolo + wordmark). El isotipo solo está en `/Users/malenaps/GitHub_IAcademia/app-interna-iacademia/client/public/logo-isotipo.png`.

> **Nota sobre TDD:** este demo es WebAR visual; no admite TDD clásico de rojo-verde. La verificación automatizable es: que los scripts produzcan los artefactos esperados, y que `index.html` cargue en headless (Playwright) sin errores y con la malla del logo en la escena. La validación final del AR (reconocer el flyer y ver el 3D) es **manual** (imprimir y escanear, o apuntar a la pantalla). Cada task indica su verificación real.

## File Structure

```
ar-flyer-demo/
  index.html                  Experiencia AR (MindAR + Three, logo extruido, giro)
  package.json                Scripts + devDeps (playwright, qrcode)
  .gitignore                  node_modules, .DS_Store
  README.md                   Cómo probar (imprimir/escanear/pantalla) + cómo regenerar
  assets/
    iacademia-isotipo.svg     Isotipo reconstruido (2 colores) para extruir
    targets.mind              Marcador compilado del flyer (Task 6)
    source/logo-isotipo.png   Copia del isotipo original (referencia visual)
  flyer/
    flyer.html                Maqueta del flyer (logo + wordmark + QR + textura)
    flyer.png                 Flyer imprimible renderizado (Task 5)
    assets/
      logo.png                Logo completo real para el flyer impreso
      qr.png                  QR a la URL de Pages
  tools/
    make-isotipo-svg.mjs      Genera assets/iacademia-isotipo.svg
    make-qr.mjs               Genera flyer/assets/qr.png desde una URL
    render-flyer.mjs          Renderiza flyer/flyer.html -> flyer/flyer.png (Playwright)
    compile.html              Página que usa el Compiler de MindAR (UMD)
    compile-target.mjs        Conduce compile.html y escribe assets/targets.mind (Playwright)
    verify-scene.mjs          Carga index.html en headless y comprueba la escena (Playwright)
  docs/superpowers/plans/2026-06-25-ar-flyer-webar-demo.md
```

---

### Task 1: Scaffold del proyecto + servidor local + smoke

**Files:**
- Create: `package.json`, `.gitignore`, `index.html` (placeholder mínimo), `README.md` (placeholder)
- Create dir: `assets/`, `assets/source/`, `flyer/assets/`, `tools/`

**Interfaces:**
- Produces: estructura de carpetas y `package.json` con scripts `serve`, `isotipo`, `qr`, `flyer`, `compile`, `verify` que las tasks siguientes usan.

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "ar-flyer-demo",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Demo WebAR: flyer impreso + QR -> isotipo iAcademia en 3D girando",
  "scripts": {
    "serve": "npx --yes serve -l 8080 .",
    "isotipo": "node tools/make-isotipo-svg.mjs",
    "qr": "node tools/make-qr.mjs",
    "flyer": "node tools/render-flyer.mjs",
    "compile": "node tools/compile-target.mjs",
    "verify": "node tools/verify-scene.mjs"
  },
  "devDependencies": {
    "playwright": "^1.49.0",
    "qrcode": "^1.5.4"
  }
}
```

- [ ] **Step 2: Crear `.gitignore`**

```
node_modules/
.DS_Store
*.log
```

- [ ] **Step 3: Crear `index.html` placeholder**

```html
<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>iAcademia AR</title></head>
<body><p>AR demo (placeholder)</p></body>
</html>
```

- [ ] **Step 4: Crear `README.md` placeholder**

```markdown
# iAcademia AR flyer demo

Demo WebAR. Instrucciones completas al final del plan (se rellenan en Task 7).
```

- [ ] **Step 5: Instalar devDeps y el navegador de Playwright**

Run:
```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && npm install && npx playwright install chromium
```
Expected: instala `playwright` y `qrcode`, descarga Chromium sin errores.

- [ ] **Step 6: Verificar que el servidor local sirve la página**

Run:
```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && (npx --yes serve -l 8080 . >/tmp/arserve.log 2>&1 &) && sleep 2 && curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/ ; pkill -f "serve -l 8080" || true
```
Expected: imprime `200`.

- [ ] **Step 7: Inicializar git y primer commit**

Run:
```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && git init && git add package.json .gitignore index.html README.md docs && git commit -m "chore: scaffold ar-flyer-demo"
```
Expected: commit creado. (No añadir `node_modules`, lo cubre `.gitignore`.)

---

### Task 2: Repo en GitHub + GitHub Pages (capturar URL)

**Files:** ninguno (operación de infraestructura).

**Interfaces:**
- Produces: `PAGES_URL` = URL pública del sitio (la consumen Task 5 para el QR y Task 7 para verificar). Formato esperado: `https://mps136.github.io/ar-flyer-demo/`.

- [ ] **Step 1: Crear el repo público y subir**

Run:
```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && gh repo create ar-flyer-demo --public --source=. --remote=origin --push
```
Expected: repo creado en `MPS136/ar-flyer-demo` y push de `main` correcto.

- [ ] **Step 2: Activar GitHub Pages (rama main, raíz)**

Run:
```bash
gh api -X POST repos/MPS136/ar-flyer-demo/pages -f 'source[branch]=main' -f 'source[path]=/' || gh api -X PUT repos/MPS136/ar-flyer-demo/pages -f 'source[branch]=main' -f 'source[path]=/'
```
Expected: respuesta JSON con la config de Pages (o 409 si ya existía, que el `||` resuelve con PUT).

- [ ] **Step 3: Capturar la URL exacta de Pages**

Run:
```bash
gh api repos/MPS136/ar-flyer-demo/pages --jq .html_url
```
Expected: imprime la URL (p. ej. `https://mps136.github.io/ar-flyer-demo/`). **Anotar este valor como `PAGES_URL`** para Task 5. Si el primer deploy aún no terminó puede tardar 1-2 min; la URL es estable aunque el contenido tarde.

---

### Task 3: Generar el isotipo en SVG (reconstrucción geométrica) + revisión visual

**Files:**
- Create: `tools/make-isotipo-svg.mjs`, `assets/iacademia-isotipo.svg` (output)
- Create: `assets/source/logo-isotipo.png` (copia de referencia)

**Interfaces:**
- Produces: `assets/iacademia-isotipo.svg` con exactamente dos `fill`: `#235a97` (anillo hexagonal, con `fill-rule="evenodd"` para el hueco) y `#efa320` (acento). `index.html` (Task 4) detecta el color por el `fill` exacto.

- [ ] **Step 1: Copiar el isotipo original como referencia**

Run:
```bash
cp "/Users/malenaps/GitHub_IAcademia/app-interna-iacademia/client/public/logo-isotipo.png" /Users/malenaps/GitHub_IAcademia/ar-flyer-demo/assets/source/logo-isotipo.png
```

- [ ] **Step 2: Escribir el generador `tools/make-isotipo-svg.mjs`**

```js
import { writeFileSync } from "node:fs";

// Lienzo 512x512. Anillo hexagonal (outer - inner) + acento dorado a la derecha.
const cx = 256, cy = 256;
const R = 200;   // radio exterior
const r = 132;   // radio interior (grosor del anillo = R - r)
const rot = Math.PI / 6; // orientacion; ajustar en Step 4 si hace falta

const hex = (radius) => {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = rot + i * (Math.PI / 3);
    pts.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)]);
  }
  return pts;
};
const toPath = (pts) =>
  "M" + pts.map((p) => p[0].toFixed(2) + "," + p[1].toFixed(2)).join(" L") + " Z";

const outer = hex(R);
const inner = hex(r).reverse(); // sentido inverso => hueco con evenodd
const ringPath = toPath(outer) + " " + toPath(inner);

// Trapecio dorado en el lateral derecho, a la altura del centro.
const gold =
  `M ${(cx + R * 0.90).toFixed(2)},${(cy - 72).toFixed(2)} ` +
  `L ${(cx + R * 1.16).toFixed(2)},${(cy - 54).toFixed(2)} ` +
  `L ${(cx + R * 1.16).toFixed(2)},${(cy + 54).toFixed(2)} ` +
  `L ${(cx + R * 0.90).toFixed(2)},${(cy + 72).toFixed(2)} Z`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 512">
  <path d="${ringPath}" fill="#235a97" fill-rule="evenodd"/>
  <path d="${gold}" fill="#efa320"/>
</svg>
`;

writeFileSync(new URL("../assets/iacademia-isotipo.svg", import.meta.url), svg);
console.log("wrote assets/iacademia-isotipo.svg");
```

- [ ] **Step 3: Ejecutar el generador**

Run:
```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && node tools/make-isotipo-svg.mjs
```
Expected: `wrote assets/iacademia-isotipo.svg` y el fichero existe (`test -f assets/iacademia-isotipo.svg`).

- [ ] **Step 4: Revisión visual del SVG (rasterizar con Playwright) y comparar con el original**

Run:
```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && node -e "import('playwright').then(async ({chromium})=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:560,height:512}});await p.goto('file://'+process.cwd()+'/assets/iacademia-isotipo.svg');await p.screenshot({path:'/tmp/isotipo-check.png'});await b.close();console.log('ok');})"
```
Then: abrir `/tmp/isotipo-check.png` y `assets/source/logo-isotipo.png` y comparar. Debe leerse como un hexágono anular azul con acento dorado a la derecha.
Si la orientación o proporción no convencen, ajustar `rot`, `R`, `r` o las coords del trapecio en el generador y repetir Steps 3-4. (El parecido no tiene que ser pixel-perfect: es una reconstrucción limpia de la marca, que extruye mejor en 3D.)

- [ ] **Step 5: Commit**

```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && git add tools/make-isotipo-svg.mjs assets/iacademia-isotipo.svg assets/source/logo-isotipo.png && git commit -m "feat: generador del isotipo iacademia en SVG para extrusion 3D"
```

---

### Task 4: Escena AR (`index.html`) + verificación headless

**Files:**
- Modify: `index.html` (reemplaza el placeholder por la escena completa)
- Create: `tools/verify-scene.mjs`

**Interfaces:**
- Consumes: `assets/iacademia-isotipo.svg` (Task 3). Referencia `./assets/targets.mind` (lo produce Task 6; NO se carga hasta pulsar "Comenzar", así que la verificación headless funciona sin él).
- Produces: `window.__AR = { ready:boolean, logoMeshes:number, error:string|null }` para que `verify-scene.mjs` lo compruebe.

- [ ] **Step 1: Escribir `index.html` completo**

```html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<title>iAcademia AR</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:100%; height:100%; overflow:hidden; font-family: system-ui, -apple-system, sans-serif; background:#1b3f6b; }
  #ar { width:100vw; height:100vh; position:relative; }
  #start { position:absolute; left:50%; bottom:12%; transform:translateX(-50%); z-index:10;
    padding:16px 30px; font-size:18px; font-weight:600; color:#fff; background:#235a97;
    border:none; border-radius:999px; box-shadow:0 6px 22px rgba(0,0,0,.35); cursor:pointer; }
  #hint { position:absolute; left:50%; top:7%; transform:translateX(-50%); z-index:10; display:none;
    color:#fff; background:rgba(0,0,0,.55); padding:10px 18px; border-radius:999px; font-size:15px; }
  .error { position:absolute; inset:0; z-index:20; display:flex; align-items:center; justify-content:center;
    color:#fff; background:#1b3f6b; padding:28px; text-align:center; font-size:16px; line-height:1.5; }
</style>
</head>
<body>
<div id="ar"></div>
<button id="start">Comenzar</button>
<div id="hint">Apunta la camara al flyer</div>
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
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";

window.__AR = { ready: false, logoMeshes: 0, error: null };

const GOLD = "#efa320";

function showError(msg) {
  const d = document.createElement("div");
  d.className = "error";
  d.textContent = msg;
  document.body.appendChild(d);
}

async function buildLogo() {
  const res = await fetch("./assets/iacademia-isotipo.svg");
  const text = await res.text();
  const data = new SVGLoader().parse(text);

  const group = new THREE.Group();
  for (const path of data.paths) {
    const fill = (path.userData && path.userData.style && path.userData.style.fill || "#235a97").toLowerCase();
    const color = fill === GOLD ? GOLD : "#235a97";
    const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.35 });
    for (const shape of SVGLoader.createShapes(path)) {
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 18, bevelEnabled: true, bevelThickness: 2.5, bevelSize: 2, bevelSegments: 3, curveSegments: 24,
      });
      group.add(new THREE.Mesh(geo, mat));
    }
  }

  // SVG usa Y hacia abajo: invertir Y, centrar y escalar para que quepa sobre el marcador.
  group.scale.y *= -1;
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  group.children.forEach((m) => m.position.sub(center));
  const fit = 0.6 / Math.max(size.x, size.y);

  const pivot = new THREE.Group();
  pivot.add(group);
  pivot.scale.setScalar(fit);

  window.__AR.logoMeshes = group.children.length;
  return pivot;
}

async function main() {
  try {
    const mindarThree = new MindARThree({
      container: document.querySelector("#ar"),
      imageTargetSrc: "./assets/targets.mind",
    });
    const { renderer, scene, camera } = mindarThree;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x556688, 1.1));
    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(1, 1, 2);
    scene.add(dir);

    const anchor = mindarThree.addAnchor(0);
    const logo = await buildLogo();
    logo.position.set(0, 0, 0.15);
    anchor.group.add(logo);

    const hint = document.getElementById("hint");
    anchor.onTargetFound = () => { hint.style.display = "none"; };
    anchor.onTargetLost = () => { hint.style.display = "block"; };

    window.__AR.ready = true;

    document.getElementById("start").addEventListener("click", async () => {
      try {
        document.getElementById("start").style.display = "none";
        hint.style.display = "block";
        await mindarThree.start();
        renderer.setAnimationLoop(() => {
          logo.rotation.y += 0.02;
          renderer.render(scene, camera);
        });
      } catch (e) {
        showError("No se pudo acceder a la camara. Revisa los permisos y que estes en HTTPS.");
      }
    });
  } catch (e) {
    window.__AR.error = String(e);
    showError("Error al iniciar AR: " + (e && e.message ? e.message : e));
  }
}
main();
</script>
</body>
</html>
```

- [ ] **Step 2: Escribir `tools/verify-scene.mjs`**

```js
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

// Servir por http para que el importmap/ESM y fetch del SVG funcionen.
const { spawn } = await import("node:child_process");
const srv = spawn("npx", ["--yes", "serve", "-l", "8090", "."], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));

try {
  await page.goto("http://localhost:8090/index.html", { waitUntil: "load" });
  await page.waitForFunction("window.__AR && (window.__AR.ready || window.__AR.error)", { timeout: 20000 });
  const state = await page.evaluate(() => window.__AR);
  console.log("AR state:", JSON.stringify(state));
  console.log("console errors:", JSON.stringify(errors));
  if (!state.ready) throw new Error("escena no lista: " + state.error);
  if (state.logoMeshes < 1) throw new Error("no se construyo la malla del logo");
  console.log("VERIFY OK");
} finally {
  await browser.close();
  srv.kill();
}
```

- [ ] **Step 3: Ejecutar la verificación headless**

Run:
```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && node tools/verify-scene.mjs
```
Expected: imprime `AR state: {"ready":true,"logoMeshes":...}` con `logoMeshes >= 1` y `VERIFY OK`. No debe haber errores de carga de módulos. (Nota: la verificación no llama a `start()`, así que no necesita cámara ni `targets.mind`.)

- [ ] **Step 4: Commit**

```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && git add index.html tools/verify-scene.mjs && git commit -m "feat: escena AR con isotipo extruido y verificacion headless"
```

---

### Task 5: Flyer imprimible (QR de Pages + diseño + render PNG)

**Files:**
- Create: `tools/make-qr.mjs`, `flyer/flyer.html`, `tools/render-flyer.mjs`
- Create: `flyer/assets/logo.png` (copia del logo completo real), `flyer/assets/qr.png` (output), `flyer/flyer.png` (output)

**Interfaces:**
- Consumes: `PAGES_URL` (Task 2).
- Produces: `flyer/flyer.png` (imagen del flyer, que es a la vez el marcador a compilar en Task 6).

- [ ] **Step 1: Copiar el logo completo real para el flyer**

Run:
```bash
cp "/Users/malenaps/GitHub_IAcademia/iacademia-hub/identidad/Logos IAcademia/Logo IAcademia fondo trasparante.png" /Users/malenaps/GitHub_IAcademia/ar-flyer-demo/flyer/assets/logo.png
```

- [ ] **Step 2: Escribir `tools/make-qr.mjs`**

```js
import QRCode from "qrcode";

const url = process.argv[2];
if (!url) {
  console.error("uso: node tools/make-qr.mjs <PAGES_URL>");
  process.exit(1);
}
await QRCode.toFile(new URL("../flyer/assets/qr.png", import.meta.url).pathname, url, {
  width: 600,
  margin: 2,
  color: { dark: "#1b3f6b", light: "#ffffff" },
});
console.log("wrote flyer/assets/qr.png ->", url);
```

- [ ] **Step 3: Generar el QR con la URL de Pages**

Run (sustituir por el `PAGES_URL` real de Task 2):
```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && node tools/make-qr.mjs "https://mps136.github.io/ar-flyer-demo/"
```
Expected: `wrote flyer/assets/qr.png -> https://mps136.github.io/ar-flyer-demo/` y existe `flyer/assets/qr.png`.

- [ ] **Step 4: Escribir `flyer/flyer.html`**

Diseño con detalle visual asimétrico y de alto contraste (mejor seguimiento que un fondo plano). Evita patrones repetitivos y grandes zonas blancas vacías.

```html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:1080px; height:1350px; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  .card { position:relative; width:1080px; height:1350px; overflow:hidden;
    background:
      radial-gradient(circle at 18% 22%, rgba(239,163,32,.18), transparent 38%),
      radial-gradient(circle at 82% 78%, rgba(35,90,151,.22), transparent 42%),
      linear-gradient(135deg, #ffffff 0%, #eef3f9 100%); }
  .corner { position:absolute; width:0; height:0; }
  .c1 { top:0; left:0; border-top:220px solid #235a97; border-right:220px solid transparent; }
  .c2 { bottom:0; right:0; border-bottom:160px solid #efa320; border-left:160px solid transparent; }
  .logo { position:absolute; top:90px; left:50%; transform:translateX(-50%); width:560px; }
  .logo img { width:100%; display:block; }
  .kicker { position:absolute; top:470px; left:90px; right:90px; text-align:center;
    font-size:26px; letter-spacing:6px; color:#efa320; font-weight:700; text-transform:uppercase; }
  .title { position:absolute; top:520px; left:80px; right:80px; text-align:center;
    font-size:74px; line-height:1.05; font-weight:800; color:#1b3f6b; }
  .sub { position:absolute; top:760px; left:120px; right:120px; text-align:center;
    font-size:30px; line-height:1.4; color:#2b3a4a; }
  .qrbox { position:absolute; bottom:120px; left:50%; transform:translateX(-50%);
    width:420px; padding:26px; background:#fff; border:6px solid #235a97; border-radius:28px;
    box-shadow:0 18px 50px rgba(27,63,107,.25); text-align:center; }
  .qrbox img { width:340px; height:340px; display:block; margin:0 auto 14px; }
  .qrbox span { font-size:24px; font-weight:700; color:#1b3f6b; }
  .badge { position:absolute; top:430px; right:70px; width:120px; height:120px; border-radius:50%;
    background:#efa320; color:#1b3f6b; font-weight:800; font-size:20px; display:flex;
    align-items:center; justify-content:center; text-align:center; transform:rotate(-12deg); }
</style>
</head>
<body>
<div class="card">
  <div class="corner c1"></div>
  <div class="corner c2"></div>
  <div class="logo"><img src="./assets/logo.png" alt="iAcademia" /></div>
  <div class="badge">REALIDAD AUMENTADA</div>
  <div class="kicker">Demo de realidad aumentada</div>
  <div class="title">Apunta y mira<br/>la marca cobrar vida</div>
  <div class="sub">Escanea el codigo, apunta la camara a este flyer y veras el logo de iAcademia en 3D.</div>
  <div class="qrbox">
    <img src="./assets/qr.png" alt="QR" />
    <span>Escanea para empezar</span>
  </div>
</div>
</body>
</html>
```

> Nota: la regla "linear-gradient(135deg, #ffffff 0%, #eef3f9 100%)" debe usar caracteres ASCII. Verificar que el `#eef3f9` quede correcto al pegar (no debe colarse ningun caracter no-ASCII).

- [ ] **Step 5: Escribir `tools/render-flyer.mjs`**

```js
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
await page.goto("file://" + process.cwd() + "/flyer/flyer.html", { waitUntil: "networkidle" });
await page.screenshot({ path: "flyer/flyer.png" });
await browser.close();
console.log("wrote flyer/flyer.png");
```

- [ ] **Step 6: Renderizar el flyer y revisarlo**

Run:
```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && node tools/render-flyer.mjs
```
Expected: `wrote flyer/flyer.png`. Abrir `flyer/flyer.png`: debe verse el logo arriba, textos legibles, el QR nitido abajo y suficiente detalle/contraste (no grandes zonas blancas). Si hay demasiado blanco vacio, reforzar el fondo en `flyer.html` y repetir.

- [ ] **Step 7: Commit**

```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && git add tools/make-qr.mjs tools/render-flyer.mjs flyer/flyer.html flyer/assets/logo.png flyer/assets/qr.png flyer/flyer.png && git commit -m "feat: flyer imprimible con QR y logo para el marcador AR"
```

---

### Task 6: Compilar el flyer al marcador `.mind`

**Files:**
- Create: `tools/compile.html`, `tools/compile-target.mjs`
- Create: `assets/targets.mind` (output)

**Interfaces:**
- Consumes: `flyer/flyer.png` (Task 5).
- Produces: `assets/targets.mind` que carga `index.html` en `start()`.

- [ ] **Step 1: Escribir `tools/compile.html`** (usa el build UMD de MindAR con el Compiler)

```html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js"></script>
</head>
<body>
<script>
window.compileFromDataUrl = async (dataUrl) => {
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = dataUrl;
  });
  const compiler = new window.MINDAR.IMAGE.Compiler();
  await compiler.compileImageTargets([img], (p) => { window.__progress = p; });
  const buffer = await compiler.exportData(); // ArrayBuffer
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};
</script>
</body>
</html>
```

- [ ] **Step 2: Escribir `tools/compile-target.mjs`**

```js
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

const flyer = readFileSync("flyer/flyer.png");
const dataUrl = "data:image/png;base64," + flyer.toString("base64");

const browser = await chromium.launch();
const page = await browser.newPage();
page.setDefaultTimeout(300000);
page.on("console", (m) => console.log("[page]", m.text()));

await page.goto("file://" + process.cwd() + "/tools/compile.html", { waitUntil: "load" });
await page.waitForFunction('typeof window.compileFromDataUrl === "function"');

console.log("compilando marcador (puede tardar 1-3 min)...");
const b64 = await page.evaluate((d) => window.compileFromDataUrl(d), dataUrl);
const out = Buffer.from(b64, "base64");
writeFileSync("assets/targets.mind", out);
await browser.close();
console.log("wrote assets/targets.mind", out.length, "bytes");
```

- [ ] **Step 3: Compilar el marcador**

Run:
```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && node tools/compile-target.mjs
```
Expected: `wrote assets/targets.mind <N> bytes` con `N` > 10000 (un marcador real pesa decenas/cientos de KB). `test -s assets/targets.mind` debe pasar.

- [ ] **Step 4: Commit**

```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && git add tools/compile.html tools/compile-target.mjs assets/targets.mind && git commit -m "feat: compilacion del flyer al marcador targets.mind"
```

---

### Task 7: Integración, despliegue y verificación en vivo + README

**Files:**
- Modify: `README.md` (instrucciones completas)

**Interfaces:**
- Consumes: todo lo anterior + `PAGES_URL`.

- [ ] **Step 1: Escribir el `README.md` definitivo**

```markdown
# iAcademia AR flyer demo

Demo de realidad aumentada por navegador (WebAR): imprime el flyer, escanea su QR con el movil,
apunta la camara al flyer y veras el isotipo de iAcademia en 3D girando sobre el papel. Sin app.

## Probarlo

**Con flyer impreso (recomendado):**
1. Imprime `flyer/flyer.png` (A5 o A6, en color, en papel mate si puedes para evitar reflejos).
2. Escanea el QR con la camara del movil. Abre la web en el navegador.
3. Pulsa "Comenzar" y acepta el permiso de camara.
4. Apunta la camara al flyer. Aparece el logo 3D girando.

**Sin imprimir (prueba rapida):**
1. Abre `flyer/flyer.png` a pantalla completa en el ordenador.
2. En el movil, entra en la URL del demo, pulsa "Comenzar" y apunta a la pantalla.

URL del demo: https://mps136.github.io/ar-flyer-demo/

## Requisitos
- HTTPS o localhost (la camara solo funciona en contexto seguro). GitHub Pages ya da HTTPS.
- Navegador movil moderno (Chrome Android, Safari iOS).

## Regenerar los artefactos
```
npm install && npx playwright install chromium
npm run isotipo                       # assets/iacademia-isotipo.svg
npm run qr -- "<PAGES_URL>"           # flyer/assets/qr.png
npm run flyer                         # flyer/flyer.png (marcador)
npm run compile                       # assets/targets.mind
npm run verify                        # comprueba la escena en headless
npm run serve                         # sirve en http://localhost:8080
```

## Como funciona
- `index.html`: MindAR (seguimiento de imagen) + Three.js. Reconstruye el isotipo como SVG, lo
  extruye a 3D, lo ancla al marcador y lo hace girar.
- `assets/targets.mind`: marcador compilado a partir de `flyer/flyer.png`.
- Alojado en GitHub Pages (estatico).
```

- [ ] **Step 2: Commit y push del estado final**

Run:
```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && git add README.md && git commit -m "docs: instrucciones de uso del demo AR" && git push
```
Expected: push correcto a `main`.

- [ ] **Step 3: Esperar el deploy de Pages y verificar que el sitio responde**

Run:
```bash
sleep 60 && curl -s -o /dev/null -w "%{http_code}\n" "https://mps136.github.io/ar-flyer-demo/" && curl -s -o /dev/null -w "%{http_code}\n" "https://mps136.github.io/ar-flyer-demo/assets/targets.mind"
```
Expected: ambos `200` (la página y el marcador). Si da 404, esperar otro minuto (el primer deploy de Pages puede tardar) y reintentar.

- [ ] **Step 4: Verificación en vivo con Playwright (carga real desde Pages, sin cámara)**

Run:
```bash
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && node -e "import('playwright').then(async ({chromium})=>{const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});await p.goto('https://mps136.github.io/ar-flyer-demo/',{waitUntil:'load'});await p.waitForFunction('window.__AR&&(window.__AR.ready||window.__AR.error)',{timeout:20000});const s=await p.evaluate(()=>window.__AR);console.log('state',JSON.stringify(s),'errors',JSON.stringify(errs));await b.close();if(!s.ready)process.exit(1);})"
```
Expected: `state {"ready":true,"logoMeshes":...}` sin errores. Esto confirma que en producción cargan MindAR, Three y el SVG.

- [ ] **Step 5: Validación AR manual (la prueba de verdad)**

Hacer en un móvil real:
1. Abrir `https://mps136.github.io/ar-flyer-demo/`, pulsar "Comenzar", aceptar cámara.
2. Apuntar a `flyer/flyer.png` (impreso o a pantalla completa en otro monitor).
3. Confirmar: aparece el isotipo 3D anclado y girando; al mover el móvil se ve desde varios ángulos; al perder el flyer reaparece el cartelito "Apunta la camara al flyer".

Si no engancha bien el marcador: reforzar el detalle/contraste del flyer (Task 5 Step 4) y recompilar (Task 6). Documentar el resultado de esta prueba al usuario (no afirmar que funciona sin haberlo visto en un móvil).

---

### Task 8: Cierre (mover diseño al repo + actualizar memoria)

**Files:**
- Create: `docs/superpowers/specs/2026-06-24-ar-flyer-isotipo-3d-design.md` (copia del diseño)
- Modify: memoria `ar-flyer-webar-demo.md`

- [ ] **Step 1: Copiar el diseño aprobado dentro del repo**

Run:
```bash
cp /Users/malenaps/ar-flyer-demo-design.md /Users/malenaps/GitHub_IAcademia/ar-flyer-demo/docs/superpowers/specs/2026-06-24-ar-flyer-isotipo-3d-design.md
cd /Users/malenaps/GitHub_IAcademia/ar-flyer-demo && git add docs/superpowers/specs/2026-06-24-ar-flyer-isotipo-3d-design.md && git commit -m "docs: diseno aprobado del demo AR" && git push
```

- [ ] **Step 2: Actualizar la memoria del proyecto**

Editar `/Users/malenaps/.claude/projects/-Users-malenaps/memory/ar-flyer-webar-demo.md`: cambiar el estado a "IMPLEMENTADO Y EN VIVO", añadir la URL `https://mps136.github.io/ar-flyer-demo/`, la ruta del repo `~/GitHub_IAcademia/ar-flyer-demo` y el resultado de la prueba manual en móvil. Actualizar también la línea correspondiente en `MEMORY.md`.

---

## Self-Review

**1. Spec coverage** (contra `~/ar-flyer-demo-design.md`):
- Objetivo (flyer + QR -> isotipo 3D girando, sin app/pago): Tasks 3-7. OK
- MindAR + Three.js: Task 4. OK
- Logo extruido (isotipo, 2 colores): Tasks 3-4. OK (reconstrucción geométrica en vez de trazar el PNG; decisión documentada por mejor acabado 3D y cero dependencias de sistema; el "qué" del diseño se respeta).
- Flyer/marcador con detalle para tracking + compilación `.mind`: Tasks 5-6. OK
- QR impreso en el flyer: Task 5. OK
- Alojamiento GitHub Pages (HTTPS): Tasks 2 y 7. OK
- Archivos del proyecto (index.html, targets.mind, isotipo.svg, flyer.png, qr.png, README): todos cubiertos. OK
- Cómo se prueba (impreso o a pantalla; verificación previa sin errores): Task 7 Steps 3-5. OK
- Fuera de alcance (analítica, varios flyers, vídeo, dominio propio): respetado, no aparecen.

**2. Placeholder scan:** Sin "TBD/TODO". Único punto a vigilar: el `PAGES_URL` exacto se captura en Task 2 Step 3 y se sustituye en Task 5 Step 3 y en los curl de Task 7 (se usa el valor por defecto `https://mps136.github.io/ar-flyer-demo/`, que hay que confirmar). Esto es un dato a capturar, no un placeholder de implementación.

**3. Type consistency:** `window.__AR` con `{ ready, logoMeshes, error }` se define en `index.html` (Task 4 Step 1) y se lee igual en `verify-scene.mjs` (Task 4 Step 2) y en la verificación en vivo (Task 7 Step 4). `window.compileFromDataUrl` se define en `compile.html` y se invoca igual en `compile-target.mjs`. Scripts npm (`isotipo/qr/flyer/compile/verify/serve`) coinciden con los ficheros que crean. Colores `#235a97`/`#efa320` consistentes entre el generador del SVG (Task 3) y la detección de color en `index.html` (Task 4). OK.

> **Recordatorio de ejecución:** revisar que ningún bloque de código pegado contenga caracteres no-ASCII colados (en especial el gradiente de `flyer.html`), por la regla de "sin em-dashes" y para evitar CSS roto.
