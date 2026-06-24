// Unit test for lib/seasonLengthModel.js — the SeasonLengthCard transform. The render
// smoke test only asserts the card MOUNTS where it already does; it can't catch a card
// that should have OMITTED itself. This is the net under the expansion guard: "the season
// runs N days longer" may render only where the 100°F season actually lengthened — never
// on a city whose band shrank (Dallas) or is flat (Albuquerque), where it would invert.
// Plain node, no deps.
import { seasonLengthModel } from "../src/lib/seasonLengthModel.js";

let failed = false;
const ok = (cond, msg) => { if (!cond) { console.error("✗ FAIL:", msg); failed = true; } };
const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);
const near = (a, b, msg, eps = 1e-9) => ok(Math.abs(a - b) <= eps, `${msg} — got ${a}, expected ≈ ${b}`);

// years from [startYear, endYear, fields] segments.
function years(spec) {
  const out = [];
  for (const [a, b, v] of spec) for (let y = a; y <= b; y++) out.push({ year: y, ...v });
  return out;
}
const seasonOf = (yrs) => ({ years: yrs });
const cityOf = (start, end) => ({ baseline: { start, end } });
const E = { first: 170, last: 240, length: 70, count: 50, firstRun: 180, lastRun: 230 }; // baseline year
const L = { first: 150, last: 260, length: 110, count: 80, firstRun: 160, lastRun: 250 }; // recent year

// --- an expanding 100°F season → renders ---
const m = seasonLengthModel(seasonOf(years([
  [2000, 2009, E], [2010, 2010, { ...E, length: 90 }], [2011, 2020, L],
])), cityOf(2000, 2009));
ok(m !== null, "expanding season yields a model");
eq(m.nYears, 21, "nYears = every year on record");
near(m.lengthGain, 40, "lengthGain = mean(late length) - mean(early length) = 110-70");
near(m.firstShift, 20, "firstShift = mean(early first) - mean(late first) = 170-150 (positive = earlier)");
near(m.countEarly, 50, "countEarly = mean baseline 100°F-day count");
near(m.countLate, 80, "countLate = mean recent count");
near(m.susGain, 40, "susGain = mean(late susLen) - mean(early susLen) = 91-51");

// --- guard: a season that barely moved (rounds to < 1 day longer) → omit ---
eq(seasonLengthModel(seasonOf(years([
  [2000, 2009, E], [2010, 2010, E], [2011, 2020, { ...E, length: 70.3 }],
])), cityOf(2000, 2009)), null, "length gain rounding below 1 day → null (flat city)");

// --- guard: a season that actually SHRANK → omit (no inverted "−10 days longer") ---
eq(seasonLengthModel(seasonOf(years([
  [2000, 2009, E], [2010, 2010, E], [2011, 2020, { ...E, length: 60 }],
])), cityOf(2000, 2009)), null, "shrinking season (lengthGain < 0) → null (Dallas case)");

// --- guard: baseline window under 7 years → null ---
eq(seasonLengthModel(seasonOf(years([[2000, 2020, L]])), cityOf(2000, 2005)), null,
  "baseline window of 6 years (< 7) → null");

// --- susGain is null when too few years carry the sustained-run fields ---
const noSus = seasonLengthModel(seasonOf(years([
  [2000, 2009, { ...E, firstRun: null, lastRun: null }], [2010, 2010, E], [2011, 2020, L],
])), cityOf(2000, 2009));
ok(noSus !== null, "still renders without sustained-run data");
eq(noSus.susGain, null, "susGain null when < 5 baseline years carry runs");

// --- guards: missing asset ---
eq(seasonLengthModel(null, cityOf(2000, 2009)), null, "null heatSeason → null");
eq(seasonLengthModel({}, cityOf(2000, 2009)), null, "no years → null");

console.log(failed ? "SEASONLENGTHMODEL TEST FAILED" : "SEASONLENGTHMODEL TEST PASSED");
process.exit(failed ? 1 : 0);
