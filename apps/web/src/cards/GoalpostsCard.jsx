import { useMemo } from "react";
import { C, DISPLAY, Card, CardHead, useUnits } from "../ui.jsx";
import { mean } from "../lib/stats.js";
import { convTemp, convTempDelta, tempUnit } from "../lib/units.js";

// NOAA recomputes 30-year "climate normals" every decade; these are the
// windows behind the "normal" your weather app showed in each era.
const VINTAGES = [
  { span: [1961, 1990], era: "the 1990s" },
  { span: [1971, 2000], era: "the 2000s" },
  { span: [1981, 2010], era: "the 2010s" },
  { span: [1991, 2020], era: "today" },
];

export default function GoalpostsCard({ city, rows }) {
  const vintages = useMemo(() => VINTAGES.map(({ span, era }) => {
    const v = rows.filter((r) => r.year >= span[0] && r.year <= span[1]).map((r) => r.low);
    return { span, era, low: v.length >= 25 ? mean(v) : null };
  }).filter((v) => v.low != null), [rows]);

  const units = useUnits();
  if (vintages.length < 3) return null;
  // Vintage "normal" lows are absolute (convTemp); the redefined-upward rise is a
  // difference (convTempDelta). Bar positions use affine-invariant ratios, so they
  // need no conversion. Identity in °F → US output unchanged.
  const lo = Math.min(...vintages.map((v) => v.low)) - 0.4;
  const hi = Math.max(...vintages.map((v) => v.low)) + 0.4;
  const pos = (v) => ((v - lo) / (hi - lo)) * 100;
  const rise = vintages[vintages.length - 1].low - vintages[0].low;

  return (
    <Card>
      <CardHead kicker="The moving goalposts" title={'Whose "normal" is it, anyway?'}
        sub={'Weather apps grade tonight against a rolling 30-year "normal" that gets re-computed every decade. Each re-averaging quietly bakes the latest warming into the baseline. Here is what that does to a "normal" night at this station.'} />
      <div className="space-y-3">
        {vintages.map((v) => (
          <div key={v.span[0]} className="flex items-center gap-3 text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
            <div className="w-36 shrink-0">
              <div style={{ color: C.text }}>{v.span[0]}–{v.span[1]}</div>
              <div className="text-xs" style={{ color: C.muted }}>"normal" of {v.era}</div>
            </div>
            <div className="relative flex-1 h-2 rounded-full" style={{ background: "#171229" }}>
              <div className="absolute top-0 bottom-0 left-0 rounded-full"
                style={{ width: `${pos(v.low)}%`, background: `linear-gradient(90deg, ${C.day}, ${C.emberSoft})`, opacity: 0.85 }} />
              <div className="absolute top-[-3px] w-2 h-[14px] rounded-sm"
                style={{ left: `calc(${pos(v.low)}% - 4px)`, background: C.gold }} />
            </div>
            <div className="w-14 shrink-0 text-right" style={{ color: C.gold }}>{convTemp(v.low, units).toFixed(1)}°</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-base leading-relaxed">
        In thirty years of re-averaging, what counts as a "normal" {city.shortName} night has been redefined upward by{" "}
        <span style={{ color: C.gold, fontFamily: DISPLAY }}>{convTempDelta(rise, units).toFixed(1)}{tempUnit(units)}</span>. A night your weather app calls
        "near normal" tonight would have read as a heat anomaly against the normal your parents knew. That's why this
        page grades every year against a fixed {city.baseline.label} baseline instead.
      </p>
      <p className="text-xs mt-3" style={{ color: C.muted }}>
        Each value is the average annual low over that 30-year window, computed from this station's own record — the
        same arithmetic NOAA uses for its official normals, applied to one station.
      </p>
    </Card>
  );
}
