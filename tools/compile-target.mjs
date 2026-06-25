import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

const flyer = readFileSync("flyer/flyer.png");
const dataUrl = "data:image/png;base64," + flyer.toString("base64");

// headless: false is required: MindAR's Compiler uses the WebGL TF.js backend
// which is not available in headless Chromium without a GPU/display.
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
page.setDefaultTimeout(300000);
page.on("console", (m) => console.log("[page]", m.text()));

await page.goto("file://" + process.cwd() + "/tools/compile.html", { waitUntil: "load" });
await page.waitForFunction('window.__mindarReady === true && typeof window.MINDAR !== "undefined"');
await page.waitForFunction('typeof window.compileFromDataUrl === "function"');

console.log("compilando marcador (puede tardar 1-3 min)...");
const b64 = await page.evaluate((d) => window.compileFromDataUrl(d), dataUrl);
const out = Buffer.from(b64, "base64");
writeFileSync("assets/targets.mind", out);
await browser.close();
console.log("wrote assets/targets.mind", out.length, "bytes");
