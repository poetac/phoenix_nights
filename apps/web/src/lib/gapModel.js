import { linreg, mean } from "./stats.js";
import { decadeGroups } from "./series.js";

// Pure transform behind GapCard — the yearly diurnal range (DTR = high - low) since
// `dtrStart` → the per-year series + OLS trend, decade-averaged endpoints, and the
// `narrowed` flag that flips the card's headline. narrowing = first-decade DTR minus
// last-decade DTR; narrowed (narrowing > 0) means the daily swing is COLLAPSING — the
// inland heat-island fingerprint — while false means it's WIDENING, the maritime signal
// that runs opposite (e.g. Sydney, whose days outpace its nights). That one flag picks
// the title, the aria-label, and which of two opposite explanations the prose gives, so
// it's the thing most worth testing — pulled out of JSX here (tests/gapModel.test.mjs).
// Decades are kept only when they hold at least 5 years, so a sparse leading/trailing
// decade can't anchor the endpoints. Returns null (card renders nothing) when fewer than
// 40 usable years remain, the fit fails, or fewer than 3 decades clear that 5-year floor.
export function gapModel(rows, dtrStart) {
  const series = rows
    .filter((r) => r.year >= dtrStart && r.high != null && r.low != null)
    .map((r) => ({ year: r.year, dtr: r.high - r.low }));
  if (series.length < 40) return null;
  const fit = linreg(series.map((r) => ({ x: r.year, y: r.dtr })));
  if (!fit) return null;

  const decades = decadeGroups(series, 5)
    .map((g) => ({ decade: g.decade, dtr: mean(g.rows.map((r) => r.dtr)), n: g.n }));
  if (decades.length < 3) return null;

  const first = decades[0], last = decades[decades.length - 1];
  const narrowing = first.dtr - last.dtr;
  return {
    data: series.map((r) => ({
      year: r.year,
      dtr: +r.dtr.toFixed(1),
      trend: +(fit.slope * r.year + fit.intercept).toFixed(2),
    })),
    first, last,
    narrowing,
    narrowed: narrowing > 0,
    perDecade: fit.slope * 10,
  };
}
