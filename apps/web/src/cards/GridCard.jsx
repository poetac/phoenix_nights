import { useMemo } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { C, DISPLAY, Card, CardHead, DarkTooltip, axisTick } from "../ui.jsx";
import { hourLabel } from "../lib/labels.js";
import { gridModel } from "../lib/gridModel.js";

export default function GridCard({ city, grid }) {
  const model = useMemo(() => gridModel(grid), [grid]);

  if (!model) return null;
  // compare/floor are computed in gridModel from the asset (never fixed prose), so they
  // read true for every grid city — see lib/gridModel.js for the branches + their history.
  const { troughGrowth: tg, compare, floor } = model;

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
        <span style={{ color: C.gold, fontFamily: DISPLAY }}>{tg.toFixed(0)}%</span>, {compare}. A {model.month} night{" "}
        {floor} — because when the overnight air barely cools, the metro's air conditioners never get to stop.
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
