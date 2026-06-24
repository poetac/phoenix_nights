import { linreg, mean } from "./stats.js";

// Pure transform behind UhiCard — the city-vs-rural overnight-low series, the two OLS
// trends, the per-decade city-minus-rural gap, and the urban-heat-island EXCESS
// (cityTrend - desertTrend). The excess guard is the point: this is the control card, and
// its claim is that the city's nights warm FASTER than its rural reference's. Where that
// excess isn't positive — a city not outpacing its surroundings — the "urban heat island"
// framing is false, so the model returns null and the card self-omits. Pulled out of JSX
// (it was two useMemos: the chart series + the stats) so that guard is unit-testable
// without a DOM (tests/uhiModel.test.mjs). Also null when fewer than 30 common years
// remain, a fit fails, or fewer than 2 decades clear the 4-year gap floor. Returns
// { data, stats } so the card keeps both the series and the derived figures.
export function uhiModel(cityRows, ruralRows) {
  const cityBy = new Map(cityRows.map((r) => [r.year, r.low]));
  const data = ruralRows
    .filter((r) => cityBy.has(r.year))
    .map((r) => ({
      year: r.year,
      city: +cityBy.get(r.year).toFixed(1),
      desert: +r.low.toFixed(1),
    }));
  if (data.length < 30) return null;
  const cityFit = linreg(data.map((d) => ({ x: d.year, y: d.city })));
  const desertFit = linreg(data.map((d) => ({ x: d.year, y: d.desert })));
  if (!cityFit || !desertFit) return null;
  const cityTrend = cityFit.slope * 10;
  const desertTrend = desertFit.slope * 10;
  const byDec = {};
  for (const d of data) {
    const dec = Math.floor(d.year / 10) * 10;
    (byDec[dec] ??= []).push(d.city - d.desert);
  }
  const gaps = Object.entries(byDec)
    .filter(([, v]) => v.length >= 4)
    .map(([dec, v]) => ({ decade: +dec, gap: mean(v) }))
    .sort((a, b) => a.decade - b.decade);
  if (gaps.length < 2) return null;
  const excess = cityTrend - desertTrend;
  if (excess <= 0) return null;
  return {
    data,
    stats: {
      cityTrend, desertTrend,
      excess,
      share: excess / cityTrend,
      gaps,
      first: data[0].year,
      last: data[data.length - 1].year,
    },
  };
}
