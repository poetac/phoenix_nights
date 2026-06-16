import { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { C, DISPLAY, Card, CardHead, DarkTooltip, axisTick } from "../ui.jsx";
import { mean } from "../lib/stats.js";

// Nights at/above ~25°C (77°F) — the threshold above which population sleep
// measurably degrades in the peer-reviewed record (Obradovich 2017; Minor 2022).
// Distinct from the 80°F-night card: this one is anchored to a cited
// physiological line, not a round number, and is framed around sleep + health.
const THRESHOLD = 77;

export default function SleepCard({ city, rows, windowStart }) {
  const model = useMemo(() => {
    const series = rows.filter((r) => r.year >= windowStart && r.sleepNights != null);
    if (series.length < 20) return null;
    const lastYear = series[series.length - 1].year;
    const base = series.filter((r) => r.year <= city.baseline.end).map((r) => r.sleepNights);
    const recent = series.filter((r) => r.year > lastYear - 10).map((r) => r.sleepNights);
    if (base.length < 7 || recent.length < 7) return null;
    return {
      data: series.map((r) => ({ year: r.year, nights: r.sleepNights })),
      baseAvg: mean(base),
      recentAvg: mean(recent),
      peak: series.reduce((m, r) => (r.sleepNights > m.sleepNights ? r : m), series[0]),
    };
  }, [rows, windowStart, city]);

  if (!model) return null;

  return (
    <Card>
      <CardHead kicker="The body keeps score" title="Nights too warm to sleep through"
        sub={`Nights each year that stayed at or above ${THRESHOLD}°F (25°C) — the point where studies find human sleep starts to measurably fray. Above it, people fall asleep later and wake earlier, and the effect hits hardest in already-hot, lower-income places.`} />
      <div role="img" style={{ width: "100%", height: 250 }}
        aria-label="Chart of the number of nights per year at or above the 77°F sleep-disruption threshold, rising over the record.">

        <ResponsiveContainer>
          <AreaChart data={model.data} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="sleepFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.ember} stopOpacity={0.5} />
                <stop offset="100%" stopColor={C.ember} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={C.grid} strokeDasharray="2 6" vertical={false} />
            <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={{ stroke: C.line }} minTickGap={32} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<DarkTooltip unit=" nights" />} />
            <ReferenceLine y={model.baseAvg} stroke={C.day} strokeDasharray="4 4"
              label={{ value: `${city.baseline.label} avg`, fill: C.day, fontSize: 10, position: "insideTopLeft" }} />
            <Area isAnimationActive={false} type="monotone" dataKey="nights" name={`Nights ≥ ${THRESHOLD}°F`}
              stroke={C.ember} strokeWidth={2.5} fill="url(#sleepFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-4 text-base leading-relaxed">
        In the {city.baseline.label}, {city.shortName} averaged{" "}
        <span style={{ fontFamily: DISPLAY, color: C.day }}>{Math.round(model.baseAvg)} nights a year</span> above the
        sleep-loss threshold. Over the last decade it averaged{" "}
        <span style={{ color: C.gold, fontFamily: DISPLAY }}>{Math.round(model.recentAvg)}</span> — and{" "}
        {model.peak.year} hit {model.peak.nights}. That's most of summer spent above the temperature where a full
        night's rest stops being something the climate gives back for free.
      </p>
      <p className="text-xs mt-3" style={{ color: C.muted }}>
        Threshold from Obradovich et al., <em>Science Advances</em> (2017) and Minor et al., <em>One Earth</em> (2022),
        which link nighttime temperatures above ~25°C to measurable population-level sleep loss; the line is a published
        average effect, not a Phoenix-specific clinical finding. Counts are days with a daily low ≥ {THRESHOLD}°F from
        the live NOAA/NWS ACIS station record (same hygiene rule: years missing more than 36 days excluded).
      </p>
    </Card>
  );
}
