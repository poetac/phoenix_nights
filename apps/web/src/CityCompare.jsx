import { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { fetchCompare } from "./lib/data.js";
import { C, DISPLAY, BODY, axisTick } from "./ui.jsx";

// Linear interpolate between two hex colors (t in 0..1).
function lerpHex(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0"));
  return "#" + c.join("");
}

// The cross-city overlay: every city's annual overnight low as a departure from
// its OWN 1970s normal, on one chart — so you can watch them all pull away from
// zero and see which is steepest. Slow→fast cities run blue→ember; the Phoenix
// flagship is gold. Clicking a city (line or legend chip) opens its page.
export default function CityCompare({ onPick, cities }) {
  const [model, setModel] = useState(null);
  useEffect(() => {
    let alive = true;
    fetchCompare().then((j) => { if (alive) setModel(j); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const view = useMemo(() => {
    if (!model) return null;
    const byId = new Map(cities.map((c) => [c.id, c]));
    const inProduct = model.cities.filter((c) => byId.has(c.id));
    const slopes = inProduct.map((c) => c.slope);
    const lo = Math.min(...slopes), hi = Math.max(...slopes);
    const color = (c) => byId.get(c.id).featured
      ? C.gold
      : lerpHex(C.day, C.ember, hi > lo ? (c.slope - lo) / (hi - lo) : 0.5);
    // pivot to one row per year
    const years = new Set();
    const series = inProduct.map((c) => {
      const m = new Map(c.anomalies.map(([y, a]) => [y, a]));
      c.anomalies.forEach(([y]) => years.add(y));
      return { ...c, m, color: color(c), name: byId.get(c.id).shortName, featured: byId.get(c.id).featured };
    });
    const data = [...years].sort((a, b) => a - b).map((y) => {
      const row = { year: y };
      for (const s of series) row[s.id] = s.m.has(y) ? s.m.get(y) : null;
      return row;
    });
    const ordered = [...series].sort((a, b) => b.slope - a.slope);
    return { data, ordered, through: model.throughYear };
  }, [model, cities]);

  if (!view) return null;
  const { data, ordered, through } = view;

  return (
    <section className="mt-10" aria-label="All cities' overnight-low warming compared">
      <h2 className="text-xl sm:text-2xl" style={{ fontFamily: DISPLAY, fontWeight: 650 }}>
        Every city, on one chart
      </h2>
      <p className="mt-1 text-sm leading-relaxed" style={{ color: C.muted }}>
        Each city's average overnight low as a departure from its <em>own</em> 1970s normal — so the
        desert, the high country, and the humid South are comparable. Every line climbs; the steepest is {ordered[0].name}.
      </p>
      <div data-testid="city-compare" role="img" className="mt-4"
        style={{ width: "100%", height: 320 }}
        aria-label={`Line chart through ${through}: ${ordered.length} cities' overnight-low departure from their 1970s baselines, all rising, ${ordered[0].name} steepest.`}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 6, right: 10, left: -14, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} strokeDasharray="2 6" vertical={false} />
            <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={{ stroke: C.line }} minTickGap={32} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} unit="°"
              domain={["auto", "auto"]} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const rows = payload.filter((p) => p.value != null)
                .sort((a, b) => b.value - a.value);
              return (
                <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "#0e0a1a", border: `1px solid ${C.line}`, color: C.text, maxWidth: 220 }}>
                  <div style={{ color: C.muted }} className="mb-1">{label} · vs 1970s</div>
                  {rows.map((p) => {
                    const c = ordered.find((o) => o.id === p.dataKey);
                    return (
                      <div key={p.dataKey} className="flex items-center justify-between gap-3">
                        <span><span className="inline-block w-2 h-2 rounded-full align-middle mr-1" style={{ background: p.stroke }} />{c?.name}</span>
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>{p.value > 0 ? "+" : ""}{p.value.toFixed(1)}°</span>
                      </div>
                    );
                  })}
                </div>
              );
            }} />
            <ReferenceLine y={0} stroke={C.muted} strokeDasharray="4 4"
              label={{ value: "1970s normal", fill: C.muted, fontSize: 11, position: "insideBottomLeft" }} />
            {ordered.map((c) => (
              <Line key={c.id} dataKey={c.id} name={c.name} stroke={c.color}
                strokeWidth={c.featured ? 2.6 : 1.6} dot={false} connectNulls
                isAnimationActive={false} style={{ cursor: "pointer" }}
                onClick={() => onPick(c.id)} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Cities by warming rate (click to open)">
        {ordered.map((c) => (
          <li key={c.id}>
            <button onClick={() => onPick(c.id)} className="text-xs flex items-center gap-1.5"
              style={{ background: "none", border: "none", cursor: "pointer", color: C.text, fontFamily: BODY }}>
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: c.color }} />
              {c.name}{c.featured && <span style={{ color: C.gold }}> ★</span>}
              <span style={{ color: C.muted }}>+{c.slope.toFixed(1)}°/dec</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
