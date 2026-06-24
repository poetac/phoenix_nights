import { linreg, mean } from "./stats.js";
import { SEASONS } from "./data.js";

// Pure transform behind SeasonsCard — the per-season yearly low/high series → each
// season's per-decade low and high trends, the summer-night warming delta, plus two
// derived picks the prose leans on: `summer` (the JJA row, headline) and `maxRatio`,
// the lopsided-signature selector. maxRatio scans for the season whose lows are warming
// fastest *relative to* its highs — gated on highTrend > 0.05 so a near-zero high trend
// can't manufacture a huge ratio — and the card names it ("strongest in {season}: lows
// warming N× faster than highs") only when it isn't summer itself. Pulled out of the
// card so that selector and the guards are unit-testable without a DOM
// (tests/seasonsModel.test.mjs). Returns null (card renders nothing) when the asset is
// missing or any season has fewer than 30 years since 1970.
const TREND_START = 1970;

export function seasonsModel(seasonal, city) {
  if (!seasonal) return null;
  const seasons = [];
  for (const s of SEASONS) {
    const series = (seasonal[s.key] || []).filter((r) => r.year >= TREND_START);
    if (series.length < 30) return null;
    const lowFit = linreg(series.map((r) => ({ x: r.year, y: r.low })));
    const highFit = linreg(series.map((r) => ({ x: r.year, y: r.high })));
    const base = series.filter((r) => r.year <= city.baseline.end).map((r) => r.low);
    const lastYear = series[series.length - 1].year;
    const recent = series.filter((r) => r.year > lastYear - 10).map((r) => r.low);
    seasons.push({
      ...s,
      lowTrend: lowFit.slope * 10,
      highTrend: highFit.slope * 10,
      delta: base.length >= 7 && recent.length >= 7 ? mean(recent) - mean(base) : null,
    });
  }
  const summer = seasons.find((s) => s.key === "JJA");
  const maxRatio = seasons.reduce((m, s) =>
    (s.highTrend > 0.05 && s.lowTrend / s.highTrend > m.r ? { r: s.lowTrend / s.highTrend, s } : m),
    { r: 0, s: null });
  return { seasons, summer, maxRatio };
}
