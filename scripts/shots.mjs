import puppeteer from "puppeteer-core";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "docs", "screenshots");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BASE = "http://127.0.0.1:3000";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickByText(page, selector, text) {
  const handle = await page.evaluateHandle(
    (sel, txt) => {
      const els = Array.from(document.querySelectorAll(sel));
      return els.find((e) => e.textContent && e.textContent.includes(txt)) || null;
    },
    selector,
    text,
  );
  const el = handle.asElement();
  if (!el) throw new Error(`Not found: ${selector} containing "${text}"`);
  await el.click();
}

async function setInput(page, selector, value) {
  await page.$eval(
    selector,
    (el, val) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      ).set;
      setter.call(el, val);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    },
    value,
  );
}

const browser = await puppeteer.connect({
  browserURL: "http://127.0.0.1:9222",
  defaultViewport: { width: 1440, height: 1000 },
});

const page = await browser.newPage();
await page.goto(BASE, { waitUntil: "networkidle2", timeout: 60000 });
await sleep(800);

// 1) Home (level selection)
await page.screenshot({ path: path.join(OUT, "01-home.png") });
console.log("shot 01-home");

// 2) Select intermediate level -> setup form
await clickByText(page, "button, div", "중급자");
await sleep(600);
await setInput(page, 'input[placeholder="예: 나만의 Todo 앱"]', "나만의 Todo 앱");
await setInput(page, 'input[placeholder="예: 3시간 안에 MVP 완성하기!"]', "3시간 안에 MVP 완성하기!");
await setInput(page, 'input[type="date"]:nth-of-type(1)', "2026-06-20");
const dates = await page.$$('input[type="date"]');
await page.evaluate((el, v) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(el, v);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}, dates[0], "2026-06-20");
await page.evaluate((el, v) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(el, v);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}, dates[1], "2026-06-30");
await sleep(400);
await page.screenshot({ path: path.join(OUT, "02-setup.png") });
console.log("shot 02-setup");

// 3) Start journey -> dashboard with AI coach
await clickByText(page, "button", "여정 시작하기");
await sleep(1500);
await page.screenshot({ path: path.join(OUT, "03-dashboard.png") });
console.log("shot 03-dashboard");

// 4) Checklist tab
await clickByText(page, "button", "단계별 체크리스트");
await sleep(800);
await page.screenshot({ path: path.join(OUT, "04-checklist.png") });
console.log("shot 04-checklist");

await browser.disconnect();
console.log("done");
