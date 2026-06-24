// Pure transform behind LastNightHero — the most recent night on record vs this station's
// fixed-baseline normal for that calendar date → the rounded low/high, their anomalies,
// the formatted date, and the two flags that pick the hero's prose: `warmer` (anomLow >= 0,
// sets the accent and the "above"/"below" word) and `near` (|anomLow| < 1, which switches
// the whole sentence to "landed right on the normal" and shows the absolute low instead of
// the signed anomaly). Both read the raw °F anomaly, so they're unit-independent (the
// converters preserve sign, and the "near" test deliberately stays on the °F anomaly).
// Pulled out of JSX so those flags + the date-normal lookup (incl. the Feb-29 fallback)
// are unit-testable without a DOM (tests/lastNightModel.test.mjs). Returns null (the hero
// renders nothing) when the night or the normals are missing, or that date has no baseline
// low.
export function lastNightModel(lastNight, normals) {
  if (!lastNight || !normals?.byDate) return null;
  const key = lastNight.date.slice(5); // MM-DD
  const norm = normals.byDate[key] || normals.byDate["02-28"]; // Feb-29 fallback
  if (!norm || norm.low == null) return null;

  const low = Math.round(lastNight.low);
  const normLow = Math.round(norm.low);
  const anomLow = low - normLow;

  const high = lastNight.high != null ? Math.round(lastNight.high) : null;
  const normHigh = norm.high != null ? Math.round(norm.high) : null;
  const anomHigh = high != null && normHigh != null ? high - normHigh : null;

  const [y, m, d] = lastNight.date.split("-").map(Number);
  const dateLabel = new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return {
    low, normLow, anomLow, high, normHigh, anomHigh, dateLabel,
    warmer: anomLow >= 0,
    near: Math.abs(anomLow) < 1,
  };
}
