import { linreg } from "./stats.js";

// Published background-warming rates, °F/decade — cited reference lines, not derived from
// this station. Both are annual averages across all 24 hours, so they run cooler than the
// overnight-low trends the page measures — a conservative floor for the comparison.
const GLOBAL = 0.36; // NASA GISTEMP / NOAA: global land+ocean ~0.20°C (0.36°F)/decade
const CONUS = 0.50;  // NOAA / Climate Central: contiguous U.S. ~2.5°F since 1970
const WINDOW = 1970; // compute the local trends over the same era the benchmarks describe

// Pure transform behind GlobalContextCard — the city and rural overnight-low trends since
// 1970, lined up against the published global and U.S. background rates as sorted bars,
// plus the ×-global multiples. The positive-trend guard is the point: the framing is
// "outrunning the Earth", so BOTH the city and its rural reference must actually be
// warming (cityTrend > 0 AND desertTrend > 0); otherwise the bar ordering and the
// "× the planet's rate" prose would be nonsense, so the model returns null and the card
// self-omits. Pulled out of JSX so that guard is unit-testable without a DOM
// (tests/globalContextModel.test.mjs). Also null when either record is missing or fewer
// than 20 common years (since 1970) remain.
export function globalContextModel(cityRows, ruralRows, city) {
  if (!cityRows?.length || !ruralRows?.length) return null;
  const ruralBy = new Map(ruralRows.map((r) => [r.year, r.low]));
  const common = cityRows
    .filter((r) => r.year >= WINDOW && ruralBy.has(r.year))
    .map((r) => ({ year: r.year, city: r.low, desert: ruralBy.get(r.year) }));
  if (common.length < 20) return null;
  const cityFit = linreg(common.map((d) => ({ x: d.year, y: d.city })));
  const desertFit = linreg(common.map((d) => ({ x: d.year, y: d.desert })));
  if (!cityFit || !desertFit) return null;
  const cityTrend = cityFit.slope * 10;
  const desertTrend = desertFit.slope * 10;
  if (cityTrend <= 0 || desertTrend <= 0) return null;

  const bars = [
    { label: "Whole planet", rate: +GLOBAL.toFixed(2), kind: "bench" },
    { label: "United States", rate: +CONUS.toFixed(2), kind: "bench" },
    { label: `${city.rural.short} nights`, rate: +desertTrend.toFixed(2), kind: "desert" },
    { label: `${city.shortName} · city nights`, rate: +cityTrend.toFixed(2), kind: "city" },
  ].sort((a, b) => a.rate - b.rate);

  return {
    bars, cityTrend, desertTrend,
    cityX: cityTrend / GLOBAL, desertX: desertTrend / GLOBAL,
    first: common[0].year, last: common[common.length - 1].year,
  };
}
