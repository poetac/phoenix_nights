import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { C, DISPLAY, Card, CardHead, DarkTooltip, axisTick, useUnits } from "../ui.jsx";
import { linreg, mean } from "../lib/stats.js";
import { convTemp, convTempDelta, tempUnit, convDistPhrase } from "../lib/units.js";

export default function UhiCard({ city, cityRows, ruralRows }) {
  const data = useMemo(() => {
    const cityBy = new Map(cityRows.map((r) => [r.year, r.low]));
    return ruralRows
      .filter((r) => cityBy.has(r.year))
      .map((r) => ({
        year: r.year,
        city: +cityBy.get(r.year).toFixed(1),
        desert: +r.low.toFixed(1),
      }));
  }, [cityRows, ruralRows]);

  const stats = useMemo(() => {
    if (data.length < 30) return null;
    const cityFit = linreg(data.map((d) => ({ x: d.year, y: d.city })));
    const desertFit = linreg(data.map((d) => ({ x: d.year, y: d.desert })));
    if (!cityFit || !desertFit) return null;
    const cityTrend = cityFit.slope * 10;
    const desertTrend = desertFit.slope * 10;
    const byDec = {};
    for (const d of data) {
      const dec = Math.floor(d.year / 10) * 10;
      (byDec[dec] ??= []).push(d.city - d.desert);
    }
    const gaps = Object.entries(byDec)
      .filter(([, v]) => v.length >= 4)
      .map(([dec, v]) => ({ decade: +dec, gap: mean(v) }))
      .sort((a, b) => a.decade - b.decade);
    if (gaps.length < 2) return null;
    return {
      cityTrend, desertTrend,
      excess: cityTrend - desertTrend,
      share: (cityTrend - desertTrend) / cityTrend,
      gaps,
      first: data[0].year,
      last: data[data.length - 1].year,
    };
  }, [data]);

  const units = useUnits();
  if (!stats || stats.excess <= 0) return null;
  const g0 = stats.gaps[0];
  const gMax = stats.gaps.reduce((m, g) => (g.gap > m.gap ? g : m), stats.gaps[0]);
  const gLast = stats.gaps[stats.gaps.length - 1];
  const kind = city.rural.kind || "open desert";
  // Chart lows are absolute temps (convTemp); trends and city-minus-rural gaps are
  // differences (convTempDelta). Both branches are the identity in °F, so the live
  // US card is byte-for-byte unchanged.
  const displayData = data.map((r) => ({
    year: r.year, city: +convTemp(r.city, units).toFixed(1), desert: +convTemp(r.desert, units).toFixed(1),
  }));
  const gap = (v) => convTempDelta(v, units);

  return (
    <Card>
      <CardHead kicker="The control experiment" title="How much of this is the city itself?"
        sub={`Two thermometers ${convDistPhrase(city.rural.distance, units)} apart: ${city.urbanShort} sits in the middle of the metro, ${city.rural.name} in ${kind}. Both are warming — the climate is shifting everywhere — but only one is wrapped in a metro area's worth of asphalt.`} />
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-3xl sm:text-4xl" style={{ fontFamily: DISPLAY, color: C.ember, fontVariantNumeric: "tabular-nums" }}>
            +{gap(stats.cityTrend).toFixed(1)}°
          </div>
          <div className="text-sm mt-1" style={{ color: C.emberSoft }}>{city.shortName} lows, per decade since {stats.first}</div>
        </div>
        <div>
          <div className="text-3xl sm:text-4xl" style={{ fontFamily: DISPLAY, color: C.sage, fontVariantNumeric: "tabular-nums" }}>
            +{gap(stats.desertTrend).toFixed(1)}°
          </div>
          <div className="text-sm mt-1" style={{ color: C.sage }}>{kind} lows ({city.rural.short})</div>
        </div>
      </div>
      <div role="img" style={{ width: "100%", height: 280 }}
        aria-label={`Line chart of ${city.shortName}'s versus its rural reference's average overnight low each year; the city line rises faster, and the gap between them widens.`}>
        <ResponsiveContainer>
          <LineChart data={displayData} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} strokeDasharray="2 6" vertical={false} />
            <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={{ stroke: C.line }} minTickGap={32} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
            <Tooltip content={<DarkTooltip unit={tempUnit(units)} />} />
            <Line isAnimationActive={false} type="monotone" dataKey="city" name={`${city.shortName} avg low`} stroke={C.ember} strokeWidth={3} dot={false} />
            <Line isAnimationActive={false} type="monotone" dataKey="desert" name={`${city.rural.short} avg low`} stroke={C.sage} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-4 text-base leading-relaxed">
        Subtract the ${kind}'s warming from the city's, and roughly{" "}
        <span style={{ color: C.gold, fontFamily: DISPLAY }}>{Math.round(stats.share * 100)}% of {city.shortName}'s night-time warming since {stats.first}</span>{" "}
        is the city itself — heat that would remain even if the global climate stood still. In the {g0.decade}s, {city.shortName}
        {" "}nights averaged {gap(g0.gap).toFixed(1)}{tempUnit(units)} hotter than the ${kind}; by the {gMax.decade}s the gap had reached{" "}
        {gap(gMax.gap).toFixed(1)}{tempUnit(units)}.
      </p>
      <ul className="text-xs mt-3 space-y-1 leading-relaxed" style={{ color: C.muted }}>
        <li>{city.rural.elevationNote}</li>
        <li>The gap has narrowed slightly since the {gMax.decade}s (to {gap(gLast.gap).toFixed(1)}{tempUnit(units)} in the {gLast.decade}s): {city.rural.growthCaveat}</li>
        <li>Years missing more than 36 days of observations are excluded; this station has occasional gaps.</li>
        {city.rural.robustnessNote && <li>{city.rural.robustnessNote}</li>}
      </ul>
    </Card>
  );
}
