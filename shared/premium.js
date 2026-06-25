import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export const BRAND = { blue: "#235a97", dark: "#1b3f6b", gold: "#efa320" };

// Capa de bloom selectivo. Solo los objetos con esta capa habilitada brillan;
// el fondo (camara) NUNCA se ve afectado, evitando que el glow lave la imagen.
export const BLOOM_LAYER = 1;
const _bloomLayers = new THREE.Layers();
_bloomLayers.set(BLOOM_LAYER);
export function enableBloom(obj) { obj.traverse((o) => o.layers.enable(BLOOM_LAYER)); }

// Por defecto: el esquema original (hemisferica + 1 direccional) que usan los
// modulos ya verificados (p.ej. GENESIS), sin tocarlos. Con { metal:true } se
// reduce la hemisferica para que el entorno (scene.environment) mande en los
// reflejos y se anade una luz RIM trasera que dibuja el canto -> acabado joya.
export function addBrandLights(scene, opts = {}) {
  const { metal = false } = opts;
  scene.add(new THREE.HemisphereLight(0xffffff, metal ? 0x1b2a44 : 0x223344, metal ? 0.5 : 1.0));
  const key = new THREE.DirectionalLight(0xffffff, metal ? 1.6 : 1.2);
  key.position.set(1, metal ? 1.5 : 1, 2);
  scene.add(key);
  if (metal) {
    const rim = new THREE.DirectionalLight(0xcfe0ff, 1.3);
    rim.position.set(-1.5, 0.5, -1.2);
    scene.add(rim);
  }
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

// Bloom SELECTIVO: el glow solo afecta a los objetos marcados con enableBloom()
// (logo, particulas), nunca al fondo de camara. Dos pasadas: una que aisla y
// difumina lo brillante (con el resto en negro y sin fondo) y otra que pinta la
// escena normal y le SUMA ese glow. Devuelve render() para el loop.
export function makeBloom(renderer, scene, camera, opts = {}) {
  const { strength = 0.9, radius = 0.5, threshold = 0.0 } = opts;
  const size = new THREE.Vector2(window.innerWidth, window.innerHeight);

  const bloomComposer = new EffectComposer(renderer);
  bloomComposer.renderToScreen = false;
  bloomComposer.addPass(new RenderPass(scene, camera));
  bloomComposer.addPass(new UnrealBloomPass(size, strength, radius, threshold));

  const mixPass = new ShaderPass(new THREE.ShaderMaterial({
    uniforms: { baseTexture: { value: null }, bloomTexture: { value: bloomComposer.renderTarget2.texture } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform sampler2D baseTexture; uniform sampler2D bloomTexture; varying vec2 vUv; void main(){ gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv); }",
  }), "baseTexture");
  mixPass.needsSwap = true;

  const finalComposer = new EffectComposer(renderer);
  finalComposer.addPass(new RenderPass(scene, camera));
  finalComposer.addPass(mixPass);
  finalComposer.addPass(new OutputPass());

  const darkMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const store = {};
  const darken = (o) => { if (o.isMesh && !_bloomLayers.test(o.layers)) { store[o.uuid] = o.material; o.material = darkMat; } };
  const restore = (o) => { if (store[o.uuid]) { o.material = store[o.uuid]; delete store[o.uuid]; } };

  function render() {
    const bg = scene.background;
    scene.background = null;          // el fondo de camara no debe brillar
    scene.traverse(darken);          // el resto en negro durante la pasada de glow
    bloomComposer.render();
    scene.traverse(restore);
    scene.background = bg;
    finalComposer.render();          // escena normal (camara nitida) + glow sumado
  }
  return { render };
}

// Pone el feed de la camara como fondo de la escena. Necesario cuando se usa
// EffectComposer/UnrealBloomPass: el composer pinta un lienzo OPACO, asi que la
// camara no puede verse "detras" via z-index. Metiendola como scene.background
// se renderiza dentro del frame (y el bloom solo realza lo brillante si el
// threshold es alto). Devuelve cover(w,h) para ajustar el encuadre sin deformar.
export function setCameraBackground(scene, video) {
  const tex = new THREE.VideoTexture(video);
  tex.colorSpace = THREE.SRGBColorSpace;
  scene.background = tex;
  return function cover(w, h) {
    tex.needsUpdate = true; // el fondo no dispara el update del VideoTexture: forzarlo cada frame
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh || !w || !h) return;
    const ca = w / h, va = vw / vh;
    if (ca > va) { tex.repeat.set(1, va / ca); tex.offset.set(0, (1 - va / ca) / 2); }
    else { tex.repeat.set(ca / va, 1); tex.offset.set((1 - ca / va) / 2, 0); }
  };
}

export async function buildLogo(svgUrl, opts = {}) {
  // finish "plastic" (por defecto): material original que usan los modulos ya
  // verificados (GENESIS). finish "metal": acabado joya, REQUIERE scene.environment
  // en el modulo que lo use (sin entorno un metal se ve negro/plano).
  const { depth = 18, scaleToFit = 1.0, finish = "plastic" } = opts;
  const metal = finish === "metal";
  const text = await (await fetch(svgUrl)).text();
  const data = new SVGLoader().parse(text);
  const group = new THREE.Group();
  for (const path of data.paths) {
    const rawFill = path.userData && path.userData.style && path.userData.style.fill;
    if (!rawFill || rawFill.toLowerCase() === "none") continue;
    const fill = rawFill.toLowerCase();
    const color = fill === BRAND.gold.toLowerCase() ? BRAND.gold : BRAND.blue;
    // Metal pulido tipo "joya": metalness 1 (el color tinta el reflejo, look anodizado),
    // roughness bajo = brillo nitido. emissive minimo: solo para que el bloom selectivo
    // prenda un poco los cantos, sin lavar la forma.
    const mat = new THREE.MeshStandardMaterial(metal ? {
      color, metalness: 1.0, roughness: 0.22, envMapIntensity: 1.4,
      emissive: new THREE.Color(color), emissiveIntensity: 0.12,
    } : {
      color, emissive: new THREE.Color(color), emissiveIntensity: 0.7, metalness: 0.4, roughness: 0.35,
    });
    for (const shape of SVGLoader.createShapes(path)) {
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth, bevelEnabled: true,
        bevelThickness: metal ? 4 : 2.5, bevelSize: metal ? 3.2 : 2, bevelSegments: metal ? 5 : 3,
        curveSegments: 24,
      });
      group.add(new THREE.Mesh(geo, mat));
    }
  }
  // Centrar ANTES de voltear: el SVG tiene Y hacia abajo. Si se centra despues
  // de aplicar scale.y=-1, se mezclan espacios y el logo queda descentrado en
  // vertical (aparece "abajo"). Por eso: medir y centrar sin voltear, y luego
  // voltear alrededor del origen (ya centrado).
  let box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  group.children.forEach((m) => m.position.sub(center));
  group.scale.y *= -1;
  const fit = scaleToFit / Math.max(size.x, size.y);
  const pivot = new THREE.Group();
  pivot.add(group);
  pivot.scale.setScalar(fit);
  pivot.updateMatrixWorld(true);

  // Sampled points are in the PARENT space of pivot (include its fit scale).
  // IMPORTANT: add the Points as a SIBLING of pivot (same parent), not as a child,
  // so that particles and logo align correctly.
  const worldGeos = group.children.map((m) => m.geometry.clone().applyMatrix4(m.matrixWorld));
  const merged = mergeGeometries(worldGeos, false);
  const sampler = new MeshSurfaceSampler(new THREE.Mesh(merged)).build();

  function surfacePoints(count) {
    // Returns particle positions sampled from logo surface, in pivot's parent space.
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
  if (!merged) throw new Error("buildBrain: no mesh geometries found in " + glbUrl);
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

export class ParticleField {
  constructor(targetPositions, opts = {}) {
    const { spread = 1.6, size = 0.014, goldRatio = 0.18, blue: blueHex = BRAND.blue, gold: goldHex = BRAND.gold, targetB = null } = opts;
    this.count = targetPositions.length / 3;
    this.target = targetPositions;
    this.targetB = targetB; // segunda nube objetivo (cerebro); null => sin morph
    this.cloud = new Float32Array(this.count * 3);
    this.current = new Float32Array(this.count * 3);
    this.delay = new Float32Array(this.count);
    const colors = new Float32Array(this.count * 3);
    const blue = new THREE.Color(blueHex), gold = new THREE.Color(goldHex);
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
  // p 0..1: interpola de la nube objetivo A (logo) a la B (cerebro)
  morph(p) {
    if (!this.targetB) return;
    const e = this._ease(Math.min(1, Math.max(0, p)));
    for (let i = 0; i < this.count * 3; i++) {
      this.current[i] = this.target[i] + (this.targetB[i] - this.target[i]) * e;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
  swirl(dt) { this.points.rotation.y += dt * 0.3; }
}
