import { useMemo } from "react";
import { C, DISPLAY, Card, CardHead, useUnits } from "../ui.jsx";
import { convTempDelta, tempUnit } from "../lib/units.js";
import { signed } from "../lib/format.js";
import { seasonsModel } from "../lib/seasonsModel.js";

export default function SeasonsCard({ city, seasonal }) {
  const model = useMemo(() => seasonsModel(seasonal, city), [seasonal, city]);

  const units = useUnits();
  if (!model) return null;
  // Season trends and the summer delta are differences (convTempDelta, identity in
  // °F). The "+6°F since 1970" is Climate Central's published figure — kept as cited.
  const d = (v) => convTempDelta(v, units);
  // seasons (per-season trends/delta), summer (JJA), and maxRatio (the lopsided-signature
  // pick) all come from seasonsModel — see lib/seasonsModel.js.
  const { seasons: stats, summer, maxRatio } = model;

  return (
    <Card>
      <CardHead kicker="Season by season" title="No season is spared — but nights always lead"
        sub={`Trends since ${TREND_START}, lows vs. highs, for each meteorological season. The night-warming signature shows up year-round.`} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.key} className="rounded-xl p-3" style={{ background: "#171229", border: `1px solid ${C.line}` }}>
            <div className="text-sm" style={{ color: C.text }}>{s.label}</div>
            <div className="text-xs mb-2" style={{ color: C.muted }}>{s.months}</div>
            <div className="text-2xl" style={{ fontFamily: DISPLAY, color: C.ember, fontVariantNumeric: "tabular-nums" }}>
              {signed(d(s.lowTrend))}°
            </div>
            <div className="text-xs" style={{ color: C.emberSoft }}>lows / decade</div>
            <div className="text-base mt-1" style={{ fontFamily: DISPLAY, color: C.day, fontVariantNumeric: "tabular-nums" }}>
              {signed(d(s.highTrend))}°
            </div>
            <div className="text-xs" style={{ color: C.day }}>highs / decade</div>
          </div>
        ))}
      </div>
      {summer?.delta != null && (
        <p className="mt-4 text-base leading-relaxed">
          {city.shortName} summer nights now run{" "}
          <span style={{ color: C.gold, fontFamily: DISPLAY }}>+{d(summer.delta).toFixed(1)}{tempUnit(units)} hotter than in the {city.baseline.label}</span>
          {" "}— independently reproducing Climate Central's published estimate of about +6°F since 1970, from the raw
          station record.{maxRatio.s && maxRatio.s.key !== "JJA" && (
            <> The lopsided signature is strongest in {maxRatio.s.label.toLowerCase()}: lows warming{" "}
            {maxRatio.r.toFixed(1)}× faster than highs.</>
          )}
        </p>
      )}
      <p className="text-xs mt-3" style={{ color: C.muted }}>
        Seasons follow the meteorological convention (winter = Dec–Feb, assigned to the January year). Months missing
        more than 6 days are excluded, and a season counts only when all three months are complete.
      </p>
    </Card>
  );
}
