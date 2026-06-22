import { useMemo } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { C, DISPLAY, Card, CardHead, DarkTooltip, axisTick } from "../ui.jsx";
import { mean } from "../lib/stats.js";

export default function WinterCard({ city, streaks }) {
  const model = useMemo(() => {
    if (!streaks?.years) return null;
    const data = streaks.years.map((r) => ({ year: r.year, frost: r.frost, cool60: r.cool60 }));
    const lastYear = data[data.length - 1].year;
    const early = data.filter((r) => r.year < 1970);
    const late = data.filter((r) => r.year > lastYear - 30);
    if (early.length < 30 || late.length < 20) return null;
    const lastFrosty = [...data].reverse().find((r) => r.frost >= 5);
    const zeroFrostShare = late.filter((r) => r.frost === 0).length / late.length;
    // "Winter left first" is a frost-DISAPPEARANCE story. Only render where frost
    // has genuinely collapsed: the most recent winters no longer reach even five
    // frosts (so "the last winter with five frosts" names a PAST year) and some
    // recent winters are now frost-free. Cold interior cities (Reno, Salt Lake,
    // Boise, Albuquerque) still freeze 90–160 nights a year, so the card self-omits
    // rather than force a vanishing-frost narrative onto a city that still freezes
    // hard — and onto numbers (last 5-frost winter = this year, 0% frost-free) that
    // would read as the opposite of its own headline.
    if (!lastFrosty || lastFrosty.year >= lastYear || zeroFrostShare <= 0) return null;
    return {
      data,
      earlyFrost: mean(early.map((r) => r.frost)),
      zeroFrostShare,
      lastFrosty,
      earlyCool: mean(early.map((r) => r.cool60)),
      lateCool: mean(data.filter((r) => r.year > lastYear - 10).map((r) => r.cool60)),
    };
  }, [streaks]);

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
