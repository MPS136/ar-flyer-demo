import QRCode from "qrcode";

const url = process.argv[2];
if (!url) {
  console.error("uso: node tools/make-qr.mjs <PAGES_URL>");
  process.exit(1);
}
await QRCode.toFile(new URL("../flyer/assets/qr.png", import.meta.url).pathname, url, {
  width: 600,
  margin: 2,
  color: { dark: "#1b3f6b", light: "#ffffff" },
});
console.log("wrote flyer/assets/qr.png ->", url);
