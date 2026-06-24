import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { C, DISPLAY, Card, CardHead, DarkTooltip, axisTick, useUnits } from "../ui.jsx";
import { convTemp, convTempDelta, tempUnit } from "../lib/units.js";
import { signed } from "../lib/format.js";
import { extremesModel } from "../lib/extremesModel.js";

// The year's single warmest and single coldest overnight low — the ceiling and
// floor of nighttime relief. Every other card on the page is a mean, a count,
// or a streak; this one looks at the two extreme nights and shows the floor
// rising even faster than the year as a whole.
export default function ExtremesCard({ city, rows, windowStart }) {
  const model = useMemo(() => extremesModel(rows, windowStart, city), [rows, windowStart, city]);

  const units = useUnits();
  if (!model) return null;
  // Warmest/coldest-night lows are absolute temps (convTemp); the trends are
  // differences (convTempDelta). Both identity in °F → US output unchanged.
  const t = (v) => convTemp(v, units);
  const dd = (v) => convTempDelta(v, units);
  // coldRising (is the floor warming?) and coldFaster (does it outpace the ceiling?)
  // are computed in extremesModel — see lib/extremesModel.js for the reasoning.
  const { coldRising, coldFaster } = model;
  const displayData = model.data.map((r) => ({
    year: r.year, warmLow: +t(r.warmLow).toFixed(1), coldLow: +t(r.coldLow).toFixed(1),
  }));

  return (
    <Card>
      <CardHead kicker="The year's two extremes" title="Even the coldest night is warming"
        sub={`Every year has one night that gets coldest and one that stays hottest. Here are both, since ${model.startYear} — the floor and the ceiling of ${city.shortName}'s overnight lows. The story isn't just that the middle moved; the floor is coming up underneath it.`} />
      <div role="img" style={{ width: "100%", height: 280 }}
        aria-label="Line chart of each year's single coldest and single hottest overnight low; both rise, the coldest-night floor lifting fastest.">

        <ResponsiveContainer>
          <LineChart data={displayData} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} strokeDasharray="2 6" vertical={false} />
            <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={{ stroke: C.line }} minTickGap={32} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false}
              domain={["auto", "auto"]} tickFormatter={(v) => `${v}°`} />
            <Tooltip content={<DarkTooltip unit={tempUnit(units)} />} />
            <Line isAnimationActive={false} type="monotone" dataKey="warmLow" name="Warmest night's low"
              stroke={C.ember} strokeWidth={2.5} dot={false} />
            <Line isAnimationActive={false} type="monotone" dataKey="coldLow" name="Coldest night's low"
              stroke={C.day} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-2 text-xs" style={{ color: C.muted }}>
        <span><span className="inline-block w-3 h-1 rounded-full align-middle mr-1" style={{ background: C.ember }} />Warmest night each year</span>
        <span><span className="inline-block w-3 h-1 rounded-full align-middle mr-1" style={{ background: C.day }} />Coldest night each year</span>
      </div>
      <p className="mt-4 text-base leading-relaxed">
        Pick the single coldest night of each year — the deepest the year's cooling ever reaches.
        {model.baseCold != null && model.recentCold != null ? (
          <> In the {city.baseline.label} that night bottomed out around{" "}
            <span style={{ fontFamily: DISPLAY, color: C.day }}>{t(model.baseCold).toFixed(0)}{tempUnit(units)}</span>; over the last
            ten years it averaged <span style={{ fontFamily: DISPLAY, color: C.gold }}>{t(model.recentCold).toFixed(0)}{tempUnit(units)}</span>.</>
        ) : null}{" "}
        {coldRising ? (
          <>Even the year's one moment of deepest relief is warming —{" "}
            <span style={{ color: C.gold, fontFamily: DISPLAY }}>+{dd(model.coldTrend).toFixed(1)}{tempUnit(units)} per decade</span>
            {coldFaster ? (
              <>, faster than the warmest night ({signed(dd(model.warmTrend), 1)}°/decade).
                The hottest of the lows can't climb much past the daytime heat, but the floor has room to rise — and it is.</>
            ) : (
              <>, while the warmest night climbs {signed(dd(model.warmTrend), 1)}°/decade.</>
            )}</>
        ) : (
          <>The warmest night is climbing {signed(dd(model.warmTrend), 1)}{tempUnit(units)} per decade.</>
        )}{" "}
        {city.shortName}'s warmest low on record was{" "}
        <span style={{ color: C.ember, fontFamily: DISPLAY }}>{t(model.recordWarm.warmLow).toFixed(0)}{tempUnit(units)}</span>, set in{" "}
        {model.recordWarm.year}{model.recordWarm.warmLow >= 98 ? " — a night that never cooled below body temperature" : ""}.
      </p>
      <p className="text-xs mt-3" style={{ color: C.muted }}>
        Each point is the maximum and minimum daily low (TMIN) for that calendar year, from the live station record.
        Single-day extremes are sensitive to gaps, so years missing more than 36 days of lows are excluded (the same
        hygiene rule as the rest of the page). NOAA/NWS ACIS yearly <code>max</code>/<code>min</code> reduces.
      </p>
    </Card>
  );
}
