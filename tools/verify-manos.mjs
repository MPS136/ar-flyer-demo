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
  console.log("VERIFY MANOS OK");
} finally { await browser.close(); srv.kill(); }
