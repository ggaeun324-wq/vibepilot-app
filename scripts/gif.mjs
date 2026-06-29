// 앱 화면 데모 GIF 생성. 흰 화면(로딩) 없이 첫 프레임부터 사이트가 보이도록
// 먼저 페이지를 완전히 워밍업한 뒤 프레임을 캡처해 합친다.
// 사전 조건: 앱 서버(3000) + Edge --remote-debugging-port=9222 실행, npm i -D puppeteer-core gifenc
import puppeteer from "puppeteer-core";
import gifenc from "gifenc";
const { GIFEncoder, quantize, applyPalette } = gifenc;
import { writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "docs", "vibepilot-demo.gif");
const BASE = "http://127.0.0.1:3000";
const W = 960, H = 600, FPS = 5;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function click(page, sel, text) {
  const h = await page.evaluateHandle((s, t) => {
    const els = [...document.querySelectorAll(s)];
    return els.find((e) => e.textContent?.includes(t)) || null;
  }, sel, text);
  const el = h.asElement();
  if (el) await el.click();
}
async function setVal(page, els, i, v) {
  await els[i].evaluate((el, val) => {
    el.value = val;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, v);
}

const browser = await puppeteer.connect({ browserURL: "http://127.0.0.1:9222", defaultViewport: { width: W, height: H } });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H });
console.error("step:goto");
await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
console.error("step:loaded");
await sleep(6000);
await sleep(4000);
console.error("step:warm-done");
setTimeout(() => { console.error("timeout"); process.exit(1); }, 90000);

const frames = [];
const grab = async (n = 1) => { for (let i = 0; i < n; i++) { try { frames.push(await page.screenshot({ type: "png" })); } catch { /* page navigating */ } await sleep(150); } };

await grab(8); console.error("step:home-frames="+frames.length);
try {
  await click(page, "button,div", "중급자"); await sleep(900); await grab(4);
  const d = await page.$$('input[type="date"]');
  if (d[0]) await setVal(page, d, 0, "2026-06-20");
  if (d[1]) await setVal(page, d, 1, "2026-06-30");
  await sleep(500); await grab(6);
} catch (e) { console.warn("interaction skipped:", e.message); await grab(3); }

const enc = GIFEncoder();
for (const buf of frames) {
  const png = PNG.sync.read(buf);
  const data = new Uint8Array(png.data);
  const pal = quantize(data, 256);
  enc.writeFrame(applyPalette(data, pal), png.width, png.height, { palette: pal, delay: 1000 / FPS });
}
enc.finish();
writeFileSync(OUT, enc.bytesView());
console.log(`gif: ${OUT} frames=${frames.length}`);
await browser.disconnect();
