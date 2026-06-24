import { useMemo } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { C, DISPLAY, Card, CardHead, axisTick, TooltipShell } from "../ui.jsx";
import { direction, pluralize } from "../lib/format.js";
import { doyLabel } from "../lib/labels.js";
import { seasonLengthModel } from "../lib/seasonLengthModel.js";

const MONTH_TICKS = [91, 121, 152, 182, 213, 244, 274];
const MONTH_NAMES = { 91: "Apr", 121: "May", 152: "Jun", 182: "Jul", 213: "Aug", 244: "Sep", 274: "Oct" };

export default function SeasonLengthCard({ city, heatSeason }) {
  // seasonLengthModel self-omits unless the 100°F season actually lengthened (the
  // expansion guard that keeps the card off cities like Dallas). See lib/seasonLengthModel.js.
  const model = useMemo(() => seasonLengthModel(heatSeason, city), [heatSeason, city]);

  if (!model) return null;
  const fs = direction(model.firstShift, { pos: "earlier", neg: "later", zero: null });
  const firstClause = fs.word
    ? <>now arrives <span style={{ color: C.gold, fontFamily: DISPLAY }}>{pluralize(fs.mag, "day")} {fs.word}</span></>
    : <>has held about steady</>;

  return (
    <Card>
      <CardHead kicker="The expanding season" title="Summer is annexing spring and fall"
        shareCity={city.id} shareSlug="hundred-days"
        sub={`Each year's band runs from the first 100°F day to the last. Watch the bottom edge sink toward spring while the top edge pushes into fall.`} />
      <div role="img" style={{ width: "100%", height: 300 }}
        aria-label="Chart of each year's first-to-last 100°F day; the band widens into spring and fall over time.">

        <ResponsiveContainer>
          <ComposedChart data={model.data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} strokeDasharray="2 6" vertical={false} />
            <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={{ stroke: C.line }} minTickGap={32} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false}
              domain={[80, 320]} ticks={MONTH_TICKS} tickFormatter={(v) => doyLabel(v, MONTH_NAMES)} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload;
              return (
                <TooltipShell>
                  <div style={{ color: C.muted }} className="text-xs mb-1">{label}</div>
                  <div>{doyLabel(p.first, MONTH_NAMES)} – {doyLabel(p.last, MONTH_NAMES)}</div>
                  <div style={{ color: C.muted }}>{p.count} days ≥ 100°F</div>
                </TooltipShell>
              );
            }} />
            <Area isAnimationActive={false} type="monotone" dataKey="band" name="100°F season"
              stroke="none" fill={C.ember} fillOpacity={0.25} />
            <Line isAnimationActive={false} type="monotone" dataKey="first" name="first 100°F day"
              stroke={C.emberSoft} strokeWidth={1.5} dot={false} />
            <Line isAnimationActive={false} type="monotone" dataKey="last" name="last 100°F day"
              stroke={C.emberSoft} strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-4 text-base leading-relaxed">
        Compared with the {city.baseline.label}, the first 100°F day {firstClause}{" "}
        and the season runs{" "}
        <span style={{ color: C.gold, fontFamily: DISPLAY }}>{Math.round(model.lengthGain)} days longer</span> —{" "}
        {Math.round(model.countLate)} triple-digit days a year now, against {Math.round(model.countEarly)} then.
        {fs.n > 0 && <> That's most of an extra month of summer on each end of the calendar.</>}
        {model.susGain != null && model.susGain > 0 && <>
          {" "}Counting only <em>sustained</em> heat — runs of three or more 100°F days, which a single freak
          spring scorcher can't trigger — the season still grew about{" "}
          <span style={{ color: C.gold, fontFamily: DISPLAY }}>{Math.round(model.susGain)} days</span>.
        </>}
      </p>
      <p className="text-xs mt-3" style={{ color: C.muted }}>
        The count of 100°F days (in the tooltip) is the outlier-robust headline; the band traces the first and last
        <em> single</em> day to reach 100°F, so its edges are noisier year to year, and the shifts quoted above are
        {city.baseline.label}-vs-recent decade <em>averages</em>, not single years. {model.nYears} sufficiently complete
        years on record ({model.minYear}–{model.lastYear}). Computed from every daily high since 1896 (NOAA/NWS ACIS);
        years missing more than 36 daily highs are excluded. Rebuild with <code>analysis/build_heat_season.py</code>.
      </p>
    </Card>
  );
}
