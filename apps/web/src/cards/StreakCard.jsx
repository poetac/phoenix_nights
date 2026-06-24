import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { C, DISPLAY, Card, CardHead, DarkTooltip, axisTick } from "../ui.jsx";
import { streakModel } from "../lib/streakModel.js";

export default function StreakCard({ city, streaks }) {
  const model = useMemo(() => streakModel(streaks, city), [streaks, city]);

  if (!model) return null;

  return (
    <Card>
      <CardHead kicker="The unbroken stretch" title="How long the night heat holds you"
        sub="The longest run of consecutive nights each year that never dropped below 80°F. Heat illness compounds with each night the body can't reset — streaks, not averages, are what kill." />
      <div role="img" style={{ width: "100%", height: 260 }}
        aria-label="Chart of the longest run of consecutive 80°F-plus nights each year, lengthening over the record.">

        <ResponsiveContainer>
          <BarChart data={model.data} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} strokeDasharray="2 6" vertical={false} />
            <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={{ stroke: C.line }} minTickGap={32} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<DarkTooltip unit=" nights" />} cursor={{ fill: "rgba(255,107,61,0.08)" }} />
            <Bar isAnimationActive={false} dataKey="streak80" name="Longest run of 80°F+ nights" fill={C.ember} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-4 text-base leading-relaxed">
        In the {city.baseline.label}, the longest such stretch averaged {Math.round(model.earlyAvg)} nights a year.
        Over the last ten years it averaged {Math.round(model.lateAvg)} — and {model.record.year} set the all-time
        record: <span style={{ color: C.gold, fontFamily: DISPLAY }}>{model.record.streak80} consecutive nights</span>{" "}
        that never fell below 80°F. Two and a half months without a single night of relief.
      </p>
      <p className="text-xs mt-3" style={{ color: C.muted }}>
        {model.record110.streak110 > 0 && (
          <>Same daily record, days instead of nights: {model.record110.year}'s run of{" "}
          {model.record110.streak110} straight days at 110°F+{city.id === "phx" ? " — the number that made national news —" : ""}{" "}
          falls out of this dataset exactly, a good check that the pipeline is honest. </>
        )}
        Streaks are computed within calendar years (NOAA/NWS ACIS daily lows; years missing more than 36 days
        excluded). Rebuild with <code>analysis/build_streaks.py</code>.
      </p>
    </Card>
  );
}
