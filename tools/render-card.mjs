import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1400 }, deviceScaleFactor: 2 });
await page.goto("file://" + process.cwd() + "/marker/card.html", { waitUntil: "networkidle" });
await page.screenshot({ path: "marker/card.png" });
await browser.close();
console.log("wrote marker/card.png");
