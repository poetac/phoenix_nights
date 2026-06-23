// Registry-parity test: the front-end city registry (src/lib/cities.js) and the
// Python pipeline registry (analysis/cities.py) are two hand-maintained copies of
// the same truth, and they drift. That drift already shipped a bug: boi opted into
// the diurnal card in cities.js but its diurnal config was missing from cities.py,
// so `build_diurnal.py --city boi` KeyError'd and the rebuild silently skipped it
// (#98). This is the net under that class — it asserts the two registries agree on
// the city set, the station ids, the rural pair, the source, and every per-card
// opt-in. The diurnal-opt-in assertion below is precisely the one that would have
// caught the boi orphan before it merged.
//
// cities.js evaluates natively here (zero parsing, and withAssets surfaces each
// opt-in as a `<asset>Asset` key); cities.py is a flat dict literal we regex. Plain
// node, no deps: run `node tests/registry.test.mjs` from apps/web.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CITIES } from "../src/lib/cities.js";

let failed = false;
const ok = (cond, msg) => { if (!cond) { console.error("✗ FAIL:", msg); failed = true; } };
const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} — js/py disagree: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);

// --- the front-end registry (canonical object, no parsing) ---
const js = {};
for (const c of CITIES) {
  js[c.id] = {
    threadSid: c.threadSid ?? null,
    ruralSid: c.rural?.sid ?? null,
    source: c.source ?? "acis",
    hasGrid: "gridAsset" in c,
    hasDiurnal: "diurnalAsset" in c,
  };
}

// --- the Python registry (regex the CITIES dict literal) ---
const here = dirname(fileURLToPath(import.meta.url));
const pyText = readFileSync(join(here, "../../../analysis/cities.py"), "utf8");
// Bound the parse to the CITIES = { ... } literal; stop at the _GHCN_SIDS block,
// which injects ghcn_sid into US cities out-of-band (not a city definition).
const start = pyText.indexOf("CITIES = {");
const end = pyText.indexOf("_GHCN_SIDS", start);
ok(start >= 0 && end > start, "cities.py: located the CITIES literal");
const region = pyText.slice(start, end);
// Each city is a 4-space-indented `"key": {` block; nested grid/diurnal blocks are
// 8-space-indented, so they never match as boundaries.
const keyRe = /^ {4}"(\w+)": \{$/gm;
const bounds = [];
for (let m; (m = keyRe.exec(region)); ) bounds.push({ key: m[1], at: m.index });
const py = {};
bounds.forEach((b, i) => {
  const block = region.slice(b.at, i + 1 < bounds.length ? bounds[i + 1].at : region.length);
  const grab = (re) => { const x = block.match(re); return x ? x[1] : null; };
  py[b.key] = {
    // "sid": won't match inside "rural_sid":/"ghcn_sid": (no quote precedes `sid`).
    threadSid: grab(/"sid":\s*"([^"]+)"/),
    ruralSid: grab(/"rural_sid":\s*"([^"]+)"/),
    source: grab(/"source":\s*"([^"]+)"/) ?? "acis",
    hasGrid: /"grid":\s*\{/.test(block),
    hasDiurnal: /"diurnal":\s*\{/.test(block),
  };
});

// --- 1. same set of cities on both sides ---
const jsIds = Object.keys(js).sort();
const pyIds = Object.keys(py).sort();
eq(jsIds.join(","), pyIds.join(","), "city id sets match");

// --- 2. per-city field parity (only for ids present on both sides) ---
for (const id of jsIds.filter((k) => k in py)) {
  const j = js[id], p = py[id];
  // source: cities.js `source:"ghcn"` <-> cities.py `"source":"ghcn"` (default acis)
  eq(j.source, p.source, `${id}: source`);
  // station id: ACIS ThreadEx sid (US only — ghcn cities query a GHCN id instead)
  if (j.source === "acis") eq(p.threadSid, j.threadSid, `${id}: ACIS sid == threadSid`);
  // rural pair: present-or-absent must agree, and match when present (dbt has none)
  eq(p.ruralSid !== null, j.ruralSid !== null, `${id}: rural pair present-or-absent`);
  if (p.ruralSid && j.ruralSid) eq(p.ruralSid, j.ruralSid, `${id}: rural sid`);
  // per-card opt-ins: a card a city renders must have a builder config behind it
  eq(j.hasGrid, p.hasGrid, `${id}: grid opt-in`);
  eq(j.hasDiurnal, p.hasDiurnal, `${id}: diurnal opt-in`); // the boi-orphan guard
}

// guard the parser itself: if a refactor of cities.py breaks the regexes, the loop
// above could silently pass on zero cities — so assert we actually parsed them.
ok(pyIds.length >= 16, `cities.py: parsed all cities (got ${pyIds.length})`);

console.log(failed
  ? "REGISTRY PARITY FAILED"
  : `✓ registry parity: cities.js <-> cities.py agree (${jsIds.length} cities: ids, sids, rural, source, opt-ins)`);
process.exit(failed ? 1 : 0);
