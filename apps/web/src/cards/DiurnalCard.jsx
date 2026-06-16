import { useMemo } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { C, DISPLAY, Card, CardHead, DarkTooltip, axisTick } from "../ui.jsx";

const MIN_OBS_PER_HOUR = 500; // drops thin decades (e.g. a 2-year 1940s stub)

function hourLabel(h) {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

export default function DiurnalCard({ city, diurnal }) {
  const model = useMemo(() => {
    if (!diurnal?.decades) return null;
    const solid = Object.keys(diurnal.decades)
      .filter((k) => diurnal.decades[k].nObs.reduce((a, b) => a + b, 0) / 24 >= MIN_OBS_PER_HOUR)
      .sort();
    if (solid.length < 2) return null;
    const thenK = solid[0], nowK = solid[solid.length - 1];
    const then = diurnal.decades[thenK].temp, now = diurnal.decades[nowK].temp;
    const data = then.map((t, h) => ({
      hour: h, label: hourLabel(h),
      then: t, now: now[h], band: [t, now[h]],
    }));
    const coolThen = Math.min(...then), coolNow = Math.min(...now);
    const peakThen = Math.max(...then), peakNow = Math.max(...now);
    const coolHour = now.indexOf(coolNow);
    return {
      data, thenK, nowK,
      nightGain: coolNow - coolThen,
      dayGain: peakNow - peakThen,
      coolThen, coolNow, coolHour, peakThen, peakNow,
    };
  }, [diurnal]);

  if (!model) return null;

  return (
    <Card>
      <CardHead kicker="Hour by hour" title="A summer day, then and now"
        sub={`Average June–August temperature at each hour of the day at ${city.urbanShort}: the ${model.thenK}s against the ${model.nowK}s. The shaded band is the heat the decades added — and it is widest in the middle of the night.`} />
      <div role="img" style={{ width: "100%", height: 300 }}
        aria-label="Line chart comparing the average summer temperature at each hour of day in an earlier decade versus the most recent; the gap is widest overnight.">

        <ResponsiveContainer>
          <ComposedChart data={model.data} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} strokeDasharray="2 6" vertical={false} />
            <XAxis dataKey="hour" tick={axisTick} tickLine={false} axisLine={{ stroke: C.line }}
              ticks={[0, 4, 8, 12, 16, 20]} tickFormatter={hourLabel} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
            <Tooltip content={<DarkTooltip unit="°F" />} labelFormatter={hourLabel} />
            <Area isAnimationActive={false} type="monotone" dataKey="band" name="added heat"
              stroke="none" fill={C.ember} fillOpacity={0.18} tooltipType="none" legendType="none" />
            <Line isAnimationActive={false} type="monotone" dataKey="then" name={`${model.thenK}s`}
              stroke={C.day} strokeWidth={2} dot={false} />
            <Line isAnimationActive={false} type="monotone" dataKey="now" name={`${model.nowK}s`}
              stroke={C.ember} strokeWidth={3} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-2 text-xs" style={{ color: C.muted }}>
        <span><span className="inline-block w-3 h-1 rounded-full align-middle mr-1" style={{ background: C.ember }} />{model.nowK}s</span>
        <span><span className="inline-block w-3 h-1 rounded-full align-middle mr-1" style={{ background: C.day }} />{model.thenK}s</span>
      </div>
      <p className="mt-4 text-base leading-relaxed">
        At {hourLabel(model.coolHour)} — the coolest moment of a summer night — {city.shortName} is now{" "}
        <span style={{ color: C.gold, fontFamily: DISPLAY }}>{model.nightGain.toFixed(1)}°F hotter</span> than it was in
        the {model.thenK}s ({model.coolThen.toFixed(0)}° then, {model.coolNow.toFixed(0)}° now). The afternoon peak rose{" "}
        {model.dayGain.toFixed(1)}°F. The city didn't make the days much hotter — it took away the night's recovery.
      </p>
      <p className="text-xs mt-3" style={{ color: C.muted }}>
        Precomputed from NOAA's hourly archive (NCEI Integrated Surface Dataset) — every June–August observation at this
        station since 1948, bucketed by local hour ({diurnal.hours}). Decades with thin hourly coverage are omitted.
        Rebuild with <code>analysis/build_diurnal.py</code>.
      </p>
    </Card>
  );
}
