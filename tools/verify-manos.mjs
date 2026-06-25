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
