// Unit test for lib/nightCoolingModel.js — the NightCoolingCard transform. The render
// smoke test only asserts the card MOUNTS where it already does; it can't catch a card
// that should have OMITTED itself. This is the net under the baseline-share premise
// guard: "the night's share of cooling demand" only makes sense where the baseline night
// share is positive, so a high-elevation city whose 1970s nights had net-negative cooling
// demand (El Paso) must self-omit. Plain node, no deps.
import { nightCoolingModel } from "../src/lib/nightCoolingModel.js";

let failed = false;
const ok = (cond, msg) => { if (!cond) { console.error("✗ FAIL:", msg); failed = true; } };
const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);
const near = (a, b, msg, eps = 1e-9) => ok(Math.abs(a - b) <= eps, `${msg} — got ${a}, expected ≈ ${b}`);

// years from [startYear, endYear, nightCdd, dayCdd] segments.
function years(spec) {
  const out = [];
  for (const [a, b, night, day] of spec) for (let y = a; y <= b; y++) out.push({ year: y, nightCdd: night, dayCdd: day });
  return out;
}
const splitOf = (yrs) => ({ years: yrs });
const cityOf = (start, end) => ({ baseline: { start, end } });

// --- a city where the night's share of the cooling bill rises → renders ---
const m = nightCoolingModel(
  splitOf(years([[1970, 1979, 10, 40], [1980, 2010, 20, 45], [2011, 2020, 30, 50]])),
  cityOf(1970, 1979));
ok(m !== null, "positive baseline night share yields a model");
eq(m.data.length, 51, "data carries every year");
near(m.baseShare, 20, "baseShare = 100·sum(night)/sum(total) over the baseline (100/500)");
near(m.nowShare, 37.5, "nowShare over the last 10 years (300/800)");
near(m.nightGrowth, 3, "nightGrowth = mean(late night)/mean(base night) = 30/10");
near(m.dayGrowth, 1.25, "dayGrowth = mean(late day)/mean(base day) = 50/40");

// --- premise guard: a city with net-negative baseline night CDD → omit ---
eq(nightCoolingModel(
  splitOf(years([[1970, 1979, -5, 40], [1980, 2010, 20, 45], [2011, 2020, 30, 50]])),
  cityOf(1970, 1979)), null, "baseline night share <= 0 → null (the El Paso case)");

// --- guard: fewer than 30 years → null ---
eq(nightCoolingModel(splitOf(years([[1970, 1998, 10, 40]])), cityOf(1970, 1979)), null,
  "fewer than 30 years → null");

// --- guard: baseline window under 5 years → null ---
eq(nightCoolingModel(splitOf(years([[1970, 2020, 10, 40]])), cityOf(1970, 1973)), null,
  "baseline window of 4 years (< 5) → null");

// --- guards: missing asset ---
eq(nightCoolingModel(null, cityOf(1970, 1979)), null, "null cddSplit → null");
eq(nightCoolingModel({}, cityOf(1970, 1979)), null, "no years → null");

console.log(failed ? "NIGHTCOOLINGMODEL TEST FAILED" : "NIGHTCOOLINGMODEL TEST PASSED");
process.exit(failed ? 1 : 0);
