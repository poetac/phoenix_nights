// CI render smoke test: load the built app in a real browser, assert both city
// views mount, the ?city= deep-link selects the right city, and a per-card share
// landing page redirects to the right city + card anchor. Screenshots are written
// to tests/__screens__/ and uploaded as a CI artifact. Run after `npm run build`,
// serving dist/ (default root base). Usage: BASE_URL=http://localhost:8099 node tests/render-smoke.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = process.env.BASE_URL || "http://localhost:8099";
const SHOTS = fileURLToPath(new URL("./__screens__/", import.meta.url));
mkdirSync(SHOTS, { recursive: true });

let failed = false;
const fail = (m) => { console.error("✗ FAIL:", m); failed = true; };
const pageErrors = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 2200 } });
page.on("pageerror", (e) => pageErrors.push(e.message));
// caught fetch errors are handled in-app; we only fail on uncaught exceptions

async function checkCity(cityId, label) {
  await page.goto(`${BASE}/?city=${cityId}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('nav[aria-label="Choose city"] button', { timeout: 15000 });
  const active = await page.$$eval('nav[aria-label="Choose city"] button',
    (bs) => bs.filter((b) => b.getAttribute("aria-current") === "true").map((b) => b.textContent.trim()));
  if (!active.includes(label)) fail(`?city=${cityId}: expected active "${label}", got ${JSON.stringify(active)}`);
  // asset-backed cards render from committed JSON (no live data needed) — expect several headings
  try {
    await page.waitForFunction(() => document.querySelectorAll("h2, h3").length >= 3, { timeout: 40000 });
  } catch { fail(`${cityId}: dashboard cards did not render within 40s`); }
  const n = await page.$$eval("h2, h3", (e) => e.length);
  console.log(`✓ ${cityId}: active=${JSON.stringify(active)} headings=${n}`);
  // Phase 2: the salience "what stands out" facts section renders per city
  try {
    await page.waitForFunction((lbl) => document.body.textContent.includes("What stands out in " + lbl), label, { timeout: 20000 });
    console.log(`\u2713 ${cityId}: facts section present`);
  } catch { fail(`${cityId}: facts section ("What stands out in ${label}") missing`); }
  await page.screenshot({ path: `${SHOTS}${cityId}.png`, fullPage: true });
}

// Phase 3: the cross-city explore landing renders at the root
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
try {
  await page.waitForFunction(() => {
    const t = document.body.textContent || "";
    return t.includes("Where the desert is losing") && t.includes("Phoenix");
  }, undefined, { timeout: 30000 });
  const cities = await page.$$eval('ol[aria-label="Cities ranked by overnight-low warming"] button', (b) => b.length);
  if (cities < 4) fail(`explore: expected >=4 city rows, got ${cities}`);
  else console.log(`\u2713 explore landing: ${cities} cities ranked`);
} catch (e) { fail("explore landing did not render: " + e.message.split("\n")[0]); }


// Phase 3b: the explore landing renders a clickable US map of the cities
try {
  await page.waitForSelector('[data-testid="us-map"]', { timeout: 15000 });
  const dots = await page.$$eval('[data-testid="us-map"] [data-city]',
    (els) => els.map((e) => e.getAttribute("data-city")));
  if (dots.length < 4) fail(`map: expected >=4 city dots, got ${dots.length} (${dots})`);
  else console.log(`\u2713 explore map: ${dots.length} city dots (${dots.join(",")})`);
  await page.click('[data-testid="us-map"] [data-city="ep"]');
  await page.waitForSelector('nav[aria-label="Choose city"] button', { timeout: 15000 });
  const active = await page.$$eval('nav[aria-label="Choose city"] button',
    (bs) => bs.filter((b) => b.getAttribute("aria-current") === "true").map((b) => b.textContent.trim()));
  if (!active.includes("El Paso")) fail(`map dot click: expected El Paso active, got ${JSON.stringify(active)}`);
  else console.log("\u2713 explore map: dot click deep-links to El Paso");
} catch (e) { fail("explore map did not render/behave: " + e.message.split("\n")[0]); }

await checkCity("tus", "Tucson");
await checkCity("phx", "Phoenix");
await checkCity("lv", "Las Vegas");
await checkCity("ep", "El Paso");

// Phase 4 cities: each vetted addition mounts, deep-links, and shows its facts.
await checkCity("yum", "Yuma");
await checkCity("rno", "Reno");
await checkCity("abq", "Albuquerque");
await checkCity("slc", "Salt Lake City");
await checkCity("boi", "Boise");

// per-card share landing page must redirect to the right city + card anchor
await page.goto(`${BASE}/share/phx-hot-nights.html`, { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForTimeout(2000);
const url = page.url();
if (!url.includes("city=phx") || !url.includes("#nights-that-never-dropped-below-80-f"))
  fail(`share landing redirect went to ${url}`);
else console.log("✓ share landing redirect ->", url);

if (pageErrors.length) fail("uncaught page errors: " + JSON.stringify([...new Set(pageErrors)].slice(0, 8)));

await browser.close();
console.log(failed ? "RENDER SMOKE FAILED" : "RENDER SMOKE PASSED");
process.exit(failed ? 1 : 0);
