import { chromium } from "playwright";

const URL = process.env.URL ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "/tmp/app-graph.png";
const TERM = process.env.TERM_Q ?? "Putin";
const HIT = process.env.HIT ?? "IGOR PUTIN";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
page.on("pageerror", (e) => console.error("PAGEERROR:", e.message));
page.on("console", (m) => {
  const t = m.type();
  if (t === "error" || t === "warning" || t === "log") {
    console.error(`CONSOLE.${t}:`, m.text());
  }
});

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(1500); // hydration
await page.fill('input[placeholder*="Buscar"]', TERM);
await page.waitForResponse((r) => r.url().includes("/api/search") && r.status() === 200, { timeout: 10000 });
await page.waitForTimeout(500);

const target = page.locator("button").filter({ hasText: HIT }).first();
await target.waitFor({ state: "visible", timeout: 8000 });
const responsePromise = page.waitForResponse(
  (r) => /\/api\/node\/\d+/.test(r.url()),
  { timeout: 30000 },
);
await target.click();
await responsePromise;
await page.waitForTimeout(4000);

const cyInfo = await page.evaluate(() => {
  const el = document.querySelector(".__________cytoscape_container");
  if (!el) return "no container";
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    inline: el.getAttribute("style"),
    cls: el.className,
    position: cs.position,
    inset: `${cs.top} ${cs.right} ${cs.bottom} ${cs.left}`,
    sizeCss: `${cs.width} x ${cs.height}`,
    sizeRect: `${r.width} x ${r.height}`,
    contain: cs.contain,
    parent: el.parentElement?.tagName,
    parentRect: el.parentElement?.getBoundingClientRect(),
  };
});
console.log("CY INFO:", JSON.stringify(cyInfo, null, 2));

const layout = await page.evaluate(() => {
  const rect = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  };
  return {
    html: rect("html"),
    body: rect("body"),
    grid: rect("body > div"),
    header: rect("header"),
    main: rect("main"),
    sectionCypher: rect("section"),
    asideLeft: rect("aside.border-r"),
    asideRight: rect("aside.border-l"),
    cyContainer: rect(".__________cytoscape_container"),
  };
});
console.log("LAYOUT:", JSON.stringify(layout, null, 2));
await page.screenshot({ path: OUT, fullPage: false });

console.log(`saved ${OUT}`);
await browser.close();
