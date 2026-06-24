// Unit test for lib/gridModel.js — the GridCard transform. The render smoke test only
// asserts the card MOUNTS; it never reads the prose. This is the net under the two
// direction clauses (compare/floor), whose whole reason to exist is that they must read
// true for any grid city, not just Phoenix — including Tucson, whose evening peak fell
// (the "twice as fast … (-2%)" bug the card's history cites). Plain node, no deps:
// run `node tests/gridModel.test.mjs` from apps/web.
import { gridModel } from "../src/lib/gridModel.js";

let failed = false;
const ok = (cond, msg) => { if (!cond) { console.error("✗ FAIL:", msg); failed = true; } };
const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);
const has = (s, sub, msg) =>
  ok(typeof s === "string" && s.includes(sub), `${msg} — got ${JSON.stringify(s)}, expected to contain ${JSON.stringify(sub)}`);
const near = (a, b, msg, eps = 1e-9) => ok(Math.abs(a - b) <= eps, `${msg} — got ${a}, expected ≈ ${b}`);

// A 4-year grid: only the first and last year are read (then/now); the middle two just
// satisfy the keys.length >= 4 gate. min/max of the mw arrays drive trough/peak growth;
// troughPct drives the floor clause. Each mw is [trough, peak] so min/max are explicit.
function grid(thenMw, nowMw, tpThen, tpNow) {
  return {
    years: {
      "2000": { mw: thenMw, troughPct: tpThen },
      "2001": { mw: [], troughPct: 0 },
      "2002": { mw: [], troughPct: 0 },
      "2003": { mw: nowMw, troughPct: tpNow },
    },
    respondents: "Test ISO",
  };
}

// --- compare: the trough-vs-peak growth clause (floor held flat at 20% throughout) ---
// Tucson case: trough grew 25%, peak FELL 2% → must say "fell", not "+-2%".
has(gridModel(grid([40, 100], [50, 98], 20, 20)).compare,
  "while the evening peak fell 2%", "peak fell → 'fell 2%'");
// Peak essentially flat (0%): "barely moved".
has(gridModel(grid([40, 100], [50, 100], 20, 20)).compare,
  "while the evening peak barely moved", "peak flat → 'barely moved'");
// Boise case: trough lagged the peak (ratio 0.5) → "slower".
has(gridModel(grid([40, 100], [44, 120], 20, 20)).compare,
  "slower than the evening peak (+20%)", "ratio 0.5 → 'slower'");
// ratio 1.0 → "about as fast".
has(gridModel(grid([40, 100], [48, 120], 20, 20)).compare,
  "about as fast as the evening peak (+20%)", "ratio 1.0 → 'about as fast'");
// ratio 1.5 → "faster".
has(gridModel(grid([40, 100], [52, 120], 20, 20)).compare,
  "faster than the evening peak (+20%)", "ratio 1.5 → 'faster'");
// Phoenix case: ratio 2.0 → "roughly 2× as fast".
has(gridModel(grid([40, 100], [56, 120], 20, 20)).compare,
  "roughly 2× as fast as the evening peak (+20%)", "ratio 2.0 → 'roughly 2×'");

// --- floor: the trough-as-%-of-peak clause (mw held at the "barely moved" baseline) ---
has(gridModel(grid([40, 100], [50, 100], 20, 25)).floor,
  "now holds at 25% of peak load, up from 20%", "floor +5 → 'up from'");
has(gridModel(grid([40, 100], [50, 100], 25, 20)).floor,
  "now sits at 20% of peak load, down from 25%", "floor -5 → 'down from'");
has(gridModel(grid([40, 100], [50, 100], 20, 20)).floor,
  "holds near 20% of peak load (20% then)", "floor flat → 'holds near'");

// --- shape: growth numbers, then/now keys, and the chart series ---
const m = gridModel(grid([40, 100], [50, 98], 20, 20));
near(m.troughGrowth, 25, "troughGrowth = (50/40-1)*100");
near(m.peakGrowth, -2, "peakGrowth = (98/100-1)*100");
eq(m.thenK, "2000", "thenK = first year");
eq(m.nowK, "2003", "nowK = last year");
eq(m.data.length, 2, "data has one point per hour");
ok(m.data[0].then === 40 && m.data[0].now === 50, "data[0] carries then/now");
ok(Array.isArray(m.data[1].band) && m.data[1].band[0] === 100 && m.data[1].band[1] === 98,
  "data band = [then, now]");
eq(m.month, "July", "month defaults to July");
has(m.source, "EIA", "source defaults to the EIA label");

// --- guards: null (card renders nothing) when the asset is missing or too short ---
eq(gridModel(null), null, "null grid → null");
eq(gridModel({}), null, "no years → null");
eq(gridModel({ years: {} }), null, "0 years → null");
eq(gridModel({ years: { "2000": { mw: [1], troughPct: 1 }, "2001": {}, "2002": {} } }), null,
  "3 years (< 4) → null");

console.log(failed ? "GRIDMODEL TEST FAILED" : "GRIDMODEL TEST PASSED");
process.exit(failed ? 1 : 0);
