import { mean } from "./stats.js";

// Pure transform behind SeasonLengthCard — each year's 100°F-day band (first day, last
// day, length, count) → the baseline-vs-recent shifts the prose quotes, plus a sustained-
// heat (3+ consecutive 100°F days) gain when the rebuilt asset carries the runs. The
// thesis is the 100°F season EXPANDING ("annexing spring and fall"), so the guard is the
// point: a city whose first-to-last span didn't actually lengthen (Dallas shrank,
// Albuquerque is flat) would print an inverted "−2 days longer", so when the length gain
// rounds below a day the model returns null and the card self-omits. Pulled out of JSX so
// that guard + the shift math are unit-testable without a DOM
// (tests/seasonLengthModel.test.mjs). Also null when the asset is missing or either the
// baseline / recent window has fewer than 7 years.
export function seasonLengthModel(heatSeason, city) {
  if (!heatSeason?.years) return null;
  const data = heatSeason.years.map((r) => ({
    year: r.year, first: r.first, last: r.last, band: [r.first, r.last],
    length: r.length, count: r.count,
    susLen: r.firstRun != null && r.lastRun != null ? r.lastRun - r.firstRun + 1 : null,
  }));
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
    lengthGain,
    countEarly: mean(early.map((r) => r.count)),
    countLate: mean(late.map((r) => r.count)),
    // sustained (3+ consecutive 100°F days) gain — present only after a rebuild
    susGain: eSus.length >= 5 && lSus.length >= 5 ? mean(lSus) - mean(eSus) : null,
  };
}
