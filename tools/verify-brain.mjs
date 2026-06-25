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
