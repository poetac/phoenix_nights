import { useMemo } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { C, DISPLAY, Card, CardHead, DarkTooltip, axisTick } from "../ui.jsx";

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

  if (!model) return null;
  // Both clauses below are derived from the committed asset, never asserted as fixed prose,
  // so they stay true for every grid city: Phoenix's trough outran its peak, Boise's lagged
  // it, Tucson's evening peak even fell. (Was hardcoded "twice as fast" / "up from" — false
  // off Phoenix; for Tucson it rendered "grown 23%, twice as fast as the peak (-2%)".)
  const { troughGrowth: tg, peakGrowth: pg, troughPctThen: tpThen, troughPctNow: tpNow } = model;
  let compare;
  if (pg <= 0.5) {
    compare = `while the evening peak ${pg < -0.5 ? `fell ${Math.abs(pg).toFixed(0)}%` : "barely moved"}`;
  } else {
    const ratio = tg / pg;
    if (ratio >= 1.8) compare = `roughly ${Math.round(ratio)}× as fast as the evening peak (+${pg.toFixed(0)}%)`;
    else if (ratio >= 1.15) compare = `faster than the evening peak (+${pg.toFixed(0)}%)`;
    else if (ratio >= 0.85) compare = `about as fast as the evening peak (+${pg.toFixed(0)}%)`;
    else compare = `slower than the evening peak (+${pg.toFixed(0)}%)`;
  }
  const floorDelta = tpNow - tpThen;
  let floor;
  if (floorDelta >= 0.5) floor = `now holds at ${tpNow}% of peak load, up from ${tpThen}%`;
  else if (floorDelta <= -0.5) floor = `now sits at ${tpNow}% of peak load, down from ${tpThen}%`;
  else floor = `holds near ${tpNow}% of peak load (${tpThen}% then)`;

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
