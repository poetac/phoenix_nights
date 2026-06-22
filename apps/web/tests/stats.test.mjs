// Unit test for the pure stats layer (src/lib/stats.js). The render smoke test
// only proves cards mount; the numbers they draw — every OLS trend, its bootstrap
// ±, and the parse/aggregate helpers — come from here, so this is the net under
// the math. Plain node, no deps: run `node tests/stats.test.mjs` from apps/web.
import { linreg, blockBootstrapCI, num, mean } from "../src/lib/stats.js";

let failed = false;
const ok = (cond, msg) => { if (!cond) { console.error("✗ FAIL:", msg); failed = true; } };
const near = (a, b, msg, eps = 1e-9) =>
  ok(a != null && Math.abs(a - b) <= eps, `${msg} — got ${a}, expected ≈ ${b}`);

// --- num: parseFloat, but only finite numbers survive (else null) ---
ok(num("12.5") === 12.5, "num numeric string");
ok(num(12.5) === 12.5, "num number passthrough");
ok(num("-7.5") === -7.5, "num negative");
ok(num("abc") === null, "num non-numeric → null");
ok(num("") === null, "num empty → null");
ok(num(null) === null, "num null → null");
ok(num(undefined) === null, "num undefined → null");
ok(num("NaN") === null, "num 'NaN' → null");
ok(num(Infinity) === null, "num Infinity → null (the JSON.parse-crash guard)");
ok(num("M") === null, "num ACIS missing flag 'M' → null");

// --- mean: average, null on empty (never NaN) ---
near(mean([1, 2, 3, 4]), 2.5, "mean basic");
near(mean([5]), 5, "mean single");
near(mean([-2, 2]), 0, "mean symmetric");
ok(mean([]) === null, "mean empty → null (not NaN)");

// --- linreg: OLS slope/intercept/ci95, with the degenerate guards ---
ok(linreg([{ x: 0, y: 0 }, { x: 1, y: 1 }]) === null, "linreg n<3 → null");
ok(linreg([{ x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 }]) === null,
  "linreg all-x-equal (denom 0) → null");
{
  const pts = Array.from({ length: 10 }, (_, i) => ({ x: i, y: 2 * i + 1 }));
  const f = linreg(pts);
  near(f.slope, 2, "linreg perfect-line slope");
  near(f.intercept, 1, "linreg perfect-line intercept");
  near(f.ci95, 0, "linreg perfect line → ci95 = 0");
}
{
  // sx=3 sy=4 sxy=7 sxx=5 n=3 → slope=(3·7−3·4)/(3·5−9)=9/6=1.5
  const f = linreg([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 3 }]);
  near(f.slope, 1.5, "linreg hand-computed slope");
  ok(f.ci95 > 0, "linreg imperfect fit → ci95 > 0");
}

// --- blockBootstrapCI: deterministic, robust flag, perfect-line CI≈0 ---
ok(blockBootstrapCI([{ x: 0, y: 0 }]) === null, "bootstrap no-fit (n<3) → null");
{
  const pts = Array.from({ length: 10 }, (_, i) => ({ x: i, y: i }));
  const r = blockBootstrapCI(pts);
  ok(r.robust === false, "bootstrap n<12 → robust:false");
  ok(r.lo === null && r.hi === null, "bootstrap n<12 → lo/hi null");
  near(r.slope, 1, "bootstrap n<12 still returns the OLS slope");
}
{
  const pts = Array.from({ length: 30 }, (_, i) => ({ x: i, y: 0.5 * i + 3 }));
  const r = blockBootstrapCI(pts);
  ok(r.robust === true, "bootstrap n>=12 → robust:true");
  near(r.slope, 0.5, "bootstrap perfect-line slope");
  near(r.ci95, 0, "bootstrap perfect line → ci95 ≈ 0");
  ok(r.lo <= r.slope && r.slope <= r.hi, "bootstrap slope inside [lo,hi]");
}
{
  // determinism: the seeded PRNG must give an identical ± across calls (no render jitter)
  const pts = Array.from({ length: 40 }, (_, i) => ({ x: i, y: 0.3 * i + ((i * 7) % 5) - 2 }));
  const a = blockBootstrapCI(pts), b = blockBootstrapCI(pts);
  ok(a.ci95 === b.ci95 && a.lo === b.lo && a.hi === b.hi, "bootstrap deterministic across calls");
  ok(a.ci95 > 0, "bootstrap noisy data → ci95 > 0");
}

console.log(failed ? "STATS TESTS FAILED" : "✓ stats.js: num / mean / linreg / blockBootstrapCI");
process.exit(failed ? 1 : 0);
