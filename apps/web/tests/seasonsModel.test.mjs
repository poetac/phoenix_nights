// Unit test for lib/seasonsModel.js — the SeasonsCard transform. The render smoke test
// only asserts the card MOUNTS; it never reads which season the prose names as the most
// lopsided. This is the net under `maxRatio` — the selector for the season whose lows
// warm fastest relative to its highs — including its highTrend > 0.05 guard (so a
// near-zero high trend can't manufacture a giant ratio) — plus the per-season trends,
// the summer delta, and the guards. Plain node, no deps: run from apps/web.
import { seasonsModel } from "../src/lib/seasonsModel.js";

let failed = false;
const ok = (cond, msg) => { if (!cond) { console.error("✗ FAIL:", msg); failed = true; } };
const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);
const near = (a, b, msg, eps = 1e-9) => ok(Math.abs(a - b) <= eps, `${msg} — got ${a}, expected ≈ ${b}`);

const cityOf = (end) => ({ baseline: { end } });

// One season's perfectly-linear yearly low/high series, so least-squares slopes are exact.
function series({ lowSlope, highSlope, lowBase = 50, highBase = 75, n = 40, y0 = 1970 }) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ year: y0 + i, low: lowBase + lowSlope * i, high: highBase + highSlope * i });
  return out;
}
// A full seasonal asset: every season key the model iterates (DJF/MAM/JJA/SON).
const seasonal = (p) => ({ DJF: series(p.DJF), MAM: series(p.MAM), JJA: series(p.JJA), SON: series(p.SON) });

// --- per-season trends + the summer delta ---
const m = seasonsModel(seasonal({
  DJF: { lowSlope: 0.3, highSlope: 0.1 },   // ratio 3 — the most lopsided VALID season
  MAM: { lowSlope: 0.2, highSlope: 0.1 },   // ratio 2
  JJA: { lowSlope: 0.15, highSlope: 0.1 },  // ratio 1.5 (summer)
  SON: { lowSlope: 0.4, highSlope: 0.004 }, // ratio 100 but highTrend 0.04 — excluded
}), cityOf(1979));
ok(m !== null, "full 4-season asset builds a model");
eq(m.seasons.length, 4, "one row per season");
near(m.seasons[0].lowTrend, 3, "DJF lowTrend = lowSlope*10");
near(m.seasons[0].highTrend, 1, "DJF highTrend = highSlope*10");
eq(m.summer.key, "JJA", "summer = the JJA row");
near(m.summer.delta, 4.5, "summer delta = mean(recent lows) - mean(base lows)");

// --- maxRatio: lows-vs-highs lopsidedness, with the divide-by-tiny guard ---
eq(m.maxRatio.s.key, "DJF", "maxRatio picks the highest VALID ratio (DJF), not SON's 100×");
near(m.maxRatio.r, 3, "maxRatio.r = DJF lowTrend/highTrend");
ok(m.maxRatio.s.key !== "JJA", "winner isn't summer → the card surfaces the clause");

// SON has the largest raw ratio (100×) but its high trend is below the 0.05 floor.
const son = m.seasons.find((s) => s.key === "SON");
ok(son.highTrend <= 0.05, "SON highTrend is below the guard floor");
ok(son.lowTrend / son.highTrend > m.maxRatio.r, "…and its raw ratio exceeds the winner's — so the guard, not the ratio, excluded it");

// --- no season clears the high-trend floor → maxRatio stays the empty seed ---
const flat = seasonsModel(seasonal({
  DJF: { lowSlope: 0.3, highSlope: 0.001 }, MAM: { lowSlope: 0.3, highSlope: 0.001 },
  JJA: { lowSlope: 0.3, highSlope: 0.001 }, SON: { lowSlope: 0.3, highSlope: 0.001 },
}), cityOf(1979));
eq(flat.maxRatio.s, null, "all high trends below floor → maxRatio.s null");
eq(flat.maxRatio.r, 0, "…and maxRatio.r stays 0");

// --- delta null when the baseline window has fewer than 7 years ---
const fewBase = seasonsModel(seasonal({
  DJF: { lowSlope: 0.1, highSlope: 0.1 }, MAM: { lowSlope: 0.1, highSlope: 0.1 },
  JJA: { lowSlope: 0.1, highSlope: 0.1 }, SON: { lowSlope: 0.1, highSlope: 0.1 },
}), cityOf(1972)); // 1970–1972 = 3 base years
eq(fewBase.summer.delta, null, "delta null when <= baseline.end yields < 7 years");

// --- guards ---
eq(seasonsModel(null, cityOf(1979)), null, "null seasonal → null");
const short = seasonal({
  DJF: { lowSlope: 0.1, highSlope: 0.1, n: 20 }, // only 20 years → < 30
  MAM: { lowSlope: 0.1, highSlope: 0.1 }, JJA: { lowSlope: 0.1, highSlope: 0.1 }, SON: { lowSlope: 0.1, highSlope: 0.1 },
});
eq(seasonsModel(short, cityOf(1979)), null, "any season with < 30 years → null");

console.log(failed ? "SEASONSMODEL TEST FAILED" : "SEASONSMODEL TEST PASSED");
process.exit(failed ? 1 : 0);
