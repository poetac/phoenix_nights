// Unit test for lib/streakModel.js — the StreakCard transform. The render smoke test
// only asserts the card MOUNTS (and only on cities where it does); it never checks the
// numbers, nor — crucially — that the card correctly OMITS itself. This is the net under
// the guards: the bounded early window, the 7-year minimums, and the applicability floor
// (lateAvg < 2) that keeps the card off cool/humid cities. Plain node, no deps:
// run `node tests/streakModel.test.mjs` from apps/web.
import { streakModel } from "../src/lib/streakModel.js";

let failed = false;
const ok = (cond, msg) => { if (!cond) { console.error("✗ FAIL:", msg); failed = true; } };
const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);
const near = (a, b, msg, eps = 1e-9) => ok(Math.abs(a - b) <= eps, `${msg} — got ${a}, expected ≈ ${b}`);

const cityOf = (start, end) => ({ baseline: { start, end } });
const streaksOf = (years) => ({ years });

// A hot-night city: baseline 2000–2009, record run in 2015, a daytime-110F record in 2018.
function hotYears() {
  const years = [];
  for (let y = 2000; y <= 2020; y++) {
    let s80;
    if (y <= 2009) s80 = 5;          // early window
    else if (y === 2010) s80 = 10;   // gap year — in neither window
    else if (y === 2015) s80 = 40;   // the all-time record, inside the late window
    else s80 = 20;                   // late window
    years.push({ year: y, streak80: s80, streak110: y === 2018 ? 15 : 2 });
  }
  return years;
}

// --- happy path: windows, averages, and both records ---
const m = streakModel(streaksOf(hotYears()), cityOf(2000, 2009));
ok(m !== null, "hot-night city yields a model");
eq(m.data.length, 21, "data carries every year");
near(m.earlyAvg, 5, "earlyAvg = mean of 2000–2009 (all 5)");
near(m.lateAvg, 22, "lateAvg = mean of 2011–2020 (nine 20s + one 40)");
eq(m.record.year, 2015, "record = year of the longest 80F run");
eq(m.record.streak80, 40, "record streak80 value");
eq(m.record110.year, 2018, "record110 = year of the longest 110F day run");
eq(m.record110.streak110, 15, "record110 streak110 value");

// --- the early window is BOUNDED: a year before baseline.start is excluded ---
// 1995 carries a huge streak; if the window were open-ended it would dominate earlyAvg.
const withPre = hotYears();
withPre.unshift({ year: 1995, streak80: 1000, streak110: 0 });
const mPre = streakModel(streaksOf(withPre), cityOf(2000, 2009));
near(mPre.earlyAvg, 5, "earlyAvg ignores the pre-baseline.start year (bounded window)");

// --- guard: fewer than 7 years in the baseline window → null ---
eq(streakModel(streaksOf(hotYears()), cityOf(2000, 2005)), null,
  "baseline window of 6 years (< 7) → null");

// --- guard: fewer than 7 years in the last decade → null (isolated from the early guard) ---
// 2000–2008 contiguous (early = 9 ≥ 7), then a lone 2020 → late window holds just 1 year.
const sparseLate = [];
for (let y = 2000; y <= 2008; y++) sparseLate.push({ year: y, streak80: 5, streak110: 1 });
sparseLate.push({ year: 2020, streak80: 5, streak110: 1 });
eq(streakModel(streaksOf(sparseLate), cityOf(2000, 2009)), null,
  "only 1 year in the last decade (< 7) → null");

// --- applicability: recent average below 2 nights → null (the card omits itself) ---
const cool = hotYears().map((r) => (r.year > 2010 ? { ...r, streak80: 1 } : r));
eq(streakModel(streaksOf(cool), cityOf(2000, 2009)), null,
  "lateAvg < 2 → null (keeps the card off cool/humid cities)");
// And the boundary holds: a recent average of exactly 2 is NOT omitted.
const atFloor = hotYears().map((r) => (r.year > 2010 ? { ...r, streak80: 2 } : r));
ok(streakModel(streaksOf(atFloor), cityOf(2000, 2009)) !== null, "lateAvg == 2 is kept (>= floor)");

// --- guards: missing asset ---
eq(streakModel(null, cityOf(2000, 2009)), null, "null streaks → null");
eq(streakModel({}, cityOf(2000, 2009)), null, "no years → null");

console.log(failed ? "STREAKMODEL TEST FAILED" : "STREAKMODEL TEST PASSED");
process.exit(failed ? 1 : 0);
