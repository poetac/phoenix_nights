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

export const num = (v) => { const f = parseFloat(v); return Number.isFinite(f) ? f : null; };

export const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
