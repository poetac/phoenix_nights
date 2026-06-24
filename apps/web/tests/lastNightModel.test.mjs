// Unit test for lib/lastNightModel.js — the LastNightHero transform. The render smoke test
// only asserts the hero MOUNTS; it never reads which sentence it shows. This is the net
// under the two flags that pick that sentence — `warmer` (anomLow >= 0) and `near`
// (|anomLow| < 1, which flips the hero to "landed right on the normal") — plus the
// date-normal lookup and its Feb-29 fallback. Plain node, no deps.
import { lastNightModel } from "../src/lib/lastNightModel.js";

let failed = false;
const ok = (cond, msg) => { if (!cond) { console.error("✗ FAIL:", msg); failed = true; } };
const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);

const NORMALS = { byDate: { "01-15": { low: 40, high: 65 }, "02-28": { low: 45, high: 60 } } };

// --- a warm night, not near the normal → warmer + not near ---
const m = lastNightModel({ date: "2026-01-15", low: 44.4, high: 70.2 }, NORMALS);
ok(m !== null, "a night with a date-normal yields a model");
eq(m.low, 44, "low rounded");
eq(m.normLow, 40, "normLow rounded");
eq(m.anomLow, 4, "anomLow = low - normLow");
eq(m.warmer, true, "warmer = anomLow >= 0");
eq(m.near, false, "not near (|anomLow| = 4 >= 1)");
eq(m.anomHigh, 5, "anomHigh = high - normHigh = 70 - 65");
eq(m.dateLabel, "January 15", "dateLabel formatted from the date");

// --- low rounds onto the normal → near (and the rounded anomaly is exactly 0) ---
const onNormal = lastNightModel({ date: "2026-01-15", low: 40.3 }, NORMALS);
eq(onNormal.anomLow, 0, "anomLow rounds to 0 when the low lands on the normal");
eq(onNormal.near, true, "near = true at anomLow 0 (the '|anomLow| < 1' branch is integer-exact)");
eq(onNormal.warmer, true, "warmer true at exactly 0 (>= 0)");

// --- a cold night → not warmer ---
const cold = lastNightModel({ date: "2026-01-15", low: 36 }, NORMALS);
eq(cold.anomLow, -4, "anomLow negative below the normal");
eq(cold.warmer, false, "warmer false below the normal");

// --- Feb-29: no "02-29" normal → falls back to "02-28" ---
const leap = lastNightModel({ date: "2024-02-29", low: 50 }, NORMALS);
ok(leap !== null, "Feb-29 resolves via the 02-28 fallback");
eq(leap.normLow, 45, "…using the 02-28 normal (45)");

// --- anomHigh is null when the night or the normal lacks a high ---
const noHigh = lastNightModel({ date: "2026-01-15", low: 44 }, NORMALS);
eq(noHigh.anomHigh, null, "anomHigh null when the night has no high");

// --- guards ---
eq(lastNightModel({ date: "2026-07-04", low: 70 }, { byDate: { "01-15": { low: 40 } } }), null,
  "a date with no normal and no 02-28 fallback → null");
eq(lastNightModel({ date: "2026-01-15", low: 44 }, { byDate: { "01-15": { low: null, high: 65 } } }), null,
  "date-normal present but low null → null");
eq(lastNightModel(null, NORMALS), null, "null lastNight → null");
eq(lastNightModel({ date: "2026-01-15", low: 44 }, null), null, "null normals → null");
eq(lastNightModel({ date: "2026-01-15", low: 44 }, {}), null, "normals without byDate → null");

console.log(failed ? "LASTNIGHTMODEL TEST FAILED" : "LASTNIGHTMODEL TEST PASSED");
process.exit(failed ? 1 : 0);
