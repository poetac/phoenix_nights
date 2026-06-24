import { useMemo } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { C, DISPLAY, Card, CardHead, DarkTooltip, axisTick } from "../ui.jsx";
import { winterModel } from "../lib/winterModel.js";

export default function WinterCard({ city, streaks }) {
  // winterModel self-omits (returns null) unless frost has genuinely collapsed here —
  // the applicability guard that keeps this card off cities that still freeze hard.
  // See lib/winterModel.js.
  const model = useMemo(() => winterModel(streaks), [streaks]);

  if (!model) return null;

  return (
    <Card>
      <CardHead kicker="The other end of the year" title="Winter left first"
        sub="Frost once defined winter here — and the same warming that keeps summer nights hot has all but erased it. Blue bars: nights at or below freezing. Gold line: nights at or below a crisp 60°F."
      />
      <div role="img" style={{ width: "100%", height: 260 }}
        aria-label="Chart of nights per year at or below freezing and at or below 60°F, both dwindling over the record.">

        <ResponsiveContainer>
          <ComposedChart data={model.data} margin={{ top: 6, right: -8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} strokeDasharray="2 6" vertical={false} />
            <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={{ stroke: C.line }} minTickGap={32} />
            <YAxis yAxisId="f" tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis yAxisId="c" orientation="right" tick={{ ...axisTick, fill: C.gold }} tickLine={false} axisLine={false} domain={[0, "auto"]} />
            <Tooltip content={<DarkTooltip unit=" nights" />} cursor={{ fill: "rgba(143,184,216,0.08)" }} />
            <Bar isAnimationActive={false} yAxisId="f" dataKey="frost" name="Frost nights (≤32°F)" fill={C.day} radius={[2, 2, 0, 0]} />
            <Line isAnimationActive={false} yAxisId="c" type="monotone" dataKey="cool60" name="Cool nights (≤60°F)"
              stroke={C.gold} strokeWidth={1.5} dot={false} strokeOpacity={0.85} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-4 text-base leading-relaxed">
        Before 1970, {city.shortName} froze about {Math.round(model.earlyFrost)} nights a year. The last winter with
        even five frosts was <span style={{ color: C.gold, fontFamily: DISPLAY }}>{model.lastFrosty.year}</span>;{" "}
        {Math.round(model.zeroFrostShare * 100)}% of the last thirty years had none at all. Even ordinary coolness is
        draining away: nights at or below 60°F have fallen from ~{Math.round(model.earlyCool)} a year to ~
        {Math.round(model.lateCool)} — about {Math.round(model.earlyCool - model.lateCool)} lost cool nights annually.
      </p>
      <p className="text-xs mt-3" style={{ color: C.muted }}>
        Same source and hygiene as the streak card. A footnote for gardeners: it's why USDA hardiness zones keep
        shifting — the winter that defined {city.shortName} in 1950 no longer exists at this station.
      </p>
    </Card>
  );
}
