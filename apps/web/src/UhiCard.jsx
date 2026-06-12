import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { C, DISPLAY, Card, CardHead, DarkTooltip, axisTick } from "./ui.jsx";
import { linreg, mean } from "./lib/stats.js";
import { RURAL } from "./lib/data.js";

export default function UhiCard({ phxRows, ruralRows }) {
  const data = useMemo(() => {
    const phxBy = new Map(phxRows.map((r) => [r.year, r.low]));
    return ruralRows
      .filter((r) => phxBy.has(r.year))
      .map((r) => ({
        year: r.year,
        city: +phxBy.get(r.year).toFixed(1),
        desert: +r.low.toFixed(1),
      }));
  }, [phxRows, ruralRows]);

  const stats = useMemo(() => {
    if (data.length < 30) return null;
    const cityFit = linreg(data.map((d) => ({ x: d.year, y: d.city })));
    const desertFit = linreg(data.map((d) => ({ x: d.year, y: d.desert })));
    if (!cityFit || !desertFit) return null;
    const city = cityFit.slope * 10;
    const desert = desertFit.slope * 10;
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
      city, desert,
      excess: city - desert,
      share: (city - desert) / city,
      gaps,
      first: data[0].year,
      last: data[data.length - 1].year,
    };
  }, [data]);

  if (!stats || stats.excess <= 0) return null;
  const g0 = stats.gaps[0];
  const gMax = stats.gaps.reduce((m, g) => (g.gap > m.gap ? g : m), stats.gaps[0]);
  const gLast = stats.gaps[stats.gaps.length - 1];

  return (
    <Card>
      <CardHead kicker="The control experiment" title="How much of this is the city itself?"
        sub={`Same desert, two thermometers ~45 miles apart. Sky Harbor sits in the middle of the metro; ${RURAL.name} sits in open desert. Both are warming — the climate is shifting everywhere — but only one has five million people's worth of asphalt around it.`} />
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-3xl sm:text-4xl" style={{ fontFamily: DISPLAY, color: C.ember, fontVariantNumeric: "tabular-nums" }}>
            +{stats.city.toFixed(1)}°
          </div>
          <div className="text-sm mt-1" style={{ color: C.emberSoft }}>Phoenix lows, per decade since {stats.first}</div>
        </div>
        <div>
          <div className="text-3xl sm:text-4xl" style={{ fontFamily: DISPLAY, color: C.sage, fontVariantNumeric: "tabular-nums" }}>
            +{stats.desert.toFixed(1)}°
          </div>
          <div className="text-sm mt-1" style={{ color: C.sage }}>open-desert lows ({RURAL.short})</div>
        </div>
      </div>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} strokeDasharray="2 6" vertical={false} />
            <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={{ stroke: C.line }} minTickGap={32} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
            <Tooltip content={<DarkTooltip unit="°F" />} />
            <Line isAnimationActive={false} type="monotone" dataKey="city" name="Phoenix avg low" stroke={C.ember} strokeWidth={3} dot={false} />
            <Line isAnimationActive={false} type="monotone" dataKey="desert" name={`${RURAL.short} avg low`} stroke={C.sage} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-4 text-base leading-relaxed">
        Subtract the desert's warming from the city's, and roughly{" "}
        <span style={{ color: C.gold, fontFamily: DISPLAY }}>{Math.round(stats.share * 100)}% of Phoenix's night-time warming since {stats.first}</span>{" "}
        is the city itself — heat that would remain even if the global climate stood still. In the {g0.decade}s, Phoenix
        nights averaged {g0.gap.toFixed(1)}°F hotter than the open desert; by the {gMax.decade}s the gap had reached{" "}
        {gMax.gap.toFixed(1)}°F.
      </p>
      <ul className="text-xs mt-3 space-y-1 leading-relaxed" style={{ color: C.muted }}>
        <li>The monument station sits ~300 ft higher than Sky Harbor, so part of the <em>absolute</em> gap is elevation — the honest signal is the gap's growth, not its size.</li>
        <li>The gap has narrowed slightly since the {gMax.decade}s (to {gLast.gap.toFixed(1)}°F in the {gLast.decade}s): the Casa Grande–Maricopa corridor has been booming, so the "rural" reference is slowly growing its own heat island. If anything, that makes the city share above an underestimate.</li>
        <li>Years missing more than 36 days of observations are excluded; this station has occasional gaps.</li>
      </ul>
    </Card>
  );
}
