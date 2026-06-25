import { chromium } from "playwright";
import { spawn } from "node:child_process";
const srv = spawn("npx", ["--yes", "serve", "-l", "8095", "."], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));
// camara simulada: el modelo de manos se carga al pulsar Comenzar (tras arrancar la camara)
const browser = await chromium.launch({ headless: false, args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
try {
  const ctx = await browser.newContext({ permissions: ["camera"] });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("http://localhost:8095/manos/index.html", { waitUntil: "load" });
  await page.waitForFunction("window.__MANOS && (window.__MANOS.ready || window.__MANOS.error)", { timeout: 20000 });
  const s0 = await page.evaluate(() => window.__MANOS);
  if (!s0.ready) throw new Error("manos no listo: " + s0.error);
  // pulsar Comenzar: arranca camara y luego carga el modelo de manos
  await page.click("#start");
  await page.waitForFunction("window.__MANOS && window.__MANOS.handLandmarkerLoaded", { timeout: 60000 });
  const s = await page.evaluate(() => window.__MANOS);
  console.log("MANOS:", JSON.stringify(s), "errors:", JSON.stringify(errors));
  if (!s.handLandmarkerLoaded) throw new Error("HandLandmarker no cargo tras Comenzar");
  const crit = errors.filter((e) => !/deprecat|GroupMarker|GL_/i.test(e));
  if (crit.length) throw new Error("errores: " + crit.join(" | "));
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
  const crit2 = errors.filter((e) => !/deprecat|GroupMarker|GL_/i.test(e));
  if (crit2.length) throw new Error("errores tras morph: " + crit2.join(" | "));
  // mano sintetica: valida el mapeo apertura->morph (nunca probado con datos reales)
  // y que la escala del conjunto AR no colapse (regresion del doble fitScale).
  const mk = (pts) => { const a = Array.from({ length: 21 }, () => ({ x: 0, y: 0 })); for (const k in pts) a[k] = { x: pts[k][0], y: pts[k][1] }; return a; };
  const OPEN_HAND = mk({ 0: [.50, .90], 5: [.42, .60], 9: [.50, .60], 13: [.58, .60], 17: [.66, .62], 8: [.40, .28], 12: [.50, .24], 16: [.58, .28], 20: [.66, .38] });
  const FIST_HAND = mk({ 0: [.50, .90], 5: [.42, .62], 9: [.50, .62], 13: [.58, .62], 17: [.66, .64], 8: [.46, .60], 12: [.50, .58], 16: [.55, .60], 20: [.60, .64] });
  const rOpen = await page.evaluate((h) => window.__MANOS.testHand(h), OPEN_HAND);
  const rFist = await page.evaluate((h) => window.__MANOS.testHand(h), FIST_HAND);
  console.log("OPEN:", JSON.stringify(rOpen), "FIST:", JSON.stringify(rFist));
  if (!(rOpen.morphTarget > 0.8)) throw new Error("mano abierta no mapea a morph alto: " + rOpen.morphTarget);
  if (!(rFist.morphTarget < 0.2)) throw new Error("puno no mapea a morph bajo: " + rFist.morphTarget);
  if (!(rOpen.logoWorldSize > 0.1)) throw new Error("escala AR colapsada (logo world size=" + rOpen.logoWorldSize + ")");
  console.log("VERIFY MANOS OK");
} finally { await browser.close(); srv.kill(); }
