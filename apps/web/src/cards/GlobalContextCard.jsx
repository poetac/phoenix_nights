import { useMemo } from "react";
import {
  BarChart, Bar, Cell, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { C, DISPLAY, Card, CardHead, axisTick, useUnits, TooltipShell } from "../ui.jsx";
import { linreg } from "../lib/stats.js";
import { convTempDelta, tempUnit } from "../lib/units.js";
import { signed } from "../lib/format.js";

// Published background-warming rates, °F/decade — cited reference lines, not
// derived from this station (see the card's caveat). Both are annual averages
// across all 24 hours, so they run cooler than the overnight-low trends the
// rest of the page measures; that's stated, and it makes them a conservative
// floor for the comparison.
const GLOBAL = 0.36; // NASA GISTEMP / NOAA: global land+ocean ~0.20°C (0.36°F)/decade, recent decades
const CONUS = 0.50;  // NOAA / Climate Central: contiguous U.S. ~2.5°F since 1970
const WINDOW = 1970; // compute the local trends over the same era the benchmarks describe

export default function GlobalContextCard({ city, cityRows, ruralRows }) {
  const model = useMemo(() => {
    if (!cityRows?.length || !ruralRows?.length) return null;
    const ruralBy = new Map(ruralRows.map((r) => [r.year, r.low]));
    const common = cityRows
      .filter((r) => r.year >= WINDOW && ruralBy.has(r.year))
      .map((r) => ({ year: r.year, city: r.low, desert: ruralBy.get(r.year) }));
    if (common.length < 20) return null;
    const cityFit = linreg(common.map((d) => ({ x: d.year, y: d.city })));
    const desertFit = linreg(common.map((d) => ({ x: d.year, y: d.desert })));
    if (!cityFit || !desertFit) return null;
    const cityTrend = cityFit.slope * 10;
    const desertTrend = desertFit.slope * 10;
    if (cityTrend <= 0 || desertTrend <= 0) return null;

    const bars = [
      { label: "Whole planet", rate: +GLOBAL.toFixed(2), kind: "bench" },
      { label: "United States", rate: +CONUS.toFixed(2), kind: "bench" },
      { label: `${city.rural.short} nights`, rate: +desertTrend.toFixed(2), kind: "desert" },
      { label: `${city.shortName} · city nights`, rate: +cityTrend.toFixed(2), kind: "city" },
    ].sort((a, b) => a.rate - b.rate);

    return {
      bars, cityTrend, desertTrend,
      cityX: cityTrend / GLOBAL, desertX: desertTrend / GLOBAL,
      first: common[0].year, last: common[common.length - 1].year,
    };
  }, [cityRows, ruralRows, city]);

  const units = useUnits();
  if (!model) return null;
  const { bars, cityTrend, desertTrend, cityX, desertX, first } = model;
  // Reference migration for the units layer (lib/units.js): render every trend in
  // the active system. convTempDelta scales a per-decade slope by 5/9 with no 32°
  // offset and is the identity for imperial, so the live US output is byte-for-byte
  // unchanged. The cityX/desertX multiples are unit-free ratios (left as-is), and
  // the footnote's published figures keep their cited units.
  const displayBars = bars.map((b) => ({ ...b, rate: +convTempDelta(b.rate, units).toFixed(2) }));
  const tCity = convTempDelta(cityTrend, units);
  const tDesert = convTempDelta(desertTrend, units);
  const kind = city.rural.kind || "open desert";
  const fill = (kind) => (kind === "city" ? C.ember : kind === "desert" ? C.sage : C.line);

  return (
    <Card>
      <CardHead kicker="Against the whole planet" title={`Outrunning the Earth — the city, and the ${kind}`}
        sub={`Warming isn't spread evenly. Lined up the same way — degrees per decade since ${first} — here is how ${city.shortName}'s nights and the ${kind}'s nights compare with the background rates for the United States and the planet as a whole.`} />
      <div role="img" style={{ width: "100%", height: 200 }}
        aria-label={`Horizontal bar chart comparing warming rates in degrees ${units === "metric" ? "Celsius" : "Fahrenheit"} per decade: the global average and the United States average against the city and its rural reference's overnight lows, which run well above the global rate.`}>

        <ResponsiveContainer>
          <BarChart data={displayBars} layout="vertical" margin={{ top: 4, right: 44, left: 8, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} strokeDasharray="2 6" horizontal={false} />
            <XAxis type="number" tick={axisTick} tickLine={false} axisLine={{ stroke: C.line }}
              domain={[0, "dataMax"]} tickFormatter={(v) => `${v}°`} />
            <YAxis type="category" dataKey="label" tick={axisTick} tickLine={false} axisLine={false} width={150} />
            <Tooltip cursor={{ fill: "rgba(255,255,255,.04)" }} content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload;
              return (
                <TooltipShell>
                  <div>{p.label}</div>
                  <div style={{ color: C.muted }}>{signed(p.rate, 2)}{tempUnit(units)} per decade{p.kind === "bench" ? " (annual avg)" : " (overnight low)"}</div>
                </TooltipShell>
              );
            }} />
            <Bar isAnimationActive={false} dataKey="rate" radius={[0, 4, 4, 0]}>
              {displayBars.map((b, i) => <Cell key={i} fill={fill(b.kind)} fillOpacity={b.kind === "bench" ? 0.55 : 1} />)}
              <LabelList dataKey="rate" position="right" formatter={(v) => `${signed(v, 2)}°`}
                style={{ fill: C.muted, fontSize: 12, fontVariantNumeric: "tabular-nums" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-4 text-base leading-relaxed">
        Since {first}, {city.shortName}'s overnight lows have climbed at{" "}
        <span style={{ color: C.ember, fontFamily: DISPLAY }}>+{tCity.toFixed(1)}{tempUnit(units)} per decade</span> — about{" "}
        <span style={{ color: C.gold, fontFamily: DISPLAY }}>{cityX.toFixed(1)}×</span> the whole planet's average rate.
        {desertX > 1 ? (
          <>Even {city.rural.short}'s nights, at +{tDesert.toFixed(1)}{tempUnit(units)} per decade ({desertX.toFixed(1)}× global),
            outpace it. The climate is warming everywhere; out here it warms faster, and inside the city faster still.</>
        ) : (
          <>{city.rural.short}'s nights climb more slowly — +{tDesert.toFixed(1)}{tempUnit(units)} per decade ({desertX.toFixed(1)}× global) —
            so the city's overnight warming stands out against its own regional backdrop, not just the planet's.</>
        )}
      </p>
      <ul className="text-xs mt-3 space-y-1 leading-relaxed" style={{ color: C.muted }}>
        <li>Read the benchmark bars as a <em>conservative floor</em>: the global and U.S. figures are annual averages across
          all 24 hours, while the two local figures are overnight lows — which carry steeper trends than daytime averages
          almost everywhere. Part of the gap is lows-vs-means, not only place; the city-vs-rural gap (the control card above)
          holds the metric fixed.</li>
        <li>Benchmarks are published rates, not derived from this station: global ≈ 0.20°C (0.36°F)/decade
          (NASA GISTEMP / NOAA, recent decades); contiguous U.S. ≈ 2.5°F since 1970 (NOAA / Climate Central). The
          ember and green bars are computed live from the ACIS record over common years since {first}.</li>
      </ul>
    </Card>
  );
}
