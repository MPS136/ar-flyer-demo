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
