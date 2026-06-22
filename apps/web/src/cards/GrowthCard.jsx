import { useMemo } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
} from "recharts";
import { C, Card, CardHead, axisTick, useUnits } from "../ui.jsx";
import { mean } from "../lib/stats.js";
import { convTempDelta, tempUnit } from "../lib/units.js";

export default function GrowthCard({ city, cityRows, ruralRows }) {
  const model = useMemo(() => {
    if (!city.metroPopulation || !ruralRows) return null;
    const cityBy = new Map(cityRows.map((r) => [r.year, r.low]));
    const byDec = {};
    for (const r of ruralRows) {
      if (!cityBy.has(r.year)) continue;
      const dec = Math.floor(r.year / 10) * 10;
      (byDec[dec] ??= []).push(cityBy.get(r.year) - r.low);
    }
    const data = Object.entries(byDec)
      .filter(([dec, v]) => v.length >= 4 && city.metroPopulation[dec] != null)
      .map(([dec, v]) => ({
        decade: `${dec}s`,
        pop: +(city.metroPopulation[dec] / 1e6).toFixed(2),
        gap: +mean(v).toFixed(1),
      }))
      .sort((a, b) => a.pop - b.pop);
    if (data.length < 4) return null;
    return { data, first: data[0], last: data[data.length - 1] };
  }, [city, cityRows, ruralRows]);

  const units = useUnits();
  if (!model) return null;
  // The city-minus-rural night gap is a difference (convTempDelta, identity in °F).
  const displayData = model.data.map((p) => ({ ...p, gap: +convTempDelta(p.gap, units).toFixed(1) }));

  return (
    <Card>
      <CardHead kicker="Dose and response" title="The gap grew with the city"
        sub={`Each point is a decade: ${city.county}'s census population against how much hotter ${city.shortName} nights ran than its ${city.rural.kind || "open desert"} reference that decade. More city, hotter nights.`} />
      <div role="img" style={{ width: "100%", height: 280 }}
        aria-label={`Chart of ${city.county}'s decade-by-decade population against how much hotter ${city.shortName} nights ran than its ${city.rural.kind || "open desert"} reference; both rise together.`}>

        <ResponsiveContainer>
          <ScatterChart margin={{ top: 18, right: 24, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} strokeDasharray="2 6" />
            <XAxis type="number" dataKey="pop" name="population" tick={axisTick} tickLine={false}
              axisLine={{ stroke: C.line }} domain={[0, "auto"]}
              label={{ value: "county population (millions)", fill: C.muted, fontSize: 11, position: "insideBottom", offset: -2 }} />
            <YAxis type="number" dataKey="gap" name="night gap" tick={axisTick} tickLine={false} axisLine={false}
              domain={["auto", "auto"]} unit="°" />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload;
              return (
                <div className="rounded-lg px-3 py-2 text-sm"
                  style={{ background: "#0e0a1a", border: `1px solid ${C.line}`, color: C.text }}>
                  <div style={{ color: C.muted }} className="text-xs mb-1">{p.decade}</div>
                  <div>{p.pop}M people · nights +{p.gap}{tempUnit(units)} vs desert</div>
                </div>
              );
            }} />
            <Scatter data={displayData} fill={C.gold} line={{ stroke: C.line, strokeWidth: 1.5 }} isAnimationActive={false}>
              <LabelList dataKey="decade" position="top" style={{ fill: C.muted, fontSize: 11 }} />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-4 text-base leading-relaxed">
        Decade by decade, {city.shortName}'s night gap over the {city.rural.short} reference tracks{" "}
        {city.county}'s population — more city, hotter nights. It reads as a dose-response, not a controlled
        trial: the same growth that built the city has also crept into the "rural" yardstick over time, so take
        the climb as indicative of the heat island's pull rather than an exact coefficient.
      </p>
      <p className="text-xs mt-3" style={{ color: C.muted }}>
        Population: US Census Bureau decennial counts for {city.county}. Night gap: decade-average difference in
        yearly mean lows, {city.urbanShort} minus {city.rural.short}, over common complete years.
      </p>
    </Card>
  );
}
