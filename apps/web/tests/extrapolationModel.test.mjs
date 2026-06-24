// Unit test for lib/extrapolationModel.js — the ExtrapolationCard transform. The render
// smoke test only asserts the card MOUNTS; it never checks the projected value, the
// uncertainty fan, or — importantly — that the card correctly OMITS itself when the runway
// is too short or the fit too weak. This is the net under the centroid-pivot projection
// math and those guards. Plain node, no deps: run from apps/web.
import { extrapolationModel } from "../src/lib/extrapolationModel.js";

let failed = false;
const ok = (cond, msg) => { if (!cond) { console.error("✗ FAIL:", msg); failed = true; } };
const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);
const near = (a, b, msg, eps = 1e-9) => ok(Math.abs(a - b) <= eps, `${msg} — got ${a}, expected ≈ ${b}`);

// Flat lows so ybar is exactly 50 and the centroid (xbar) is the midpoint year; the fan
// is then driven purely by the passed-in fit (slope/lo/hi), as in the real card where the
// fit comes precomputed from the headline bootstrap, not from these points.
function rows(n, { y0 = 2000, low = 50 } = {}) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ year: y0 + i, low });
  return out;
}
const FIT = { robust: true, slope: 0.05, lo: 0.02, hi: 0.08 };
const HORIZON = 2050;

// 21 years 2000–2020 → xbar = 2010, ybar = 50, lastYear = 2020.
const m = extrapolationModel(rows(21), FIT, HORIZON);
ok(m !== null, "robust fit + 21 years + far horizon → a model");
eq(m.lastYear, 2020, "lastYear = last recorded year");
near(m.perDecade, 0.5, "perDecade = slope*10");
near(m.at2050, 52, "center(2050) = ybar + slope*(2050-xbar) = 50 + 0.05*40");
near(m.half, 1.2, "half = (hi-lo)*(2050-xbar)/2 = 0.06*40/2");
near(m.recent, 50, "recent = mean of last 10 lows");

// chart series: 21 historical points + a projection row for every year past lastYear
eq(m.data.length, 21 + 30, "data = hist points + one row per projected year to horizon");
eq(m.data[0].year, 2000, "first row is the earliest recorded year");
eq(m.data[0].proj, null, "a pre-lastYear point carries no projection");
eq(m.data[0].band, null, "…and no band");
// the lastYear row carries BOTH the last recorded value and the projection start
const join = m.data[20];
eq(join.year, 2020, "the join row is lastYear");
eq(join.hist, 50, "join row keeps its recorded value");
near(join.proj, 50.5, "join row also starts the projection: center(2020) = 50 + 0.05*10");
// the final row is the horizon, projection-only, with the widened fan
const end = m.data[m.data.length - 1];
eq(end.year, 2050, "last row is the horizon");
eq(end.hist, null, "horizon row is projection-only");
near(end.proj, 52, "horizon proj matches at2050");
ok(end.band[0] === 50.8 && end.band[1] === 53.2, "horizon band = [loLine, hiLine] = [50.8, 53.2]");

// --- guards ---
eq(extrapolationModel(rows(21), null, HORIZON), null, "no fit → null");
eq(extrapolationModel(rows(21), { ...FIT, robust: false }, HORIZON), null, "non-robust fit → null");
eq(extrapolationModel(rows(21), { ...FIT, lo: null }, HORIZON), null, "fit missing a CI bound → null");
eq(extrapolationModel(rows(14), FIT, HORIZON), null, "fewer than 15 finite lows → null");
eq(extrapolationModel(rows(21), FIT, 2025), null, "horizon under a decade past lastYear → null");
// non-finite lows are dropped before the 15-point count
const gappy = rows(14);
gappy.push({ year: 2014, low: null }, { year: 2015, low: NaN });
eq(extrapolationModel(gappy, FIT, HORIZON), null, "null/NaN lows don't count toward the 15-point minimum");

console.log(failed ? "EXTRAPOLATIONMODEL TEST FAILED" : "EXTRAPOLATIONMODEL TEST PASSED");
process.exit(failed ? 1 : 0);
