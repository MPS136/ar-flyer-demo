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
