import { useMemo } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { C, DISPLAY, Card, CardHead, axisTick, TooltipShell } from "../ui.jsx";
import { direction, pluralize } from "../lib/format.js";
import { doyLabel } from "../lib/labels.js";
import { hotNightSeasonModel } from "../lib/hotNightSeasonModel.js";

// The warm-night season lives roughly May–October; keep the axis tight to it.
const MONTH_TICKS = [121, 152, 182, 213, 244, 274];
const MONTH_NAMES = { 121: "May", 152: "Jun", 182: "Jul", 213: "Aug", 244: "Sep", 274: "Oct" };

export default function HotNightSeasonCard({ city, streaks }) {
  // hotNightSeasonModel self-omits unless the warm-night band actually lengthened (the
  // expansion guard, mirroring SeasonLengthCard). See lib/hotNightSeasonModel.js.
  const model = useMemo(() => hotNightSeasonModel(streaks, city), [streaks, city]);

  if (!model) return null;
  const fns = direction(model.firstShift, { pos: "earlier", neg: "later", zero: null });
  const lns = direction(model.lastShift, { pos: "later", neg: "earlier", zero: null });
  const firstClause = fns.word
    ? <>now arrives <span style={{ color: C.gold, fontFamily: DISPLAY }}>{pluralize(fns.mag, "day")} {fns.word}</span></>
    : <>has held about steady</>;
  const lastClause = lns.word
    ? <>{lns.n > 0 ? "lingers" : "pulls in"} <span style={{ color: C.gold, fontFamily: DISPLAY }}>{pluralize(lns.mag, "day")} {lns.word}</span></>
    : <>holds about steady</>;

  return (
    <Card>
      <CardHead kicker="The lengthening night season"
        title="The warm-night season keeps both ends open longer"
        sub="Each year's band runs from the first 80°F+ night to the last — the stretch of calendar when the dark never brings relief. This is the lows-first companion to the 100°F-day season above, and the one that matters more: it's the warm nights, not the hot afternoons, that drive heat illness." />
      <div role="img" style={{ width: "100%", height: 300 }}
        aria-label="Chart of each year's first-to-last 80°F night; the warm-night band lengthens at both ends over time.">

        <ResponsiveContainer>
          <ComposedChart data={model.data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} strokeDasharray="2 6" vertical={false} />
            <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={{ stroke: C.line }} minTickGap={32} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false}
              domain={[110, 300]} ticks={MONTH_TICKS} tickFormatter={(v) => doyLabel(v, MONTH_NAMES)} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload;
              return (
                <TooltipShell>
                  <div style={{ color: C.muted }} className="text-xs mb-1">{label}</div>
                  <div>{doyLabel(p.first, MONTH_NAMES)} – {doyLabel(p.last, MONTH_NAMES)}</div>
                  <div style={{ color: C.muted }}>{p.count} nights ≥ 80°F</div>
                </TooltipShell>
              );
            }} />
            <Area isAnimationActive={false} type="monotone" dataKey="band" name="80°F-night season"
              stroke="none" fill={C.ember} fillOpacity={0.28} />
            <Line isAnimationActive={false} type="monotone" dataKey="first" name="first 80°F night"
              stroke={C.gold} strokeWidth={1.5} dot={false} />
            <Line isAnimationActive={false} type="monotone" dataKey="last" name="last 80°F night"
              stroke={C.gold} strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-4 text-base leading-relaxed">
        Against the {city.baseline.label}, the first 80°F night {firstClause}{" "}
        and the last one {lastClause} —
        a warm-night season{" "}
        <span style={{ color: C.gold, fontFamily: DISPLAY }}>{Math.round(model.lengthGain)} days longer</span> on the
        calendar, holding {Math.round(model.countLate)} such nights a year now against {Math.round(model.countEarly)} then.
        {fns.n > 0 && lns.n > 0 && <> The relief window at both ends of summer is closing.</>}
        {model.susGain != null && model.susGain > 0 && <>
          {" "}On a stricter rule that ignores lone warm nights — at least five of any seven nights ≥ 80°F — the
          season still stretched about{" "}
          <span style={{ color: C.gold, fontFamily: DISPLAY }}>{Math.round(model.susGain)} days</span>.
        </>}
      </p>
      <p className="text-xs mt-3" style={{ color: C.muted }}>
        The count of 80°F nights (in the tooltip) is the outlier-robust headline; the band marks the first and last
        <em> single</em> 80°F night, so its edges jump year to year, and the shifts above are {city.baseline.label}-vs-recent
        decade <em>averages</em>. {model.nYears} years on record ({model.minYear}–{model.lastYear}). Computed from every
        daily low since {model.minYear} (NOAA/NWS ACIS); years missing more than 36 daily lows are excluded. The {city.urbanShort}
        gauge sits inside the urban heat island it measures, so part of this lengthening is the city itself, not the
        climate alone. Rebuild with <code>analysis/build_streaks.py</code>.
      </p>
    </Card>
  );
}
