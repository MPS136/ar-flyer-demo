// Verificacion del paso a camara: tras pulsar "Comenzar", el fondo opaco debe
// volverse transparente para que se vea el video de la camara (MindAR lo coloca
// en z-index -2). Usa una camara simulada de Chromium. Requiere modo no-headless
// (WebGL real). Uso: node tools/verify-camera.mjs
import { chromium } from "playwright";
import { spawn } from "node:child_process";

const srv = spawn("npx", ["--yes", "serve", "-l", "8091", "."], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));

const browser = await chromium.launch({
  headless: false,
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
});
try {
  const context = await browser.newContext({ permissions: ["camera"], viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("http://localhost:8091/index.html", { waitUntil: "load" });
  await page.waitForFunction("window.__AR && window.__AR.ready", { timeout: 20000 });
  await page.click("#start");
  await page.waitForFunction("document.querySelector('video') && document.querySelector('video').readyState >= 2", { timeout: 15000 });
  await page.waitForTimeout(1500);

  const r = await page.evaluate(() => ({
    bodyBg: getComputedStyle(document.body).backgroundColor,
    htmlBg: getComputedStyle(document.documentElement).backgroundColor,
    videoPlaying: (() => { const v = document.querySelector("video"); return !!v && !v.paused && v.readyState >= 2; })(),
  }));
  console.log("post-start state:", JSON.stringify(r));
  await page.screenshot({ path: "/tmp/ar-fixed.png", timeout: 8000 }).catch(() => {});

  const transparent = (c) => c === "rgba(0, 0, 0, 0)" || c === "transparent";
  if (!transparent(r.bodyBg)) throw new Error("body sigue opaco tras start: " + r.bodyBg + " (tapara la camara)");
  if (!r.videoPlaying) throw new Error("el video de la camara no esta reproduciendo");
  console.log("VERIFY CAMERA OK (fondo transparente, camara activa)");
} finally {
  await browser.close();
  srv.kill();
}
