import { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { C, DISPLAY, Card, CardHead, axisTick, TooltipShell } from "../ui.jsx";
import { nightCoolingModel } from "../lib/nightCoolingModel.js";

export default function NightCoolingCard({ city, cddSplit }) {
  // nightCoolingModel self-omits where the baseline night share isn't positive (the
  // premise guard that keeps the card off cities like El Paso). See lib/nightCoolingModel.js.
  const model = useMemo(() => nightCoolingModel(cddSplit, city), [cddSplit, city]);

  if (!model) return null;
  const { data, baseShare, nowShare, nightGrowth, dayGrowth } = model;

  return (
    <Card>
      <CardHead kicker="Whose fault is the cooling bill" title="The thermostat that never turns off"
        shareCity={city.id} shareSlug="night-cooling"
        sub={`The same yearly cooling demand as above, split into the half the afternoon high is responsible for and the half the overnight low is. As lows pull away from highs, a rising share of the load comes from the hours that once cost nothing to cool.`} />
      <div role="img" style={{ width: "100%", height: 260 }}
        aria-label="Stacked area chart of the day and night halves of annual cooling degree days; the night half's share rises over time.">

        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} strokeDasharray="2 6" vertical={false} />
            <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={{ stroke: C.line }} minTickGap={32} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} width={52} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload;
              return (
                <TooltipShell>
                  <div style={{ color: C.muted }} className="text-xs mb-1">{label}</div>
                  <div><span style={{ color: C.ember }}>night</span> {p.night} · <span style={{ color: C.emberSoft }}>day</span> {p.day} CDD</div>
                  <div style={{ color: C.muted }}>night = {p.share.toFixed(0)}% of {p.total}</div>
                </TooltipShell>
              );
            }} />
            <Area isAnimationActive={false} type="monotone" dataKey="night" name="night half" stackId="cdd"
              stroke={C.ember} strokeWidth={1.5} fill={C.ember} fillOpacity={0.55} />
            <Area isAnimationActive={false} type="monotone" dataKey="day" name="day half" stackId="cdd"
              stroke={C.emberSoft} strokeWidth={1.5} fill={C.emberSoft} fillOpacity={0.18} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-2 text-xs" style={{ color: C.muted }}>
        <span><span className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: C.ember, opacity: 0.7 }} />night half — (low − 65)/2</span>
        <span><span className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: C.emberSoft, opacity: 0.4 }} />day half — (high − 65)/2</span>
      </div>
      <p className="mt-4 text-base leading-relaxed">
        In the {city.baseline.label}, the overnight low drove about{" "}
        <span style={{ color: C.gold, fontFamily: DISPLAY }}>{baseShare.toFixed(0)}%</span> of {city.shortName}'s yearly
        cooling demand. Today it drives{" "}
        <span style={{ color: C.ember, fontFamily: DISPLAY }}>{nowShare.toFixed(0)}%</span> — the night's half of the bill
        has grown <span style={{ color: C.gold, fontFamily: DISPLAY }}>{nightGrowth.toFixed(1)}×</span> since then, against{" "}
        {dayGrowth.toFixed(1)}× for the day's. The afternoon was always expensive to cool; what changed is that the night
        stopped being free.
      </p>
      <p className="text-xs mt-3" style={{ color: C.muted }}>
        An exact split, not an estimate: each cooling day's degree-days are <code>(high−65)/2 + (low−65)/2</code>, which sum
        to the standard mean-based total plotted above. CDD is the conventional air-conditioning-load proxy, not metered
        consumption — see the grid card for measured demand. Computed from every daily high and low since 1896 (NOAA/NWS
        ACIS); years missing more than 36 days are excluded, and the {city.urbanShort} gauge sits inside the urban heat
        island it measures. Rebuild with <code>analysis/build_cdd_split.py</code>.
      </p>
    </Card>
  );
}
