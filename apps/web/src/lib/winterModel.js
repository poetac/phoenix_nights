import { mean } from "./stats.js";

// Pure transform behind WinterCard — the per-year frost / cool-night counts → the
// pre-1970 frost average, the share of recent frost-free winters, the last winter that
// still reached five frosts, and the cool-night drain. The applicability guard is the
// point: "Winter left first" is a frost-DISAPPEARANCE story, so the card may render ONLY
// where frost has genuinely collapsed — the most recent winters no longer reach even
// five frosts (so `lastFrosty` names a PAST year, not this one) AND some recent winters
// are now frost-free. Cold interior cities (Reno, Salt Lake, Boise, Albuquerque) still
// freeze 90–160 nights a year, so the model returns null and the card self-omits rather
// than force inverted numbers (last 5-frost winter = this year, 0% frost-free) onto a
// city that still freezes hard. Pulled out of JSX so that guard is unit-testable without
// a DOM (tests/winterModel.test.mjs). Also returns null when the asset is missing or the
// windows are too short (< 30 pre-1970 years / < 20 in the last 30).
export function winterModel(streaks) {
  if (!streaks?.years) return null;
  const data = streaks.years.map((r) => ({ year: r.year, frost: r.frost, cool60: r.cool60 }));
  const lastYear = data[data.length - 1].year;
  const early = data.filter((r) => r.year < 1970);
  const late = data.filter((r) => r.year > lastYear - 30);
  if (early.length < 30 || late.length < 20) return null;
  const lastFrosty = [...data].reverse().find((r) => r.frost >= 5);
  const zeroFrostShare = late.filter((r) => r.frost === 0).length / late.length;
  if (!lastFrosty || lastFrosty.year >= lastYear || zeroFrostShare <= 0) return null;
  return {
    data,
    earlyFrost: mean(early.map((r) => r.frost)),
    zeroFrostShare,
    lastFrosty,
    earlyCool: mean(early.map((r) => r.cool60)),
    lateCool: mean(data.filter((r) => r.year > lastYear - 10).map((r) => r.cool60)),
  };
}
