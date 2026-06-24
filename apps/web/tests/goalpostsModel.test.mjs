// Unit test for lib/goalpostsModel.js — the GoalpostsCard transform. The render smoke
// test only asserts the card MOUNTS where it already does; it can't catch a card that
// should have OMITTED itself. This is the net under the cooling-record guard: "the
// 'normal' has been redefined upward by X" may render only when the newest 30-year
// normal actually sits above the oldest — otherwise the prose would invert. Plain node.
import { goalpostsModel } from "../src/lib/goalpostsModel.js";

let failed = false;
const ok = (cond, msg) => { if (!cond) { console.error("✗ FAIL:", msg); failed = true; } };
const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);
const near = (a, b, msg, eps = 1e-9) => ok(Math.abs(a - b) <= eps, `${msg} — got ${a}, expected ≈ ${b}`);

// Rows 1961–2020 with low = f(year). The four NOAA vintages are 30-year windows, so each
// holds 30 ≥ 25 years and qualifies.
function rows(lowOf, { y0 = 1961, y1 = 2020 } = {}) {
  const out = [];
  for (let y = y0; y <= y1; y++) out.push({ year: y, low: lowOf(y) });
  return out;
}

// --- warming record: each rolling normal sits above the last → renders ---
const m = goalpostsModel(rows((y) => y - 1900)); // low rises 1°/yr
ok(m !== null, "warming record yields a model");
eq(m.vintages.length, 4, "all four vintages qualify (each window has 30 ≥ 25 years)");
near(m.vintages[0].low, 75.5, "oldest vintage low = mean(1961–1990)");
near(m.vintages[3].low, 105.5, "newest vintage low = mean(1991–2020)");
near(m.rise, 30, "rise = newest minus oldest vintage low");
near(m.lo, 75.5 - 0.4, "lo = min vintage low minus 0.4");
near(m.hi, 105.5 + 0.4, "hi = max vintage low plus 0.4");

// --- guard: a cooling record (newest normal below oldest) → omit ---
eq(goalpostsModel(rows((y) => 2100 - y)), null, "cooling record (rise < 0) → null");
// boundary: a perfectly flat record gives rise == 0, which is also omitted (rise <= 0)
eq(goalpostsModel(rows(() => 50)), null, "flat record (rise == 0) → null");

// --- guard: fewer than 3 vintages clear the 25-year minimum → omit ---
// Only 1991–2020 has enough years; the older windows are empty or too short.
eq(goalpostsModel(rows((y) => y - 1900, { y0: 1991 })), null,
  "only one 25-year vintage available → null");

// --- the 25-year floor: a window with 24 years doesn't qualify ---
// Give 1991–2014 (24 yrs) plus full older windows: the "today" vintage drops out, but
// the three older vintages still qualify and rise > 0, so it still renders — and the
// newest surviving vintage is 1981–2010, not 1991–2020.
const trimmed = goalpostsModel(rows((y) => y - 1900, { y0: 1961, y1: 2014 }));
ok(trimmed !== null, "three full vintages still render with the newest window short");
eq(trimmed.vintages.length, 3, "the 1991–2020 window (only 24 yrs) is filtered out");
eq(trimmed.vintages[trimmed.vintages.length - 1].span[0], 1981, "newest surviving vintage is 1981–2010");

console.log(failed ? "GOALPOSTSMODEL TEST FAILED" : "GOALPOSTSMODEL TEST PASSED");
process.exit(failed ? 1 : 0);
