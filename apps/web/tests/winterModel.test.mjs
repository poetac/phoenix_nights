// Unit test for lib/winterModel.js — the WinterCard transform. The render smoke test
// only asserts the card MOUNTS on cities where it already does; it cannot catch a card
// that should have OMITTED itself. This is the net under the frost-disappearance
// applicability guard: "Winter left first" may render only where frost has genuinely
// collapsed, never on a city that still freezes hard (Reno/Salt Lake/Boise/Albuquerque),
// where the numbers would read as the opposite of the headline. Plain node, no deps.
import { winterModel } from "../src/lib/winterModel.js";

let failed = false;
const ok = (cond, msg) => { if (!cond) { console.error("✗ FAIL:", msg); failed = true; } };
const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);
const near = (a, b, msg, eps = 1e-9) => ok(Math.abs(a - b) <= eps, `${msg} — got ${a}, expected ≈ ${b}`);

// Build a years array from [startYear, endYear, frost, cool60] segments.
function years(spec) {
  const out = [];
  for (const [a, b, frost, cool60] of spec) for (let y = a; y <= b; y++) out.push({ year: y, frost, cool60 });
  return out;
}
const streaksOf = (yrs) => ({ years: yrs });

// --- a desert city where frost collapsed: 20 frosts/yr pre-1970, frost-free since 2001 ---
const m = winterModel(streaksOf(years([[1930, 1969, 20, 80], [1970, 2000, 10, 60], [2001, 2020, 0, 40]])));
ok(m !== null, "frost-collapsed city yields a model");
eq(m.data.length, 91, "data carries every year");
near(m.earlyFrost, 20, "earlyFrost = mean pre-1970 frost");
eq(m.lastFrosty.year, 2000, "lastFrosty = the last winter that still hit 5 frosts (a PAST year)");
near(m.zeroFrostShare, 20 / 30, "zeroFrostShare = frost-free share of the last 30 years");
near(m.earlyCool, 80, "earlyCool = mean pre-1970 cool60");
near(m.lateCool, 40, "lateCool = mean cool60 over the last 10 years");

// --- guard: a city that still freezes hard (every recent winter ≥ 5 frosts) → omit ---
// lastFrosty == lastYear AND zeroFrostShare == 0; either alone trips the guard.
eq(winterModel(streaksOf(years([[1930, 1969, 20, 80], [1970, 2020, 10, 60]]))), null,
  "still-freezing city (lastFrosty is this year) → null");

// --- guard: frost shrank below 5 but never hit zero recently → omit ---
eq(winterModel(streaksOf(years([[1930, 1969, 20, 80], [1970, 2000, 10, 60], [2001, 2020, 2, 40]]))), null,
  "no recent frost-free winter (zeroFrostShare == 0) → null");

// --- guard: a city that essentially never froze (never 5 frosts) → omit ---
eq(winterModel(streaksOf(years([[1930, 2020, 2, 40]]))), null,
  "never reached 5 frosts (no lastFrosty) → null");

// --- guard: windows too short (pre-1970 < 30 years) ---
eq(winterModel(streaksOf(years([[1960, 2020, 20, 60]]))), null,
  "fewer than 30 pre-1970 years → null");

// --- guards: missing asset ---
eq(winterModel(null), null, "null streaks → null");
eq(winterModel({}), null, "no years → null");

console.log(failed ? "WINTERMODEL TEST FAILED" : "WINTERMODEL TEST PASSED");
process.exit(failed ? 1 : 0);
