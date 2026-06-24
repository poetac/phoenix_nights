// Unit test for the units layer (src/lib/units.js). The render smoke test asserts
// cards mount and don't throw, but it does NOT check that temperature strings are
// correct — so this is the net under the conversion math. Two things matter most:
//   1. imperial is the exact IDENTITY (the live US product can't drift), and
//   2. metric conversions are right, including the delta rule (5/9, no 32° offset).
// Plain node, no deps: run `node tests/units.test.mjs` from apps/web.
import {
  unitsOf, convTemp, convTempDelta, convDist,
  tempUnit, tempRateUnit, convDistPhrase,
} from "../src/lib/units.js";

let failed = false;
const ok = (cond, msg) => { if (!cond) { console.error("✗ FAIL:", msg); failed = true; } };
const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} — got ${a}, expected ${b}`);
const near = (a, b, msg, eps = 1e-9) => ok(Math.abs(a - b) <= eps, `${msg} — got ${a}, expected ≈ ${b}`);

// --- which system a city uses (default imperial; metric is opt-in) ---
eq(unitsOf(undefined), "imperial", "unitsOf(undefined)");
eq(unitsOf(null), "imperial", "unitsOf(null)");
eq(unitsOf({}), "imperial", "unitsOf({}) defaults imperial");
eq(unitsOf({ units: "imperial" }), "imperial", "unitsOf(imperial)");
eq(unitsOf({ units: "metric" }), "metric", "unitsOf(metric)");

// --- imperial is the exact identity (the safety keystone) ---
for (const v of [-40, -7.5, 0, 0.36, 32, 41, 77, 98.6, 100, 116.7]) {
  eq(convTemp(v, "imperial"), v, `convTemp(${v}, imperial) identity`);
  eq(convTempDelta(v, "imperial"), v, `convTempDelta(${v}, imperial) identity`);
}
for (const v of [0, 1, 45, 200.5]) eq(convDist(v, "imperial"), v, `convDist(${v}, imperial) identity`);

// --- absolute temperature: °F -> °C (offset + scale) ---
near(convTemp(32, "metric"), 0, "32°F -> 0°C");
near(convTemp(212, "metric"), 100, "212°F -> 100°C");
near(convTemp(-40, "metric"), -40, "-40°F -> -40°C");
near(convTemp(98.6, "metric"), 37, "98.6°F -> 37°C");
near(convTemp(50, "metric"), 10, "50°F -> 10°C");

// --- a delta/trend: scale by 5/9, NO 32° offset (the classic bug guard) ---
near(convTempDelta(1.8, "metric"), 1.0, "1.8°F/dec delta -> 1.0°C/dec");
near(convTempDelta(9, "metric"), 5, "9°F gap -> 5°C gap");
near(convTempDelta(0.36, "metric"), 0.2, "0.36°F/dec (global) -> 0.20°C/dec");
near(convTempDelta(1.16, "metric"), 0.6444444444, "1.16°F/dec (Phoenix) -> 0.64°C/dec");

// --- distance: miles -> km ---
near(convDist(1, "metric"), 1.609344, "1 mile -> km");
near(convDist(45, "metric"), 72.42048, "45 miles -> km");

// --- unit labels ---
eq(tempUnit("imperial"), "°F", "tempUnit imperial");
eq(tempUnit("metric"), "°C", "tempUnit metric");
eq(tempRateUnit("imperial"), "°F/decade", "tempRateUnit imperial");
eq(tempRateUnit("metric"), "°C/decade", "tempRateUnit metric");

// --- rural-distance phrases (UhiCard prose): imperial identity, metric -> km ---
eq(convDistPhrase("~45 miles", "imperial"), "~45 miles", "convDistPhrase imperial identity");
eq(convDistPhrase("~55 miles southwest", "imperial"), "~55 miles southwest", "convDistPhrase imperial keeps dir");
eq(convDistPhrase(undefined, "metric"), undefined, "convDistPhrase undefined passthrough");
eq(convDistPhrase("~45 miles", "metric"), "~72 km", "45 miles -> ~72 km");
eq(convDistPhrase("~55 miles southwest", "metric"), "~89 km southwest", "55 miles SW -> ~89 km southwest");
eq(convDistPhrase("~19 miles NE", "metric"), "~31 km NE", "19 miles NE -> ~31 km NE");

console.log(failed ? "UNITS TEST FAILED" : "UNITS TEST PASSED");
process.exit(failed ? 1 : 0);
