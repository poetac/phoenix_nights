import { mean } from "./stats.js";

// Pure transform behind StreakCard — the per-year longest-run-of-80F-nights asset →
// chart series + the early/late averages and the two record years. Pulled out of the
// card so its guards are unit-testable without a DOM (tests/streakModel.test.mjs). Two
// of those guards are correctness rules, not just defenses:
//   - the "early" window is BOUNDED to [baseline.start, baseline.end] (the card's
//     baseline span), distinct from the open-ended "<= baseline.end" windows other
//     cards use — a year before baseline.start is NOT in it; and
//   - applicability: a city whose last ten years average fewer than 2 such nights has
//     no streak story to tell (a flat-zero chart), so the model returns null and the
//     card omits itself. This is what keeps the card off cool/high-elevation and humid
//     cities while hot-night cities keep it.
// Returns null (card renders nothing) when the asset is missing, either window has
// fewer than 7 years, or the applicability floor isn't met.
export function streakModel(streaks, city) {
  if (!streaks?.years) return null;
  const data = streaks.years.map((r) => ({ year: r.year, streak80: r.streak80, streak110: r.streak110 }));
  const early = data.filter((r) => r.year >= city.baseline.start && r.year <= city.baseline.end);
  const lastYear = data[data.length - 1].year;
  const late = data.filter((r) => r.year > lastYear - 10);
  if (early.length < 7 || late.length < 7) return null;
  const record = data.reduce((m, r) => (r.streak80 > m.streak80 ? r : m), data[0]);
  const record110 = data.reduce((m, r) => (r.streak110 > m.streak110 ? r : m), data[0]);
  const earlyAvg = mean(early.map((r) => r.streak80));
  const lateAvg = mean(late.map((r) => r.streak80));
  if (lateAvg < 2) return null;
  return { data, record, record110, earlyAvg, lateAvg };
}
