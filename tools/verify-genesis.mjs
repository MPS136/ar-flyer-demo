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
