import { mean } from "./stats.js";

// Pure transform behind ExtrapolationCard — carries the city's MEASURED overnight-low
// trend forward in a straight line to `horizon`, with the existing moving-block-bootstrap
// slope CI (passed in via `fit`) fanned out from the data centroid. OLS passes through
// (xbar, ybar), so the fan pivots there: center/lo/hi are all `ybar + slope·(yr - xbar)`.
// Deliberately a hypothetical ("if the line held"), not a forecast. Pulled out of the
// card so the projection math + guards are unit-testable without a DOM
// (tests/extrapolationModel.test.mjs). Returns null (card renders nothing) when the fit
// isn't robust or lacks a CI, when fewer than 15 finite lows remain, or when the horizon
// is under a decade past the last recorded year (too short a runway to draw).
export function extrapolationModel(rows, fit, horizon) {
  if (!fit || !fit.robust || fit.lo == null || fit.hi == null) return null;
  const pts = rows.map((r) => ({ x: r.year, y: r.low })).filter((p) => Number.isFinite(p.y));
  if (pts.length < 15) return null;
  const lastYear = pts[pts.length - 1].x;
  if (horizon - lastYear < 10) return null;
  // OLS passes through the centroid, so pivot the slope-CI fan there.
  const xbar = mean(pts.map((p) => p.x));
  const ybar = mean(pts.map((p) => p.y));
  const center = (yr) => ybar + fit.slope * (yr - xbar);
  const loLine = (yr) => ybar + fit.lo * (yr - xbar);
  const hiLine = (yr) => ybar + fit.hi * (yr - xbar);

  const data = pts.map((p) => ({ year: p.x, hist: +p.y.toFixed(1), proj: null, band: null }));
  for (let yr = lastYear; yr <= horizon; yr++) {
    const row = yr === lastYear ? data[data.length - 1] : { year: yr, hist: null };
    row.proj = +center(yr).toFixed(1);
    row.band = [+loLine(yr).toFixed(1), +hiLine(yr).toFixed(1)];
    if (yr !== lastYear) data.push(row);
  }
  return {
    data, lastYear,
    perDecade: fit.slope * 10,
    at2050: center(horizon),
    half: (hiLine(horizon) - loLine(horizon)) / 2,
    recent: mean(pts.slice(-10).map((p) => p.y)),
  };
}
