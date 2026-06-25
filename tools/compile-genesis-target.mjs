import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

mkdirSync("genesis/assets", { recursive: true });
const img = readFileSync("marker/card.png");
const dataUrl = "data:image/png;base64," + img.toString("base64");

const browser = await chromium.launch({ headless: false }); // el compilador necesita WebGL real
const page = await browser.newPage();
page.setDefaultTimeout(300000);
page.on("console", (m) => console.log("[page]", m.text()));
await page.goto("file://" + process.cwd() + "/tools/compile.html", { waitUntil: "load" });
await page.waitForFunction('typeof window.compileFromDataUrl === "function"');
console.log("compilando marcador Genesis (1-3 min)...");
const b64 = await page.evaluate((d) => window.compileFromDataUrl(d), dataUrl);
const out = Buffer.from(b64, "base64");
writeFileSync("genesis/assets/targets.mind", out);
await browser.close();
console.log("wrote genesis/assets/targets.mind", out.length, "bytes");
