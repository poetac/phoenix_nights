export function linreg(pts) {
  const n = pts.length;
  if (n < 3) return null;
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (const p of pts) { sx += p.x; sy += p.y; sxy += p.x * p.y; sxx += p.x * p.x; }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  const xbar = sx / n;
  let sse = 0, sxxc = 0;
  for (const p of pts) {
    const e = p.y - (slope * p.x + intercept);
    sse += e * e;
    sxxc += (p.x - xbar) * (p.x - xbar);
  }
  // 95% half-width on the slope; t ~= 2.0 is fine for the n >= 28 windows we fit
  const ci95 = Math.sqrt(sse / (n - 2) / sxxc) * 2.0;
  return { slope, intercept, ci95 };
}

// Small deterministic PRNG so the bootstrap CI is stable across renders.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Moving-block-bootstrap 95% CI for an OLS trend slope. Resampling the fit
// residuals in contiguous blocks preserves short-range autocorrelation, so the
// interval is wider — and more honest — than the textbook OLS standard error
// when consecutive years aren't independent. Deterministic (seeded by n) so the
// displayed ± doesn't jitter between renders. Falls back to the OLS CI for tiny
// samples. Returns { slope, ci95, lo, hi, robust, blockLen }.
export function blockBootstrapCI(pts, { B = 1000, blockLen } = {}) {
  const fit = linreg(pts);
  if (!fit) return null;
  const n = pts.length;
  if (n < 12) return { ...fit, lo: null, hi: null, robust: false, blockLen: null };
  const L = blockLen || Math.max(2, Math.round(Math.cbrt(n)));
  const resid = pts.map((p) => p.y - (fit.slope * p.x + fit.intercept));
  const rand = mulberry32((n * 2654435761) ^ 0x9e3779b9);
  const nBlocks = Math.ceil(n / L);
  const slopes = [];
  for (let b = 0; b < B; b++) {
    const rs = [];
    for (let k = 0; k < nBlocks; k++) {
      const start = Math.floor(rand() * (n - L + 1));
      for (let j = 0; j < L; j++) rs.push(resid[start + j]);
    }
    const f = linreg(pts.map((p, i) => ({ x: p.x, y: fit.slope * p.x + fit.intercept + rs[i] })));
    if (f) slopes.push(f.slope);
  }
  slopes.sort((a, b) => a - b);
  const q = (p) => slopes[Math.min(slopes.length - 1, Math.max(0, Math.floor(p * slopes.length)))];
  const lo = q(0.025), hi = q(0.975);
  return { slope: fit.slope, intercept: fit.intercept, ci95: (hi - lo) / 2, lo, hi, robust: true, blockLen: L };
}

export const num = (v) => { const f = parseFloat(v); return Number.isFinite(f) ? f : null; };

export const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
