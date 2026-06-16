import { useMemo } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { C, DISPLAY, Card, CardHead, axisTick } from "../ui.jsx";
import { mean } from "../lib/stats.js";

// The warm-night season lives roughly May–October; keep the axis tight to it.
const MONTH_TICKS = [121, 152, 182, 213, 244, 274];
const MONTH_NAMES = { 121: "May", 152: "Jun", 182: "Jul", 213: "Aug", 244: "Sep", 274: "Oct" };

function doyLabel(doy) {
  if (MONTH_NAMES[doy]) return MONTH_NAMES[doy];
  const d = new Date(2001, 0, doy);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function HotNightSeasonCard({ city, streaks }) {
  const model = useMemo(() => {
    if (!streaks?.years) return null;
    const data = streaks.years
      .filter((r) => r.first80 != null && r.last80 != null)
      .map((r) => ({
        year: r.year, first: r.first80, last: r.last80, band: [r.first80, r.last80],
        length: r.last80 - r.first80 + 1, count: r.count80,
        susLen: r.firstSus != null && r.lastSus != null ? r.lastSus - r.firstSus + 1 : null,
      }));
    if (data.length < 30) return null;
    const early = data.filter((r) => r.year >= city.baseline.start && r.year <= city.baseline.end);
    const lastYear = data[data.length - 1].year;
    const late = data.filter((r) => r.year > lastYear - 10);
    if (early.length < 7 || late.length < 7) return null;
    const eSus = early.map((r) => r.susLen).filter((v) => v != null);
    const lSus = late.map((r) => r.susLen).filter((v) => v != null);
    return {
      data,
      nYears: data.length, minYear: data[0].year, lastYear,
      firstShift: mean(early.map((r) => r.first)) - mean(late.map((r) => r.first)),
      lastShift: mean(late.map((r) => r.last)) - mean(early.map((r) => r.last)),
      lengthGain: mean(late.map((r) => r.length)) - mean(early.map((r) => r.length)),
      countEarly: mean(early.map((r) => r.count)),
      countLate: mean(late.map((r) => r.count)),
      // sustained season (5-of-7 nights >=80F) — present only after a rebuild
      susGain: eSus.length >= 5 && lSus.length >= 5 ? mean(lSus) - mean(eSus) : null,
    };
  }, [streaks, city]);

  if (!model) return null;

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
              domain={[110, 300]} ticks={MONTH_TICKS} tickFormatter={doyLabel} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload;
              return (
                <div className="rounded-lg px-3 py-2 text-sm"
                  style={{ background: "#0e0a1a", border: `1px solid ${C.line}`, color: C.text }}>
                  <div style={{ color: C.muted }} className="text-xs mb-1">{label}</div>
                  <div>{doyLabel(p.first)} – {doyLabel(p.last)}</div>
                  <div style={{ color: C.muted }}>{p.count} nights ≥ 80°F</div>
                </div>
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
        Against the {city.baseline.label}, the first 80°F night now arrives{" "}
        <span style={{ color: C.gold, fontFamily: DISPLAY }}>{Math.round(model.firstShift)} days earlier</span>{" "}
        and the last one lingers{" "}
        <span style={{ color: C.gold, fontFamily: DISPLAY }}>{Math.round(model.lastShift)} days later</span> —
        a warm-night season{" "}
        <span style={{ color: C.gold, fontFamily: DISPLAY }}>{Math.round(model.lengthGain)} days longer</span> on the
        calendar, holding {Math.round(model.countLate)} such nights a year now against {Math.round(model.countEarly)} then.
        The relief window at both ends of summer is closing.
        {model.susGain != null && <>
          {" "}On a stricter rule that ignores lone warm nights — at least five of any seven nights ≥ 80°F — the
          season still stretched about{" "}
          <span style={{ color: C.gold, fontFamily: DISPLAY }}>{Math.round(model.susGain)} days</span>.
        </>}
      </p>
      <p className="text-xs mt-3" style={{ color: C.muted }}>
        The count of 80°F nights (in the tooltip) is the outlier-robust headline; the band marks the first and last
        <em> single</em> 80°F night, so its edges jump year to year, and the shifts above are {city.baseline.label}-vs-recent
        decade <em>averages</em>. {model.nYears} years on record ({model.minYear}–{model.lastYear}). Computed from every
        daily low since 1896 (NOAA/NWS ACIS); years missing more than 36 daily lows are excluded. The {city.urbanShort}
        gauge sits inside the urban heat island it measures, so part of this lengthening is the city itself, not the
        climate alone; the threaded record splices downtown (pre-1933) onto Sky Harbor. Rebuild with
        <code>analysis/build_streaks.py</code>.
      </p>
    </Card>
  );
}
