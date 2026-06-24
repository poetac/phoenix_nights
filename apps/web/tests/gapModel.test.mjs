// Unit test for lib/gapModel.js — the GapCard transform. The render smoke test only
// asserts the card MOUNTS; it never reads its headline. This is the net under `narrowed`,
// the flag that flips the title between "collapsing" (inland heat-island) and "widening"
// (the maritime signal that runs opposite, e.g. Sydney) — plus the decade bucketing and
// the guards. Plain node, no deps: run from apps/web.
import { gapModel } from "../src/lib/gapModel.js";

let failed = false;
const ok = (cond, msg) => { if (!cond) { console.error("✗ FAIL:", msg); failed = true; } };
const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);
const near = (a, b, msg, eps = 1e-9) => ok(Math.abs(a - b) <= eps, `${msg} — got ${a}, expected ≈ ${b}`);

const DTR_START = 1948;
// Build rows whose diurnal range follows dtr(i): high = 50 + dtr, low = 50, so high-low = dtr.
function rows({ base, slope, y0 = DTR_START, n = 60 }) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const dtr = base + slope * i;
    out.push({ year: y0 + i, high: 50 + dtr, low: 50 });
  }
  return out;
}

// --- narrowed === true: the daily swing collapses (inland fingerprint) ---
const shrink = gapModel(rows({ base: 30, slope: -0.2 }), DTR_START); // 1948–2007, DTR falling
ok(shrink !== null, "shrinking DTR yields a model");
eq(shrink.narrowed, true, "narrowing > 0 → narrowed (collapsing)");
ok(shrink.first.dtr > shrink.last.dtr, "first decade swings wider than the last");
ok(shrink.narrowing > 0, "narrowing = first.dtr - last.dtr > 0");
near(shrink.perDecade, -2, "perDecade = slope*10");

// --- narrowed === false: the daily swing widens (the maritime / Sydney case) ---
const widen = gapModel(rows({ base: 20, slope: 0.2 }), DTR_START);
eq(widen.narrowed, false, "narrowing < 0 → NOT narrowed (widening)");
ok(widen.narrowing < 0, "narrowing < 0 when the gap grows");
near(widen.perDecade, 2, "perDecade tracks the rising trend");

// --- decade bucketing: the leading partial decade (1948–49 = 2 years) is dropped ---
eq(shrink.first.decade, 1950, "1940s (only 2 yrs, < 5) dropped → first decade is the 1950s");
eq(shrink.last.decade, 2000, "last decade is the 2000s (2000–2007 = 8 yrs, kept)");
eq(shrink.data.length, 60, "data carries every year in the window");

// --- guard: fewer than 40 usable years → null ---
eq(gapModel(rows({ base: 30, slope: -0.2, n: 39 }), DTR_START), null, "< 40 years → null");

// --- guard: fewer than 3 decades clear the 5-year floor → null ---
// 4 years in each of ten decades: 40 rows total (passes the year count), but every
// decade has n = 4 < 5, so none qualify.
const sparse = [];
for (let dec = 1950; dec < 2050; dec += 10) for (let k = 0; k < 4; k++) sparse.push({ year: dec + k, high: 70 + k, low: 50 });
eq(sparse.length, 40, "fixture has 40 rows (clears the year-count guard)");
eq(gapModel(sparse, DTR_START), null, "no decade reaches 5 years → < 3 decades → null");

console.log(failed ? "GAPMODEL TEST FAILED" : "GAPMODEL TEST PASSED");
process.exit(failed ? 1 : 0);
