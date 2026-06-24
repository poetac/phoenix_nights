// Pure transform behind NightCoolingCard — annual cooling-degree-days split into the
// overnight-low half and the afternoon-high half → the baseline vs recent night share of
// the cooling bill and how much each half grew since. The premise guard is the point:
// "the night's share of cooling demand" is only meaningful where the baseline night share
// is positive. High-elevation desert cities (e.g. El Paso) had net-negative overnight
// cooling demand in the 1970s — their nights warm fast but from a cool base — so when the
// baseline night share isn't positive the model returns null and the card self-omits.
// Pulled out of JSX so that guard is unit-testable without a DOM
// (tests/nightCoolingModel.test.mjs). Also null when the asset is missing/short (< 30
// years) or the baseline/recent windows have fewer than 5 years.
//
// Note `baseShare` is computed twice on purpose: the raw fraction below (max(1, …)
// denominator) is the >0 PREMISE test; the returned `baseShare` is the display percentage
// via sumShare. Kept verbatim so US output is byte-for-byte unchanged.
export function nightCoolingModel(cddSplit, city) {
  if (!cddSplit?.years || cddSplit.years.length < 30) return null;
  const data = cddSplit.years.map((r) => ({
    year: r.year, night: r.nightCdd, day: r.dayCdd,
    total: r.nightCdd + r.dayCdd,
    share: r.nightCdd + r.dayCdd > 0 ? (100 * r.nightCdd) / (r.nightCdd + r.dayCdd) : 0,
  }));
  const base = data.filter((r) => r.year >= city.baseline.start && r.year <= city.baseline.end);
  const lastYear = data[data.length - 1].year;
  const late = data.filter((r) => r.year > lastYear - 10);
  if (base.length < 5 || late.length < 5) return null;
  const baseShare = base.reduce((s, r) => s + r.night, 0) /
    Math.max(1, base.reduce((s, r) => s + r.night + r.day, 0));
  if (!(baseShare > 0)) return null;

  const sumShare = (rows) => {
    const n = rows.reduce((s, r) => s + r.night, 0);
    const t = rows.reduce((s, r) => s + r.total, 0);
    return t > 0 ? (100 * n) / t : 0;
  };
  const mean = (rows, k) => rows.reduce((s, r) => s + r[k], 0) / rows.length;

  return {
    data,
    baseShare: sumShare(base),
    nowShare: sumShare(late),
    nightGrowth: mean(late, "night") / mean(base, "night"),
    dayGrowth: mean(late, "day") / mean(base, "day"),
    lastYear,
  };
}
