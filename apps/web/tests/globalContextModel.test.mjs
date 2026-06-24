// Unit test for lib/globalContextModel.js — the GlobalContextCard transform. The render
// smoke test only asserts the card MOUNTS where it already does; it can't catch a card
// that should have OMITTED itself. This is the net under the positive-trend guard: the
// "outrunning the Earth" framing requires BOTH the city and its rural reference to be
// warming, else the bar ordering and "× the planet's rate" prose are nonsense. Plain node.
import { globalContextModel } from "../src/lib/globalContextModel.js";

let failed = false;
const ok = (cond, msg) => { if (!cond) { console.error("✗ FAIL:", msg); failed = true; } };
const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);
const near = (a, b, msg, eps = 1e-9) => ok(Math.abs(a - b) <= eps, `${msg} — got ${a}, expected ≈ ${b}`);

const GLOBAL = 0.36; // mirror the model's benchmark for the ×-global expectations
const CITY = { shortName: "Phoenix", rural: { short: "Sonoran" } };
// A station's yearly low series: low = base + slope·i over n years from y0.
function rows(slope, { base = 50, y0 = 1970, n = 31 } = {}) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ year: y0 + i, low: base + slope * i });
  return out;
}

// --- both city and rural warming → renders, bars sorted, multiples computed ---
const m = globalContextModel(rows(0.1), rows(0.05), CITY); // cityTrend 1.0, desertTrend 0.5
ok(m !== null, "both warming yields a model");
near(m.cityTrend, 1.0, "cityTrend = citySlope*10");
near(m.desertTrend, 0.5, "desertTrend = desertSlope*10");
near(m.cityX, 1.0 / GLOBAL, "cityX = cityTrend / global benchmark");
near(m.desertX, 0.5 / GLOBAL, "desertX = desertTrend / global benchmark");
eq(m.bars.length, 4, "four bars (planet, US, rural, city)");
eq(m.bars[m.bars.length - 1].kind, "city", "bars sorted ascending → the fastest (city) is last");
eq(m.bars[0].kind, "bench", "the global benchmark (0.36) sorts first");
eq(m.first, 1970, "first = earliest common year (>= 1970)");
eq(m.last, 2000, "last = latest common year");

// --- desertX branch input: rural can outpace global (> 1) or lag it (< 1) ---
ok(m.desertX > 1, "desertTrend 0.5 > global → desertX > 1 (the 'outpace' branch)");
const slow = globalContextModel(rows(0.1), rows(0.02), CITY); // desertTrend 0.2 < 0.36
ok(slow !== null && slow.desertX < 1, "desertTrend 0.2 < global → desertX < 1 (the 'more slowly' branch)");

// --- guard: the city's nights cooling → omit ---
eq(globalContextModel(rows(-0.1), rows(0.05), CITY), null, "cityTrend <= 0 → null");
// --- guard: the rural reference cooling → omit ---
eq(globalContextModel(rows(0.1), rows(-0.05), CITY), null, "desertTrend <= 0 → null");

// --- only the years both records share, since 1970, count ---
const overlap = globalContextModel(rows(0.1, { y0: 1970, n: 36 }), rows(0.05, { y0: 1980, n: 26 }), CITY);
eq(overlap.first, 1980, "common years start where the rural record begins (1980)");

// --- guard: fewer than 20 common years → null ---
eq(globalContextModel(rows(0.1, { n: 19 }), rows(0.05, { n: 19 }), CITY), null, "< 20 common years → null");

// --- guards: missing records ---
eq(globalContextModel([], rows(0.05), CITY), null, "no city rows → null");
eq(globalContextModel(rows(0.1), [], CITY), null, "no rural rows → null");
eq(globalContextModel(null, null, CITY), null, "null records → null");

console.log(failed ? "GLOBALCONTEXTMODEL TEST FAILED" : "GLOBALCONTEXTMODEL TEST PASSED");
process.exit(failed ? 1 : 0);
