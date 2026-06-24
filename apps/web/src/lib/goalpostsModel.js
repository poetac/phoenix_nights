import { mean } from "./stats.js";

// NOAA recomputes 30-year "climate normals" every decade; these are the windows behind
// the "normal" your weather app showed in each era.
const VINTAGES = [
  { span: [1961, 1990], era: "the 1990s" },
  { span: [1971, 2000], era: "the 2000s" },
  { span: [1981, 2010], era: "the 2010s" },
  { span: [1991, 2020], era: "today" },
];

// Pure transform behind GoalpostsCard — each NOAA-normal vintage's average annual low
// (only when the window holds at least 25 years), the bar-axis bounds, and the
// redefined-upward `rise` (newest vintage minus oldest surviving one). The card's whole
// thesis is the rolling "normal" drifting UPWARD, so the guard is the point: if the
// newest 30-yr normal isn't above the oldest (a cooling record), the "redefined upward
// by X" prose would be false — the model returns null and the card self-omits rather
// than invert it. Pulled out of JSX so that guard is unit-testable without a DOM
// (tests/goalpostsModel.test.mjs). Also returns null when fewer than 3 vintages have
// enough years. `lo`/`hi` are affine-invariant bar bounds (no unit conversion needed).
export function goalpostsModel(rows) {
  const vintages = VINTAGES.map(({ span, era }) => {
    const v = rows.filter((r) => r.year >= span[0] && r.year <= span[1]).map((r) => r.low);
    return { span, era, low: v.length >= 25 ? mean(v) : null };
  }).filter((v) => v.low != null);
  if (vintages.length < 3) return null;
  const lo = Math.min(...vintages.map((v) => v.low)) - 0.4;
  const hi = Math.max(...vintages.map((v) => v.low)) + 0.4;
  const rise = vintages[vintages.length - 1].low - vintages[0].low;
  if (rise <= 0) return null;
  return { vintages, lo, hi, rise };
}
