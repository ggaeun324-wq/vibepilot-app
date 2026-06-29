// 앱 전체 플로우 데모 GIF: 고급자 선택 → 이름·기간 입력 → 여정 시작 → 대시보드/체크리스트 버튼 클릭.
// 흰 화면(로딩) 없이 첫 프레임부터 사이트가 보이도록 먼저 워밍업한 뒤 프레임을 캡처.
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
async function reactSet(handle, val) {
  await handle.evaluate((el, v) => {
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, val);
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
setTimeout(() => { console.error("timeout"); process.exit(1); }, 120000);

const frames = [];
const grab = async (n = 1) => { for (let i = 0; i < n; i++) { try { frames.push(await page.screenshot({ type: "png" })); } catch { /* page navigating */ } await sleep(150); } };

await grab(8); console.error("home="+frames.length);
try {
  await click(page, "button", "고급자"); await sleep(900); await grab(4);
  const name = await page.$('input[type="text"]');
  if (name) { await reactSet(name, "VibePilot 포트폴리오 앱"); await sleep(400); await grab(3); }
  const texts = await page.$$('input[type="text"]');
  if (texts[1]) { await reactSet(texts[1], "한 달 안에 배포까지 완성"); await sleep(400); await grab(3); }
  const d = await page.$$('input[type="date"]');
  if (d[0]) await reactSet(d[0], "2026-06-01");
  if (d[1]) await reactSet(d[1], "2026-06-30");
  await sleep(500); await grab(4);
  await click(page, "button", "여정 시작하기"); await sleep(1500); await grab(8);
  await click(page, "button", "단계별 체크리스트"); await sleep(900); await grab(5);
  const steps = await page.$$("button");
  for (const s of steps.slice(0, 24)) {
    const t = await s.evaluate((e) => e.textContent || "");
    if (/정의|기능|화면|설계/.test(t)) { try { await s.click(); } catch {} await sleep(350); await grab(2); }
  }
  await grab(4);
  await click(page, "button", "개요 & 추천"); await sleep(900); await grab(6);
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
