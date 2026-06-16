import { useMemo } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { C, DISPLAY, Card, CardHead, DarkTooltip, axisTick } from "../ui.jsx";

export default function HumanCostCard({ city, heatDeaths, rows }) {
  const model = useMemo(() => {
    if (!heatDeaths?.series?.length) return null;
    const nightsBy = new Map(rows.map((r) => [r.year, r.nights90]));
    const data = heatDeaths.series.map((d) => ({
      year: d.year,
      deaths: d.deaths,
      nights90: nightsBy.get(d.year) ?? null,
    }));
    const peak = data.reduce((m, d) => (d.deaths > m.deaths ? d : m), data[0]);
    return { data, first: data[0], peak, last: data[data.length - 1] };
  }, [heatDeaths, rows]);

  if (!model) return null;

  return (
    <Card>
      <CardHead kicker="The human cost" title="When the night stops cooling, people die"
        sub={`${heatDeaths.place} medical examiners investigate every suspected heat death. Bars are confirmed heat-related deaths; the gold line is the year's count of nights that never dropped below 90°F at ${city.urbanShort}.`} />
      <div role="img" style={{ width: "100%", height: 280 }}
        aria-label="Bar chart of confirmed heat-related deaths per year with a line for the count of nights at or above 90°F.">

        <ResponsiveContainer>
          <ComposedChart data={model.data} margin={{ top: 6, right: -8, left: -14, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} strokeDasharray="2 6" vertical={false} />
            <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={{ stroke: C.line }} />
            <YAxis yAxisId="d" tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis yAxisId="n" orientation="right" tick={{ ...axisTick, fill: C.gold }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<DarkTooltip unit="" />} cursor={{ fill: "rgba(226,109,109,0.08)" }} />
            <Bar isAnimationActive={false} yAxisId="d" dataKey="deaths" name="Heat deaths" fill={C.rose} radius={[2, 2, 0, 0]} />
            <Line isAnimationActive={false} yAxisId="n" type="monotone" dataKey="nights90" name="Nights ≥ 90°F"
              stroke={C.gold} strokeWidth={2} dot={{ r: 2, fill: C.gold }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-4 text-base leading-relaxed">
        In {model.first.year}, the county confirmed {model.first.deaths} heat-related deaths. In {model.peak.year} —
        the summer that set records for both 110°F days and 90°F nights —{" "}
        <span style={{ color: C.gold, fontFamily: DISPLAY }}>{model.peak.deaths} people died</span>. Heat kills at
        night as much as at noon: when the air never drops below 90°F, bodies without shelter or working AC never get
        to reset.
      </p>

      {heatDeaths.demographics?.factors?.length > 0 && (
        <div className="mt-5">
          <div className="text-xs tracking-widest uppercase mb-3" style={{ color: C.muted }}>
            Who the heat finds · {heatDeaths.demographics.year} ({heatDeaths.demographics.total} deaths)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {heatDeaths.demographics.factors.map((f, i) => (
              <div key={i} className="rounded-xl p-3" style={{ background: C.panel2, border: `1px solid ${C.line}` }}>
                <div style={{ fontFamily: DISPLAY, color: C.rose, fontSize: "1.6rem", lineHeight: 1.1 }}>{f.display}</div>
                <div className="text-sm mt-1" style={{ color: C.text }}>{f.label}</div>
                {f.sub && <div className="text-xs mt-1 leading-snug" style={{ color: C.muted }}>{f.sub}</div>}
              </div>
            ))}
          </div>
          <p className="mt-4 text-base leading-relaxed">
            Heat is not a random killer. It finds the people with the least protection from it: those with no home, those
            whose cooling has failed, those already medically fragile. Each figure points at a system, not a fault — a
            missing shelter bed, a shut-off utility, a unit no one could afford to fix.
          </p>
        </div>
      )}
      <ul className="text-xs mt-3 space-y-1 leading-relaxed" style={{ color: C.muted }}>
        <li>Deaths have fallen two years running ({model.data[model.data.length - 2].deaths} in {model.data[model.data.length - 2].year}, {model.last.deaths} in {model.last.year}) — milder summers than {model.peak.year}, plus expanded county cooling centers and outreach. Lives saved by response, not by the trend reversing.</li>
        <li>Counts include heat-caused and heat-contributed deaths as classified by the county; part of the rise in early years reflects surveillance improving as well as heat worsening.</li>
        <li>The hot-nights line is shown as context, not causal proof — both series are driven by the same summers.</li>
        {heatDeaths.demographics && (
          <li>The breakdown is from the {heatDeaths.demographics.source}; {heatDeaths.demographics.note}</li>
        )}
        <li>Source: <a href={heatDeaths.url} style={{ color: C.day }} target="_blank" rel="noreferrer">{heatDeaths.source}</a>.</li>
      </ul>
    </Card>
  );
}
