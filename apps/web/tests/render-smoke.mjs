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
  await page.waitForSelector('[data-testid="city-switcher"]', { timeout: 15000 });
  const active = (await page.$eval('[data-testid="city-switcher"]', (b) => b.textContent.trim())).replace(/\s*\u25be\s*$/, "");
  if (!active.includes(label)) fail(`?city=${cityId}: switcher shows "${active}", expected "${label}"`);
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
  const title = await page.title();
  if (!title.includes(label)) fail(`${cityId}: document title "${title}" missing "${label}"`);
  await page.screenshot({ path: `${SHOTS}${cityId}.png`, fullPage: true });
}

// Phase 3: the cross-city explore landing renders at the root
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
try {
  await page.waitForFunction(() => {
    const t = document.body.textContent || "";
    return t.includes("Cities are losing") && t.includes("Phoenix");
  }, undefined, { timeout: 30000 });
  const cities = await page.$$eval('ol[aria-label="Cities ranked by overnight-low warming"] button', (b) => b.length);
  if (cities < 4) fail(`explore: expected >=4 city rows, got ${cities}`);
  else console.log(`\u2713 explore landing: ${cities} cities ranked`);
} catch (e) { fail("explore landing did not render: " + e.message.split("\n")[0]); }

// Climate tags: the ranked list shows both biomes the thesis spans.
try {
  const txt = await page.evaluate(() => document.body.textContent || "");
  if (!txt.includes("Arid West") || !txt.includes("Humid South"))
    fail("climate tags missing (expected both 'Arid West' and 'Humid South')");
  else console.log("\u2713 climate tags: both Arid West + Humid South present");
} catch (e) { fail("climate tag check failed: " + e.message.split("\n")[0]); }

// Cross-city comparison overlay renders with all cities in its legend.
try {
  await page.waitForSelector('[data-testid="city-compare"]', { timeout: 20000 });
  const legend = await page.$$eval('section[aria-label="All cities\' overnight-low warming compared"] ul button', (b) => b.length);
  if (legend < 9) fail(`compare chart: expected >=9 legend cities, got ${legend}`);
  else console.log(`\u2713 compare chart: ${legend} cities overlaid`);
} catch (e) { fail("compare chart did not render: " + e.message.split("\n")[0]); }


// Phase 3b: the explore landing renders a clickable US map of the cities
try {
  await page.waitForSelector('[data-testid="us-map"]', { timeout: 15000 });
  const dots = await page.$$eval('[data-testid="us-map"] [data-city]',
    (els) => els.map((e) => e.getAttribute("data-city")));
  if (dots.length < 4) fail(`map: expected >=4 city dots, got ${dots.length} (${dots})`);
  else console.log(`\u2713 explore map: ${dots.length} city dots (${dots.join(",")})`);
  // Fire the click on the dot element directly (its hover label widens the
  // <g> bbox, so a coordinate-center click can miss; the dot hit-target is fine
  // for real users). Dispatch a bubbling click so React's onClick handles it.
  await page.$eval('[data-testid="us-map"] [data-city="ep"]',
    (el) => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await page.waitForSelector('[data-testid="city-switcher"]', { timeout: 15000 });
  const sw = await page.$eval('[data-testid="city-switcher"]', (b) => b.textContent);
  if (!sw.includes("El Paso")) fail(`map dot click: expected switcher "El Paso", got ${JSON.stringify(sw)}`);
  else console.log("\u2713 explore map: dot click deep-links to El Paso");
} catch (e) { fail("explore map did not render/behave: " + e.message.split("\n")[0]); }

// Bugfix: the city switcher opens a menu and collapses on selection (it used to
// spill all cities into a multi-row block over the page at 9 cities).
await page.goto(`${BASE}/?city=phx`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector('[data-testid="city-switcher"]', { timeout: 15000 });
await page.click('[data-testid="city-switcher"]');
try {
  await page.waitForSelector('[role="listbox"] [role="option"]', { timeout: 8000 });
  const opts = await page.$$eval('[role="listbox"] [role="option"]', (b) => b.length);
  if (opts < 9) fail(`city menu: expected >=9 options, got ${opts}`);
  await page.$$eval('[role="listbox"] [role="option"]', (bs) => {
    const r = bs.find((b) => b.textContent.trim().startsWith("Reno"));
    if (r) r.click();
  });
  await page.waitForFunction(() => !document.querySelector('[role="listbox"]'), { timeout: 8000 });
  const sw = await page.$eval('[data-testid="city-switcher"]', (b) => b.textContent);
  if (!sw.includes("Reno")) fail(`city menu select: switcher shows "${sw}", expected Reno`);
  else console.log(`\u2713 city switcher: menu (${opts} options) selects + collapses`);
} catch (e) { fail("city switcher menu did not open/close: " + e.message.split("\n")[0]); }

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
await checkCity("atl", "Atlanta");  // first humid-climate city
await checkCity("hou", "Houston");
await checkCity("nola", "New Orleans");
await checkCity("rdu", "Raleigh");
await checkCity("dfw", "Dallas");

// Phase 5: the honest-extrapolation card renders for a warming city, clearly labeled.
await page.goto(`${BASE}/?city=phx`, { waitUntil: "domcontentloaded", timeout: 30000 });
try {
  await page.waitForFunction(() => document.body.textContent.includes("straight-line extrapolation"), { timeout: 45000 });
  const labeled = await page.$$eval("h2", (hs) => hs.some((h) => h.textContent.includes("A line, not a forecast")));
  if (!labeled) fail("extrapolation card heading ('A line, not a forecast') missing");
  else console.log("\u2713 extrapolation card present + labeled (not a forecast)");
} catch (e) { fail("extrapolation card did not render: " + e.message.split("\n")[0]); }

// City Signals (the default product) renders the salience-driven body \u2014 a
// different, fact-led layout per city \u2014 not the curated Desert Nights stack. The
// enriched fact families show the lead signal in depth (e.g. phx's diurnal
// "then and now" curve as part of its warming-signal family).
try {
  await page.waitForFunction(() => {
    const t = document.body.textContent || "";
    return t.includes("The warming signal") && t.includes("A summer day, then and now");
  }, undefined, { timeout: 30000 });
  console.log("\u2713 City Signals: phx uses the salience body + its enriched signal family");
} catch (e) { fail("City Signals: salience body / enriched family missing on phx: " + e.message.split("\n")[0]); }

// per-card share landing page must redirect to the right city + card anchor
await page.goto(`${BASE}/share/phx-hot-nights.html`, { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForTimeout(2000);
const url = page.url();
if (!url.includes("city=phx") || !url.includes("#nights-that-never-dropped-below-80-f"))
  fail(`share landing redirect went to ${url}`);
else console.log("✓ share landing redirect ->", url);

// --- Product split: Desert Nights (the curated arid-West product) ---
// Same shared engine; ?product=desert scopes the city set to the arid West and
// reframes the landing. (Build-time VITE_PRODUCT picks each deployed site's
// product; the query override lets us exercise both from one build here.)
await page.goto(`${BASE}/?product=desert`, { waitUntil: "domcontentloaded", timeout: 30000 });
try {
  await page.waitForFunction(
    () => (document.body.textContent || "").includes("The desert still cools off at night"),
    undefined, { timeout: 30000 });
  await page.waitForSelector('[data-testid="us-map"]', { timeout: 15000 });
  const dots = await page.$$eval('[data-testid="us-map"] [data-city]', (els) => els.map((e) => e.getAttribute("data-city")));
  const allowed = new Set(["phx", "tus", "lv", "ep", "yum"]); // the 5 hot deserts
  const leak = dots.filter((d) => !allowed.has(d));
  if (leak.length) fail(`desert: a non-hot-desert city leaked onto the map (${leak.join(",")})`);
  if (!dots.includes("phx")) fail("desert: Phoenix dot missing");
  if (dots.length !== 5) fail(`desert: expected 5 hot-desert dots, got ${dots.length} (${dots.join(",")})`);
  const rows = await page.$$eval('ol[aria-label="Cities ranked by overnight-low warming"] button', (b) => b.length);
  if (rows !== 5) fail(`desert: expected 5 ranked cities, got ${rows}`);
  const txt = await page.evaluate(() => document.body.textContent || "");
  if (txt.includes("Humid South")) fail("desert: 'Humid South' should not appear in the desert product");
  console.log(`✓ desert product: ${dots.length} hot-desert cities, thesis landing, no leak`);
} catch (e) { fail("desert product landing did not render: " + e.message.split("\n")[0]); }

// A desert deep-link keeps the product context and opens the right city.
await page.goto(`${BASE}/?product=desert&city=phx`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector('[data-testid="city-switcher"]', { timeout: 15000 });
{
  const sw = await page.$eval('[data-testid="city-switcher"]', (b) => b.textContent);
  if (!sw.includes("Phoenix")) fail(`desert deep-link: switcher shows "${sw}", expected Phoenix`);
  else console.log("✓ desert product: ?product=desert&city=phx deep-links into Phoenix");
}
// Same city, different product → different layout: Desert Nights gets the curated
// stack ("The verdict"), proving the two products diverge on the city page too.
try {
  await page.waitForFunction(() => (document.body.textContent || "").includes("The verdict"), undefined, { timeout: 45000 });
  console.log("✓ Desert Nights: phx uses the curated body ('The verdict') — diverges from City Signals");
} catch { fail("Desert Nights: curated body ('The verdict') missing on phx"); }

if (pageErrors.length) fail("uncaught page errors: " + JSON.stringify([...new Set(pageErrors)].slice(0, 8)));

await browser.close();
console.log(failed ? "RENDER SMOKE FAILED" : "RENDER SMOKE PASSED");
process.exit(failed ? 1 : 0);
