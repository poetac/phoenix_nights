import { useMemo } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { C, DISPLAY, Card, CardHead, DarkTooltip, axisTick, useUnits } from "../ui.jsx";
import { convTemp, tempUnit } from "../lib/units.js";

function hourLabel(h) {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

export default function GridCard({ city, grid }) {
  const model = useMemo(() => {
    if (!grid?.years) return null;
    const keys = Object.keys(grid.years).sort();
    if (keys.length < 4) return null;
    const thenK = keys[0], nowK = keys[keys.length - 1];
    const then = grid.years[thenK].mw, now = grid.years[nowK].mw;
    const data = then.map((v, h) => ({ hour: h, then: v, now: now[h], band: [v, now[h]] }));
    const troughGrowth = (Math.min(...now) / Math.min(...then) - 1) * 100;
    const peakGrowth = (Math.max(...now) / Math.max(...then) - 1) * 100;
    return {
      data, thenK, nowK, troughGrowth, peakGrowth,
      troughPctThen: grid.years[thenK].troughPct,
      troughPctNow: grid.years[nowK].troughPct,
      respondents: grid.respondents,
      month: grid.month || "July",
      source: grid.source || "US EIA Hourly Electric Grid Monitor (EIA-930)",
    };
  }, [grid]);

  const units = useUnits();
  if (!model) return null;

  return (
    <Card>
      <CardHead kicker="The grid feels it too" title="The night shift the power grid lost"
        sub={`Average ${model.month} electricity demand by hour of day for ${model.respondents}, ${model.thenK} vs ${model.nowK}. Overnight used to be when the grid caught its breath.`} />
      <div role="img" style={{ width: "100%", height: 280 }}
        aria-label="Line chart comparing average July electricity demand by hour of day in an earlier period versus recently; the overnight dip has largely disappeared.">

        <ResponsiveContainer>
          <ComposedChart data={model.data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} strokeDasharray="2 6" vertical={false} />
            <XAxis dataKey="hour" tick={axisTick} tickLine={false} axisLine={{ stroke: C.line }}
              ticks={[0, 4, 8, 12, 16, 20]} tickFormatter={hourLabel} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} domain={["auto", "auto"]} width={56}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)} GW`} />
            <Tooltip content={<DarkTooltip unit=" MW" />} labelFormatter={hourLabel} />
            <Area isAnimationActive={false} type="monotone" dataKey="band" name="added load"
              stroke="none" fill={C.ember} fillOpacity={0.15} tooltipType="none" legendType="none" />
            <Line isAnimationActive={false} type="monotone" dataKey="then" name={model.thenK}
              stroke={C.day} strokeWidth={2} dot={false} />
            <Line isAnimationActive={false} type="monotone" dataKey="now" name={model.nowK}
              stroke={C.ember} strokeWidth={3} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-4 text-base leading-relaxed">
        Since {model.thenK}, the overnight minimum — the 3-to-4 AM trough — has grown{" "}
        <span style={{ color: C.gold, fontFamily: DISPLAY }}>{model.troughGrowth.toFixed(0)}%</span>, twice as fast as
        the evening peak ({model.peakGrowth.toFixed(0)}%). A {model.month} night now runs at {model.troughPctNow}% of peak
        load, up from {model.troughPctThen}% — because when the air outside is still {Math.round(convTemp(90, units))}{tempUnit(units)} at 3 AM, the metro's air
        conditioners never get to stop.
      </p>
      <p className="text-xs mt-3" style={{ color: C.muted }}>
        {model.source}, {model.respondents} demand, {model.month} averages by local hour; the public API
        serves hourly data from {model.thenK}. Demand includes everything on the wire — data centers and EV charging
        are growing too, so not all of this is air conditioning. Rebuild with <code>analysis/build_grid.py</code>{" "}
        (needs a free EIA API key).
      </p>
    </Card>
  );
}
