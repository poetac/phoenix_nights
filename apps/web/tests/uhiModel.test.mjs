// Unit test for lib/uhiModel.js — the UhiCard transform. The render smoke test only
// asserts the card MOUNTS where it already does; it can't catch a card that should have
// OMITTED itself. This is the net under the UHI-excess guard: the control card's claim is
// that the city's nights warm FASTER than its rural reference's, so where that excess
// isn't positive the "urban heat island" framing is false and the card must self-omit.
// Plain node, no deps.
import { uhiModel } from "../src/lib/uhiModel.js";

let failed = false;
const ok = (cond, msg) => { if (!cond) { console.error("✗ FAIL:", msg); failed = true; } };
const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);
const near = (a, b, msg, eps = 1e-6) => ok(Math.abs(a - b) <= eps, `${msg} — got ${a}, expected ≈ ${b}`);

// A station's yearly low series: low = base + slope·i over n years from y0.
function rows(slope, { base = 50, y0 = 1970, n = 41 } = {}) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ year: y0 + i, low: base + slope * i });
  return out;
}

// --- city warming faster than its rural reference → renders ---
// slopes 0.2 / 0.1 keep every low on a clean 0.1° grid, so the model's toFixed(1) is exact.
const m = uhiModel(rows(0.2, { base: 60 }), rows(0.1, { base: 50 })); // cityTrend 2.0, desertTrend 1.0
ok(m !== null, "city outpacing rural yields a model");
eq(m.data.length, 41, "data carries every common year");
near(m.stats.cityTrend, 2.0, "cityTrend = citySlope*10");
near(m.stats.desertTrend, 1.0, "desertTrend = desertSlope*10");
near(m.stats.excess, 1.0, "excess = cityTrend - desertTrend");
near(m.stats.share, 0.5, "share = excess / cityTrend");
eq(m.stats.gaps.length, 4, "four decades clear the 4-year gap floor (the lone 2010 year is dropped)");
eq(m.stats.gaps[0].decade, 1970, "gaps sorted ascending → 1970s first");
near(m.stats.gaps[0].gap, 10.45, "1970s gap = mean(city - desert) over 1970–1979 = 10 + 0.1·4.5");
eq(m.stats.first, 1970, "first common year");
eq(m.stats.last, 2010, "last common year");

// --- guard: the city NOT outpacing rural (excess <= 0) → omit ---
eq(uhiModel(rows(0.1, { base: 60 }), rows(0.2, { base: 50 })), null,
  "city warming slower than rural (excess < 0) → null");
eq(uhiModel(rows(0.1, { base: 60 }), rows(0.1, { base: 50 })), null,
  "city and rural warming equally (excess == 0) → null");

// --- only the years both records share count (intersection) ---
const overlap = uhiModel(rows(0.2, { base: 60, y0: 1970, n: 41 }), rows(0.1, { base: 50, y0: 1980, n: 41 }));
eq(overlap.stats.first, 1980, "common years start where the rural record begins (1980)");
eq(overlap.data.length, 31, "31 shared years (1980–2010)");

// --- guard: fewer than 30 common years → null ---
eq(uhiModel(rows(0.1, { base: 60, n: 29 }), rows(0.04, { base: 50, n: 29 })), null, "< 30 common years → null");

// --- guard: fewer than 2 decades clear the 4-year gap floor → null ---
// 3 years in each of ten decades (30 common years, but every decade has only 3).
const sCity = [], sRural = [];
for (let dec = 1970; dec < 2070; dec += 10) for (let k = 0; k < 3; k++) {
  sCity.push({ year: dec + k, low: 60 + 0.1 * (dec + k - 1970) }); // rising → cityTrend > 0, excess would pass
  sRural.push({ year: dec + k, low: 50 });
}
eq(sCity.length, 30, "fixture has 30 common years");
eq(uhiModel(sCity, sRural), null, "no decade reaches 4 years → < 2 gap decades → null");

// --- guards: empty records ---
eq(uhiModel([], rows(0.04)), null, "no city rows → null");
eq(uhiModel(rows(0.1), []), null, "no rural rows → null");

console.log(failed ? "UHIMODEL TEST FAILED" : "UHIMODEL TEST PASSED");
process.exit(failed ? 1 : 0);
