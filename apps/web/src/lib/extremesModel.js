import { linreg, mean } from "./stats.js";

// Pure transform behind ExtremesCard — the daily-low record → the warmest/coldest-night
// series, their per-decade trends, the baseline vs recent coldest-night averages, the
// record warm night, AND the two direction flags that pick the card's prose branch:
//   - coldRising: is the coldest night itself warming (coldTrend > 0)?
//   - coldFaster: does the floor outpace the ceiling (coldTrend > warmTrend)? — the
//     card's thesis. Gated on the actual ranking, NOT just coldTrend > 0, because a
//     small-but-positive floor trend can still lag the warmest night.
// Both flags compare the raw-°F per-decade trends; unit conversion (convTempDelta, ×5/9)
// preserves sign and ordering, so they read identically in metric — which is why they
// belong in the pure model and can be unit-tested here (tests/extremesModel.test.mjs).
// Returns null (card renders nothing) when fewer than 20 usable years remain in the
// window or either fit fails.
export function extremesModel(rows, windowStart, city) {
  const series = rows.filter(
    (r) => r.year >= windowStart && r.warmLow != null && r.coldLow != null,
  );
  if (series.length < 20) return null;
  const warmFit = linreg(series.map((r) => ({ x: r.year, y: r.warmLow })));
  const coldFit = linreg(series.map((r) => ({ x: r.year, y: r.coldLow })));
  if (!warmFit || !coldFit) return null;

  const lastYear = series[series.length - 1].year;
  const baseCold = series.filter((r) => r.year <= city.baseline.end).map((r) => r.coldLow);
  const recentCold = series.filter((r) => r.year > lastYear - 10).map((r) => r.coldLow);
  const recordWarm = series.reduce((m, r) => (r.warmLow > m.warmLow ? r : m), series[0]);
  const coldTrend = coldFit.slope * 10;
  const warmTrend = warmFit.slope * 10;

  return {
    data: series.map((r) => ({
      year: r.year, warmLow: +r.warmLow.toFixed(1), coldLow: +r.coldLow.toFixed(1),
    })),
    startYear: series[0].year,
    coldTrend,
    warmTrend,
    baseCold: baseCold.length >= 7 ? mean(baseCold) : null,
    recentCold: recentCold.length >= 7 ? mean(recentCold) : null,
    recordWarm,
    coldRising: coldTrend > 0,
    coldFaster: coldTrend > warmTrend,
  };
}
