// Unit test for lib/extremesModel.js — the ExtremesCard transform. The render smoke
// test only asserts the card MOUNTS; it never reads which of the three prose branches
// fires. This is the net under the two direction flags that choose that branch:
//   coldRising (is the coldest night warming?) and coldFaster (does the floor outpace
// the ceiling? — the card's thesis). Plain node, no deps: run from apps/web.
import { extremesModel } from "../src/lib/extremesModel.js";

let failed = false;
const ok = (cond, msg) => { if (!cond) { console.error("✗ FAIL:", msg); failed = true; } };
const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);
const near = (a, b, msg, eps = 1e-9) => ok(Math.abs(a - b) <= eps, `${msg} — got ${a}, expected ≈ ${b}`);

const cityOf = (end) => ({ baseline: { end } });

// Perfectly linear warm/cold series so the least-squares slopes are exact: trend = slope*10.
function rows({ coldBase = 50, coldSlope, warmBase = 80, warmSlope, n = 30, y0 = 2000 }) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ year: y0 + i, coldLow: coldBase + coldSlope * i, warmLow: warmBase + warmSlope * i });
  }
  return out;
}

// --- Case A: floor warming, and faster than the ceiling (the Phoenix thesis) ---
const a = extremesModel(rows({ coldSlope: 0.2, warmSlope: 0.05 }), 2000, cityOf(2009));
ok(a !== null, "case A builds a model");
near(a.coldTrend, 2, "coldTrend = coldSlope*10");
near(a.warmTrend, 0.5, "warmTrend = warmSlope*10");
eq(a.coldRising, true, "A: coldRising (coldTrend > 0)");
eq(a.coldFaster, true, "A: coldFaster (coldTrend > warmTrend)");
eq(a.startYear, 2000, "startYear = first year in window");
eq(a.data.length, 30, "data carries every windowed year");
eq(a.recordWarm.year, 2029, "recordWarm = year of the highest warmLow");
near(a.baseCold, 50 + 0.2 * 4.5, "baseCold = mean coldLow over years <= baseline.end (2000–2009)");
near(a.recentCold, 50 + 0.2 * 24.5, "recentCold = mean coldLow over the last 10 years");

// --- Case B: floor warming, but the ceiling climbs faster → "coldFaster" must be false ---
const b = extremesModel(rows({ coldSlope: 0.05, warmSlope: 0.2 }), 2000, cityOf(2009));
eq(b.coldRising, true, "B: coldRising");
eq(b.coldFaster, false, "B: NOT coldFaster (warmTrend > coldTrend)");

// --- Case C: the coldest night is cooling → "coldRising" must be false ---
const c = extremesModel(rows({ coldSlope: -0.1, warmSlope: 0.05 }), 2000, cityOf(2009));
eq(c.coldRising, false, "C: NOT coldRising (coldTrend < 0)");
eq(c.coldFaster, false, "C: NOT coldFaster (cooling floor can't outpace a rising ceiling)");

// --- windowStart filters the series (and re-bases startYear) ---
const w = extremesModel(rows({ coldSlope: 0.1, warmSlope: 0.1, n: 40, y0: 1990 }), 2010, cityOf(2015));
eq(w.startYear, 2010, "windowStart drops earlier years");
eq(w.data.length, 20, "window keeps exactly the in-range years");

// --- baseCold/recentCold null when their window has fewer than 7 years ---
const fewBase = extremesModel(rows({ coldSlope: 0.1, warmSlope: 0.1 }), 2000, cityOf(2004));
eq(fewBase.baseCold, null, "baseCold null when <= baseline.end yields < 7 years");
ok(fewBase.recentCold != null, "recentCold still computed");

// --- guards ---
eq(extremesModel(rows({ coldSlope: 0.1, warmSlope: 0.1, n: 19 }), 2000, cityOf(2009)), null,
  "fewer than 20 usable years → null");
// rows with null extremes are filtered out before the 20-year count
const withGaps = rows({ coldSlope: 0.1, warmSlope: 0.1, n: 19 });
withGaps.push({ year: 2099, coldLow: null, warmLow: 70 });
eq(extremesModel(withGaps, 2000, cityOf(2009)), null,
  "a null-extreme row doesn't count toward the 20-year minimum");

console.log(failed ? "EXTREMESMODEL TEST FAILED" : "EXTREMESMODEL TEST PASSED");
process.exit(failed ? 1 : 0);
