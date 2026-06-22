// Unit test for the freshness layer (src/lib/freshness.js) — the logic behind the
// "data through YYYY" staleness banner. It has to read the through-year from four
// different asset shapes (stamp / years[] / years{} / series[] / yearsCovered) and
// must NOT flag a current asset, nor mis-read an empty one. The render smoke test
// can't see a wrong banner, so this is the net under it.
// Plain node, no deps: run `node tests/freshness.test.mjs` from apps/web.
import { assetThroughYear, assetFreshness } from "../src/lib/freshness.js";
import { lastCompleteYear } from "../src/lib/data.js";

let failed = false;
const ok = (cond, msg) => { if (!cond) { console.error("✗ FAIL:", msg); failed = true; } };
const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} — got ${a}, expected ${b}`);

const TARGET = lastCompleteYear(); // current year − 1, derived (never hardcoded)

// --- assetThroughYear: the build-time stamp wins when present ---
eq(assetThroughYear(null), null, "assetThroughYear(null) → null");
eq(assetThroughYear(undefined), null, "assetThroughYear(undefined) → null");
eq(assetThroughYear({ throughYear: 2025 }), 2025, "throughYear stamp → that year");
eq(assetThroughYear({ throughYear: 2019, years: [{ year: 2025 }] }), 2019,
  "stamp preferred over derived data");

// --- four asset shapes the app actually emits ---
eq(assetThroughYear({ years: [{ year: 1990 }, { year: 2024 }, { year: 2010 }] }), 2024,
  "years[] (streaks/heat-season) → max year");
eq(assetThroughYear({ years: { 2019: {}, 2025: {}, 2022: {} } }), 2025,
  "years{} (grid, keyed by year) → max key");
eq(assetThroughYear({ series: [{ year: 1948 }, { year: 2019 }] }), 2019,
  "series[] (GHCN) → max year");
eq(assetThroughYear({ yearsCovered: [1948, 2025] }), 2025, "yearsCovered[1] (diurnal)");

// --- a fixed baseline (1970s normals) is not a moving series → null, not stale ---
eq(assetThroughYear({ byDate: {} }), null, "normals baseline → null (not a time series)");

// --- defensive: an empty container must be null, never -Infinity (would false-flag stale) ---
eq(assetThroughYear({ years: {} }), null, "empty years{} → null (not -Infinity)");
eq(assetThroughYear({ years: [] }), null, "empty years[] → null");
eq(assetThroughYear({ series: [] }), null, "empty series[] → null");

// --- assetFreshness: through / target / stale / generated ---
eq(assetFreshness({ a: null, b: undefined }), null, "all-undated assets → null");
{
  // a current asset + a Sydney-style stale GHCN series (ends 2019)
  const f = assetFreshness({
    streaks: { throughYear: TARGET, generated: "2026-06-01" },
    series: { throughYear: 2019, generated: "2026-06-22" },
  });
  eq(f.through, TARGET, "through = newest year across assets");
  eq(f.target, TARGET, "target = lastCompleteYear()");
  eq(f.stale.length, 1, "exactly one stale asset");
  eq(f.stale[0].year, 2019, "the stale one is the 2019 series");
  eq(f.generated, "2026-06-22", "generated = most recent build stamp");
}
{
  // De Bilt-style: a series current through target is NOT stale (no false banner)
  const f = assetFreshness({ series: { throughYear: TARGET } });
  eq(f.stale.length, 0, "series current to target → not stale");
}
{
  // an undated asset (normals) is ignored, not miscounted as stale
  const f = assetFreshness({ normals: { byDate: {} }, streaks: { throughYear: 2019 } });
  eq(f.stale.length, 1, "undated asset ignored; only the dated-and-behind one is stale");
}

console.log(failed ? "FRESHNESS TESTS FAILED"
  : "✓ freshness.js: assetThroughYear (4 shapes + empty guard) / assetFreshness");
process.exit(failed ? 1 : 0);
