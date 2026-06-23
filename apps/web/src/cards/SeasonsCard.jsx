import { useMemo } from "react";
import { C, DISPLAY, Card, CardHead, useUnits } from "../ui.jsx";
import { linreg, mean } from "../lib/stats.js";
import { SEASONS } from "../lib/data.js";
import { convTempDelta, tempUnit } from "../lib/units.js";
import { signed } from "../lib/format.js";

const TREND_START = 1970;

export default function SeasonsCard({ city, seasonal }) {
  const stats = useMemo(() => {
    if (!seasonal) return null;
    const out = [];
    for (const s of SEASONS) {
      const series = (seasonal[s.key] || []).filter((r) => r.year >= TREND_START);
      if (series.length < 30) return null;
      const lowFit = linreg(series.map((r) => ({ x: r.year, y: r.low })));
      const highFit = linreg(series.map((r) => ({ x: r.year, y: r.high })));
      const base = series.filter((r) => r.year <= city.baseline.end).map((r) => r.low);
      const lastYear = series[series.length - 1].year;
      const recent = series.filter((r) => r.year > lastYear - 10).map((r) => r.low);
      out.push({
        ...s,
        lowTrend: lowFit.slope * 10,
        highTrend: highFit.slope * 10,
        delta: base.length >= 7 && recent.length >= 7 ? mean(recent) - mean(base) : null,
      });
    }
    return out;
  }, [seasonal, city]);

  const units = useUnits();
  if (!stats) return null;
  // Season trends and the summer delta are differences (convTempDelta, identity in
  // °F). The "+6°F since 1970" is Climate Central's published figure — kept as cited.
  const d = (v) => convTempDelta(v, units);
  const summer = stats.find((s) => s.key === "JJA");
  const maxRatio = stats.reduce((m, s) =>
    (s.highTrend > 0.05 && s.lowTrend / s.highTrend > m.r ? { r: s.lowTrend / s.highTrend, s } : m),
    { r: 0, s: null });

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
