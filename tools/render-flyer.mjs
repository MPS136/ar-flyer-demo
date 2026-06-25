import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
await page.goto("file://" + process.cwd() + "/flyer/flyer.html", { waitUntil: "networkidle" });
await page.screenshot({ path: "flyer/flyer.png" });
await browser.close();
console.log("wrote flyer/flyer.png");
