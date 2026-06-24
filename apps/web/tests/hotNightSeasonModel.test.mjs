// Unit test for lib/hotNightSeasonModel.js — the HotNightSeasonCard transform (the
// lows-first companion to SeasonLengthCard). The render smoke test only asserts the card
// MOUNTS where it already does; it can't catch a card that should have OMITTED itself.
// This is the net under the expansion guard (the warm-night band must actually lengthen)
// and the two-ended shift math. Plain node, no deps.
import { hotNightSeasonModel } from "../src/lib/hotNightSeasonModel.js";

let failed = false;
const ok = (cond, msg) => { if (!cond) { console.error("✗ FAIL:", msg); failed = true; } };
const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);
const near = (a, b, msg, eps = 1e-9) => ok(Math.abs(a - b) <= eps, `${msg} — got ${a}, expected ≈ ${b}`);

function years(spec) {
  const out = [];
  for (const [a, b, v] of spec) for (let y = a; y <= b; y++) out.push({ year: y, ...v });
  return out;
}
const streaksOf = (yrs) => ({ years: yrs });
const cityOf = (start, end) => ({ baseline: { start, end } });
const E = { first80: 180, last80: 240, count80: 40, firstSus: 190, lastSus: 230 }; // baseline year
const L = { first80: 160, last80: 260, count80: 70, firstSus: 170, lastSus: 250 }; // recent year

// --- a warm-night band lengthening at both ends → renders ---
const m = hotNightSeasonModel(streaksOf(years([
  [2000, 2009, E], [2010, 2025, { ...E, first80: 175, last80: 245 }], [2026, 2035, L],
])), cityOf(2000, 2009));
ok(m !== null, "lengthening band yields a model");
eq(m.nYears, 36, "nYears = years carrying a first/last 80°F night");
near(m.firstShift, 20, "firstShift = mean(early first) - mean(late first) = 180-160 (positive = earlier)");
near(m.lastShift, 20, "lastShift = mean(late last) - mean(early last) = 260-240 (positive = later)");
near(m.lengthGain, 40, "lengthGain = late length - early length = 101-61");
near(m.countEarly, 40, "countEarly = mean baseline 80°F-night count");
near(m.countLate, 70, "countLate = mean recent count");
near(m.susGain, 40, "susGain = mean(late susLen) - mean(early susLen) = 81-41");

// --- guard: a band that didn't lengthen (flat) → omit ---
eq(hotNightSeasonModel(streaksOf(years([[2000, 2009, E], [2010, 2035, E]])), cityOf(2000, 2009)), null,
  "flat band (lengthGain 0) → null");

// --- guard: a band that SHRANK → omit (no inverted "−N days longer") ---
eq(hotNightSeasonModel(streaksOf(years([
  [2000, 2009, E], [2010, 2025, E], [2026, 2035, { ...E, first80: 190, last80: 230 }],
])), cityOf(2000, 2009)), null, "shrinking band (lengthGain < 0) → null");

// --- guard: fewer than 30 years carry a warm-night band → omit ---
eq(hotNightSeasonModel(streaksOf(years([[2000, 2024, L]])), cityOf(2000, 2009)), null,
  "only 25 warm-night years (< 30) → null");
// rows without a first/last 80°F night are filtered out before the 30-year count
eq(hotNightSeasonModel(streaksOf(years([
  [2000, 2014, { first80: null, last80: null, count80: 0 }], [2015, 2034, L],
])), cityOf(2015, 2024)), null, "null-band rows don't count toward the 30-year minimum");

// --- guard: baseline window under 7 years → null ---
eq(hotNightSeasonModel(streaksOf(years([
  [2000, 2009, E], [2010, 2025, { ...E, first80: 175, last80: 245 }], [2026, 2035, L],
])), cityOf(2000, 2005)), null, "baseline window of 6 years (< 7) → null");

// --- susGain null when too few years carry the sustained-run fields ---
const noSus = hotNightSeasonModel(streaksOf(years([
  [2000, 2009, { ...E, firstSus: null, lastSus: null }],
  [2010, 2025, { ...E, first80: 175, last80: 245 }], [2026, 2035, L],
])), cityOf(2000, 2009));
ok(noSus !== null, "still renders without sustained-run data");
eq(noSus.susGain, null, "susGain null when < 5 baseline years carry runs");

// --- guards: missing asset ---
eq(hotNightSeasonModel(null, cityOf(2000, 2009)), null, "null streaks → null");
eq(hotNightSeasonModel({}, cityOf(2000, 2009)), null, "no years → null");

console.log(failed ? "HOTNIGHTSEASONMODEL TEST FAILED" : "HOTNIGHTSEASONMODEL TEST PASSED");
process.exit(failed ? 1 : 0);
