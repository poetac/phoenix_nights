import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, ReferenceLine, AreaChart, Area,
} from "recharts";

const C = {
  bg: "#141021", panel: "#1d1832", panel2: "#251e3e", line: "#2f2750",
  grid: "#2a2347", text: "#f2ecdf", muted: "#9b93ae",
  ember: "#ff6b3d", emberSoft: "#ffb15c", day: "#8fb8d8", gold: "#ffd9a0",
};
const DISPLAY = "'Fraunces', Georgia, 'Times New Roman', serif";
const BODY = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";

function linreg(pts) {
  const n = pts.length;
  if (n < 3) return null;
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (const p of pts) { sx += p.x; sy += p.y; sxy += p.x * p.y; sxx += p.x * p.x; }
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  return { slope, intercept: (sy - slope * sx) / n };
}
const num = (v) => { const f = parseFloat(v); return Number.isFinite(f) ? f : null; };
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);

async function fetchACIS() {
  const body = {
    sid: "PHXthr 9", sdate: "1896-01-01", edate: "2025-12-31",
    elems: [
      { name: "maxt", interval: "yly", duration: "yly", reduce: "mean" },
      { name: "mint", interval: "yly", duration: "yly", reduce: "mean" },
      { name: "mint", interval: "yly", duration: "yly", reduce: "cnt_ge_80" },
      { name: "cdd", interval: "yly", duration: "yly", reduce: "sum" },
    ],
    meta: ["name"],
  };
  const r = await fetch("https://data.rcc-acis.org/StnData", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("ACIS " + r.status);
  const j = await r.json();
  if (!j.data || !j.data.length) throw new Error("ACIS returned no data");
  const rows = j.data.map((d) => ({
    year: parseInt(d[0], 10), high: num(d[1]), low: num(d[2]),
    hotNights: num(d[3]), cdd: num(d[4]),
  })).filter((r2) => r2.high != null && r2.low != null && r2.year <= 2025);
  if (rows.length < 30) throw new Error("ACIS record too short");
  return { rows, source: "acis" };
}

async function fetchOpenMeteo() {
  const u =
    "https://archive-api.open-meteo.com/v1/archive?latitude=33.4278&longitude=-112.0037" +
    "&start_date=1948-01-01&end_date=2025-12-31" +
    "&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=America%2FPhoenix";
  const r = await fetch(u);
  if (!r.ok) throw new Error("Open-Meteo " + r.status);
  const j = await r.json();
  const t = j.daily.time, mx = j.daily.temperature_2m_max, mn = j.daily.temperature_2m_min;
  const by = {};
  for (let i = 0; i < t.length; i++) {
    if (mx[i] == null || mn[i] == null) continue;
    const y = +t[i].slice(0, 4);
    if (!by[y]) by[y] = { hs: 0, ls: 0, n: 0, hot: 0, cdd: 0 };
    const b = by[y];
    b.hs += mx[i]; b.ls += mn[i]; b.n++;
    if (mn[i] >= 80) b.hot++;
    const m = (mx[i] + mn[i]) / 2;
    if (m > 65) b.cdd += m - 65;
  }
  const rows = Object.keys(by).map((y) => {
    const b = by[y];
    return { year: +y, high: b.hs / b.n, low: b.ls / b.n, hotNights: b.hot, cdd: Math.round(b.cdd) };
  }).filter((r2) => r2.year <= 2025).sort((a, b) => a.year - b.year);
  return { rows, source: "openmeteo" };
}

function Card({ children, style }) {
  return (
    <div className="rounded-2xl p-4 sm:p-6"
      style={{ background: C.panel, border: `1px solid ${C.line}`, ...style }}>
      {children}
    </div>
  );
}

function CardHead({ kicker, title, sub }) {
  return (
    <div className="mb-4">
      {kicker && <div className="text-xs tracking-widest uppercase mb-1" style={{ color: C.muted }}>{kicker}</div>}
      <h2 className="text-xl sm:text-2xl" style={{ fontFamily: DISPLAY, color: C.text, fontWeight: 600 }}>{title}</h2>
      {sub && <p className="text-sm mt-1 leading-relaxed" style={{ color: C.muted }}>{sub}</p>}
    </div>
  );
}

function DarkTooltip({ active, payload, label, unit }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-sm"
      style={{ background: "#0e0a1a", border: `1px solid ${C.line}`, color: C.text }}>
      <div style={{ color: C.muted }} className="text-xs mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}{unit}</span>
        </div>
      ))}
    </div>
  );
}

const axisTick = { fill: C.muted, fontSize: 11, fontFamily: BODY };

export default function PhoenixNights() {
  const [state, setState] = useState({ loading: true, error: null, rows: [], source: null });
  const [windowStart, setWindowStart] = useState(1970);
  const [view, setView] = useState("anom");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    (async () => {
      try {
        const res = await fetchACIS();
        if (alive) setState({ loading: false, error: null, ...res });
      } catch (e1) {
        try {
          const res = await fetchOpenMeteo();
          if (alive) setState({ loading: false, error: null, ...res });
        } catch (e2) {
          if (alive) setState({ loading: false, error: "Couldn't reach NOAA (ACIS) or the Open-Meteo archive. Check your connection, then tap retry.", rows: [], source: null });
        }
      }
    })();
    return () => { alive = false; };
  }, [reloadKey]);

  const { rows, source } = state;
  const minYear = rows.length ? rows[0].year : 1970;
  const vis = useMemo(() => rows.filter((r) => r.year >= windowStart), [rows, windowStart]);

  const base = useMemo(() => {
    const b = rows.filter((r) => r.year >= 1970 && r.year <= 1979);
    return { low: mean(b.map((r) => r.low)), high: mean(b.map((r) => r.high)) };
  }, [rows]);

  const fitLow = useMemo(() => linreg(vis.map((r) => ({ x: r.year, y: r.low }))), [vis]);
  const fitHigh = useMemo(() => linreg(vis.map((r) => ({ x: r.year, y: r.high }))), [vis]);
  const lowPerDecade = fitLow ? fitLow.slope * 10 : null;
  const highPerDecade = fitHigh ? fitHigh.slope * 10 : null;
  const ratio = lowPerDecade != null && highPerDecade != null && Math.abs(highPerDecade) > 0.05
    ? lowPerDecade / highPerDecade : null;

  const chartData = useMemo(() => vis.map((r) => ({
    year: r.year,
    low: +r.low.toFixed(1), high: +r.high.toFixed(1),
    lowAnom: base.low != null ? +(r.low - base.low).toFixed(1) : null,
    highAnom: base.high != null ? +(r.high - base.high).toFixed(1) : null,
    hotNights: r.hotNights, cdd: r.cdd,
  })), [vis, base]);

  const decades = useMemo(() => {
    const g = {};
    for (const r of vis) {
      const d = Math.floor(r.year / 10) * 10;
      if (!g[d]) g[d] = [];
      g[d].push(r);
    }
    return Object.keys(g).map((d) => ({
      decade: +d,
      low: mean(g[d].map((r) => r.low)),
      high: mean(g[d].map((r) => r.high)),
      n: g[d].length,
    })).filter((d) => d.n >= 4).sort((a, b) => a.decade - b.decade);
  }, [vis]);

  const ladder = useMemo(() => {
    if (!decades.length) return null;
    const lo = Math.min(...decades.map((d) => d.low)) - 1.5;
    const hi = Math.max(...decades.map((d) => d.high)) + 1.5;
    const pos = (v) => ((v - lo) / (hi - lo)) * 100;
    return { lo, hi, pos };
  }, [decades]);

  const cddOk = useMemo(() => vis.filter((r) => r.cdd != null).length > vis.length * 0.7, [vis]);
  const hotOk = useMemo(() => vis.filter((r) => r.hotNights != null).length > vis.length * 0.7, [vis]);

  const windows = [
    { y: 1970, label: "Since 1970" },
    { y: 1948, label: "Since 1948" },
    ...(minYear <= 1900 ? [{ y: minYear, label: "Full record" }] : []),
  ];

  const sourceLabel = source === "acis"
    ? "NOAA / NWS ACIS · Phoenix ThreadEx station record (downtown 1896–1933, Sky Harbor 1933–present)"
    : "Open-Meteo ERA5 reanalysis (modeled estimate — station data unavailable right now)";

  return (
    <div className="min-h-screen" style={{ background: C.bg, color: C.text, fontFamily: BODY }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,650&display=swap');
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
        .pulse { animation: pulse 1.4s ease-in-out infinite; }
        @keyframes pulse { 0%,100% { opacity: .35 } 50% { opacity: 1 } }
        button:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
      `}</style>

      <div className="pointer-events-none fixed inset-0"
        style={{ background:
          `radial-gradient(120% 60% at 50% -10%, rgba(255,107,61,.16), transparent 60%),` +
          `radial-gradient(90% 50% at 80% 0%, rgba(255,177,92,.08), transparent 55%)` }} />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8">
          <div className="text-xs tracking-widest uppercase mb-3" style={{ color: C.emberSoft }}>
            Live NOAA station record · Phoenix, AZ
          </div>
          <h1 className="text-3xl sm:text-5xl leading-tight" style={{ fontFamily: DISPLAY, fontWeight: 650 }}>
            The desert still cools off at night.
            <br />
            <span style={{ color: C.ember }}>The city doesn't.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base leading-relaxed" style={{ color: C.muted }}>
            Weather apps grade each day against a "normal range" and spotlight the afternoon high.
            This page tests a different question with the official record: are Phoenix's
            <em> overnight lows</em> abandoning their history faster than its highs?
          </p>
        </header>

        {state.loading && (
          <Card>
            <div className="flex items-center gap-3">
              <span className="pulse inline-block w-3 h-3 rounded-full" style={{ background: C.ember }} />
              <span style={{ color: C.muted }}>Pulling the yearly record from NOAA…</span>
            </div>
          </Card>
        )}

        {state.error && (
          <Card>
            <p className="mb-3">{state.error}</p>
            <button onClick={() => setReloadKey((k) => k + 1)} className="rounded-full px-4 py-2 text-sm"
              style={{ background: C.ember, color: "#1a0d06", fontWeight: 600 }}>
              Retry
            </button>
          </Card>
        )}

        {!state.loading && !state.error && rows.length > 0 && (
          <div className="space-y-6">
            <Card style={{ background: C.panel2 }}>
              <div className="text-xs tracking-widest uppercase mb-3" style={{ color: C.muted }}>
                The verdict · {windowStart}–{rows[rows.length - 1].year} trend
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-4xl sm:text-5xl" style={{ fontFamily: DISPLAY, color: C.ember, fontVariantNumeric: "tabular-nums" }}>
                    {lowPerDecade != null ? `+${lowPerDecade.toFixed(1)}°` : "—"}
                  </div>
                  <div className="text-sm mt-1" style={{ color: C.emberSoft }}>overnight lows, per decade</div>
                </div>
                <div>
                  <div className="text-4xl sm:text-5xl" style={{ fontFamily: DISPLAY, color: C.day, fontVariantNumeric: "tabular-nums" }}>
                    {highPerDecade != null ? `${highPerDecade >= 0 ? "+" : ""}${highPerDecade.toFixed(1)}°` : "—"}
                  </div>
                  <div className="text-sm mt-1" style={{ color: C.day }}>daytime highs, per decade</div>
                </div>
              </div>
              {ratio != null && ratio > 0 && (
                <p className="mt-4 text-base sm:text-lg leading-relaxed">
                  Since {windowStart}, Phoenix nights have warmed{" "}
                  <span style={{ color: C.gold, fontFamily: DISPLAY }}>{ratio.toFixed(1)}× faster</span>{" "}
                  than its days — the fingerprint of asphalt and concrete releasing stored heat after sunset.
                </p>
              )}
            </Card>

            <div className="flex flex-wrap items-center gap-2">
              {windows.map((w) => (
                <button key={w.y} onClick={() => setWindowStart(w.y)} className="rounded-full px-3 py-1.5 text-sm"
                  style={{
                    background: windowStart === w.y ? C.ember : "transparent",
                    color: windowStart === w.y ? "#1a0d06" : C.muted,
                    border: `1px solid ${windowStart === w.y ? C.ember : C.line}`,
                    fontWeight: windowStart === w.y ? 600 : 400,
                  }}>
                  {w.label}
                </button>
              ))}
              <span className="mx-1 hidden sm:inline" style={{ color: C.line }}>|</span>
              {[{ v: "anom", label: "Departure from 1970s" }, { v: "actual", label: "Actual °F" }].map((o) => (
                <button key={o.v} onClick={() => setView(o.v)} className="rounded-full px-3 py-1.5 text-sm"
                  style={{
                    background: view === o.v ? C.panel2 : "transparent",
                    color: view === o.v ? C.text : C.muted,
                    border: `1px solid ${view === o.v ? C.gold : C.line}`,
                  }}>
                  {o.label}
                </button>
              ))}
            </div>

            <Card>
              <CardHead kicker="Yearly averages" title="Pulling away from the past"
                sub={view === "anom"
                  ? "Each year's average low and high, shown as departure from this station's 1970s average. Watch the ember line climb away from zero while the blue line drifts."
                  : "Each year's average low and high in °F. The gap between night and day is quietly narrowing."} />
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
                    <CartesianGrid stroke={C.grid} strokeDasharray="2 6" vertical={false} />
                    <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={{ stroke: C.line }} minTickGap={32} />
                    <YAxis tick={axisTick} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                    <Tooltip content={<DarkTooltip unit="°F" />} />
                    {view === "anom" && (
                      <ReferenceLine y={0} stroke={C.muted} strokeDasharray="4 4"
                        label={{ value: "1970s avg", fill: C.muted, fontSize: 11, position: "insideBottomLeft" }} />
                    )}
                    <Line type="monotone" dataKey={view === "anom" ? "highAnom" : "high"} name="Avg high"
                      stroke={C.day} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey={view === "anom" ? "lowAnom" : "low"} name="Avg low"
                      stroke={C.ember} strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 mt-2 text-xs" style={{ color: C.muted }}>
                <span><span className="inline-block w-3 h-1 rounded-full align-middle mr-1" style={{ background: C.ember }} />Overnight low</span>
                <span><span className="inline-block w-3 h-1 rounded-full align-middle mr-1" style={{ background: C.day }} />Daytime high</span>
              </div>
            </Card>

            {decades.length >= 2 && ladder && (
              <Card>
                <CardHead kicker="Decade by decade" title="The floor is rising faster than the ceiling"
                  sub="Each bar spans a decade's average low to its average high. The left edge — the nights — is marching right faster than the right edge." />
                <div className="space-y-3">
                  {decades.map((d) => (
                    <div key={d.decade} className="flex items-center gap-2 text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                      <div className="w-12 shrink-0" style={{ color: C.muted }}>{d.decade}s</div>
                      <div className="w-10 shrink-0 text-right" style={{ color: C.ember }}>{d.low.toFixed(0)}°</div>
                      <div className="relative flex-1 h-2 rounded-full" style={{ background: "#171229" }}>
                        {base.low != null && (
                          <div className="absolute top-[-4px] bottom-[-4px] w-px"
                            style={{ left: `${ladder.pos(base.low)}%`, background: C.muted, opacity: 0.5 }} />
                        )}
                        <div className="absolute top-0 bottom-0 rounded-full"
                          style={{
                            left: `${ladder.pos(d.low)}%`,
                            width: `${Math.max(ladder.pos(d.high) - ladder.pos(d.low), 1)}%`,
                            background: `linear-gradient(90deg, ${C.ember}, ${C.emberSoft}, ${C.day})`,
                          }} />
                      </div>
                      <div className="w-10 shrink-0" style={{ color: C.day }}>{d.high.toFixed(0)}°</div>
                    </div>
                  ))}
                </div>
                {base.low != null && (
                  <p className="text-xs mt-3" style={{ color: C.muted }}>
                    Thin gray tick = the 1970s average low ({base.low.toFixed(1)}°F), for reference.
                  </p>
                )}
              </Card>
            )}

            {hotOk && (
              <Card>
                <CardHead kicker="What it feels like" title="Nights that never dropped below 80°F"
                  sub="Count of nights each year when the temperature stayed at or above 80°F — nights with no recovery for bodies, buildings, or power grids." />
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer>
                    <BarChart data={chartData} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke={C.grid} strokeDasharray="2 6" vertical={false} />
                      <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={{ stroke: C.line }} minTickGap={32} />
                      <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<DarkTooltip unit=" nights" />} cursor={{ fill: "rgba(255,107,61,0.08)" }} />
                      <Bar dataKey="hotNights" name="Nights ≥ 80°F" fill={C.ember} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {cddOk && (
              <Card>
                <CardHead kicker="Area under the curve" title="Total yearly cooling demand"
                  sub="Cooling degree days — the standard proxy for air-conditioning load. Because each day's mean is (high + low) ÷ 2, warmer nights raise it exactly as much as hotter afternoons do." />
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer>
                    <AreaChart data={chartData} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="cddFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={C.ember} stopOpacity={0.5} />
                          <stop offset="100%" stopColor={C.ember} stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={C.grid} strokeDasharray="2 6" vertical={false} />
                      <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={{ stroke: C.line }} minTickGap={32} />
                      <YAxis tick={axisTick} tickLine={false} axisLine={false} width={52} />
                      <Tooltip content={<DarkTooltip unit=" CDD" />} />
                      <Area type="monotone" dataKey="cdd" name="Cooling degree days"
                        stroke={C.emberSoft} strokeWidth={2} fill="url(#cddFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            <Card style={{ background: "transparent", border: `1px dashed ${C.line}` }}>
              <h3 className="text-sm uppercase tracking-widest mb-2" style={{ color: C.muted }}>How this works</h3>
              <ul className="text-sm space-y-2 leading-relaxed" style={{ color: C.muted }}>
                <li>Data: {sourceLabel}, fetched live each time this page loads. Years with incomplete records are excluded; {rows[rows.length - 1].year} is the last complete year shown.</li>
                <li>Trends are ordinary least-squares fits to yearly means over the selected window, expressed per decade.</li>
                <li>"Departure" compares every year with the same station's 1970–1979 average — a fixed baseline, unlike rolling "normals" that quietly absorb past warming.</li>
                <li>One honest caveat: this station sits inside the urban heat island it measures. Pairing it with a rural station (Casa Grande, Wickenburg) is the next step, and isolates how much of the trend is the city itself.</li>
              </ul>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
