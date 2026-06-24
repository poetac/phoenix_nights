import { mean } from "./stats.js";

// Pure transform behind HotNightSeasonCard — each year's 80°F-night band (first night,
// last night, length, count) → the baseline-vs-recent shifts at BOTH ends and the
// sustained-season gain. The lows-first companion to SeasonLengthCard: the thesis is the
// warm-night band lengthening, so the same expansion guard applies — omit where it didn't
// actually lengthen (`round(lengthGain) < 1`), keeping the city-agnostic engine sign-safe
// as cities are added (today only LV/PHX/TUS/YUM render it, all strongly positive).
// Pulled out of JSX so that guard + the two-ended shift math are unit-testable without a
// DOM (tests/hotNightSeasonModel.test.mjs). Also null when the asset is missing, fewer
// than 30 years carry a first/last 80°F night, or either window has fewer than 7 years.
export function hotNightSeasonModel(streaks, city) {
  if (!streaks?.years) return null;
  const data = streaks.years
    .filter((r) => r.first80 != null && r.last80 != null)
    .map((r) => ({
      year: r.year, first: r.first80, last: r.last80, band: [r.first80, r.last80],
      length: r.last80 - r.first80 + 1, count: r.count80,
      susLen: r.firstSus != null && r.lastSus != null ? r.lastSus - r.firstSus + 1 : null,
    }));
  if (data.length < 30) return null;
  const early = data.filter((r) => r.year >= city.baseline.start && r.year <= city.baseline.end);
  const lastYear = data[data.length - 1].year;
  const late = data.filter((r) => r.year > lastYear - 10);
  if (early.length < 7 || late.length < 7) return null;
  const eSus = early.map((r) => r.susLen).filter((v) => v != null);
  const lSus = late.map((r) => r.susLen).filter((v) => v != null);
  const lengthGain = mean(late.map((r) => r.length)) - mean(early.map((r) => r.length));
  if (Math.round(lengthGain) < 1) return null;
  return {
    data,
    nYears: data.length, minYear: data[0].year, lastYear,
    firstShift: mean(early.map((r) => r.first)) - mean(late.map((r) => r.first)),
    lastShift: mean(late.map((r) => r.last)) - mean(early.map((r) => r.last)),
    lengthGain,
    countEarly: mean(early.map((r) => r.count)),
    countLate: mean(late.map((r) => r.count)),
    // sustained season (5-of-7 nights >= 80°F) — present only after a rebuild
    susGain: eSus.length >= 5 && lSus.length >= 5 ? mean(lSus) - mean(eSus) : null,
  };
}
