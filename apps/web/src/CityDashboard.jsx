import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, ReferenceLine, AreaChart, Area,
} from "recharts";
import { C, DISPLAY, BODY, Card, CardHead, DarkTooltip, axisTick } from "./ui.jsx";
import { linreg, mean } from "./lib/stats.js";
import {
  fetchCityYearly, fetchRural, fetchSeasonal, fetchDiurnal,
  fetchHeatSeason, fetchHeatDeaths, fetchStreaks, fetchGrid, fetchOpenMeteo,
} from "./lib/data.js";
import UhiCard from "./cards/UhiCard.jsx";
import GoalpostsCard from "./cards/GoalpostsCard.jsx";
import SeasonsCard from "./cards/SeasonsCard.jsx";
import DiurnalCard from "./cards/DiurnalCard.jsx";
import SeasonLengthCard from "./cards/SeasonLengthCard.jsx";
import HumanCostCard from "./cards/HumanCostCard.jsx";
import GrowthCard from "./cards/GrowthCard.jsx";
import StreakCard from "./cards/StreakCard.jsx";
import WinterCard from "./cards/WinterCard.jsx";
import GridCard from "./cards/GridCard.jsx";
import SourcesCard from "./cards/SourcesCard.jsx";

export default function CityDashboard({ city }) {
  const [state, setState] = useState({ loading: true, error: null, rows: [], source: null });
  const [rural, setRural] = useState(null);
  const [seasonal, setSeasonal] = useState(null);
  const [diurnal, setDiurnal] = useState(null);
  const [heatSeason, setHeatSeason] = useState(null);
  const [heatDeaths, setHeatDeaths] = useState(null);
  const [streaks, setStreaks] = useState(null);
  const [grid, setGrid] = useState(null);
  const [windowStart, setWindowStart] = useState(city.baseline.start);
  const [view, setView] = useState("anom");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    setRural(null);
    setSeasonal(null);
    setDiurnal(null);
    setHeatSeason(null);
    setHeatDeaths(null);
    setStreaks(null);
    setGrid(null);
    // these cards read static precomputed assets — independent of ACIS
    fetchDiurnal(city).then((d) => alive && setDiurnal(d)).catch(() => {});
    fetchHeatSeason(city).then((d) => alive && setHeatSeason(d)).catch(() => {});
    fetchHeatDeaths(city).then((d) => alive && setHeatDeaths(d)).catch(() => {});
    fetchStreaks(city).then((d) => alive && setStreaks(d)).catch(() => {});
    fetchGrid(city).then((d) => alive && setGrid(d)).catch(() => {});
    (async () => {
      try {
        const res = await fetchCityYearly(city);
        if (!alive) return;
        setState({ loading: false, error: null, ...res });
        // bonus cards — never block or fail the page on them
        fetchRural(city).then((rr) => alive && setRural(rr)).catch(() => {});
        fetchSeasonal(city).then((ss) => alive && setSeasonal(ss)).catch(() => {});
      } catch (e1) {
        try {
          const res = await fetchOpenMeteo(city);
          if (alive) setState({ loading: false, error: null, ...res });
        } catch (e2) {
          if (alive) setState({ loading: false, error: "Couldn't reach NOAA (ACIS) or the Open-Meteo archive. Check your connection, then tap retry.", rows: [], source: null });
        }
      }
    })();
    return () => { alive = false; };
  }, [reloadKey, city]);

  const { rows, source } = state;
  const minYear = rows.length ? rows[0].year : city.baseline.start;
  const vis = useMemo(() => rows.filter((r) => r.year >= windowStart), [rows, windowStart]);

  const base = useMemo(() => {
    const b = rows.filter((r) => r.year >= city.baseline.start && r.year <= city.baseline.end);
    return { low: mean(b.map((r) => r.low)), high: mean(b.map((r) => r.high)) };
  }, [rows, city]);

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
    nights8089: r.hotNights != null && r.nights90 != null ? r.hotNights - r.nights90 : r.hotNights,
    nights90: r.nights90,
    days110: r.days110,
    cdd: r.cdd,
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
  const days110Ok = useMemo(() => vis.filter((r) => r.days110 != null).length > vis.length * 0.7, [vis]);

  const windows = [
    ...city.windows,
    ...(minYear < Math.min(...city.windows.map((w) => w.y)) ? [{ y: minYear, label: "Full record" }] : []),
  ];

  const sourceLabel = source === "acis"
    ? `NOAA / NWS ACIS · ${city.stationLabel}`
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
            Live NOAA station record · {city.name}
          </div>
          <h1 className="text-3xl sm:text-5xl leading-tight" style={{ fontFamily: DISPLAY, fontWeight: 650 }}>
            The desert still cools off at night.
            <br />
            <span style={{ color: C.ember }}>The city doesn't.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base leading-relaxed" style={{ color: C.muted }}>
            Weather apps grade each day against a "normal range" and spotlight the afternoon high.
            This page tests a different question with the official record: are {city.shortName}'s
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
                    {fitLow?.ci95 != null && (
                      <span className="text-base sm:text-lg ml-1" style={{ color: C.muted, fontFamily: BODY }}>
                        ±{(fitLow.ci95 * 10).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="text-sm mt-1" style={{ color: C.emberSoft }}>overnight lows, per decade</div>
                </div>
                <div>
                  <div className="text-4xl sm:text-5xl" style={{ fontFamily: DISPLAY, color: C.day, fontVariantNumeric: "tabular-nums" }}>
                    {highPerDecade != null ? `${highPerDecade >= 0 ? "+" : ""}${highPerDecade.toFixed(1)}°` : "—"}
                    {fitHigh?.ci95 != null && (
                      <span className="text-base sm:text-lg ml-1" style={{ color: C.muted, fontFamily: BODY }}>
                        ±{(fitHigh.ci95 * 10).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="text-sm mt-1" style={{ color: C.day }}>daytime highs, per decade</div>
                </div>
              </div>
              {ratio != null && ratio > 0 && (
                <p className="mt-4 text-base sm:text-lg leading-relaxed">
                  Since {windowStart}, {city.shortName} nights have warmed{" "}
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
              {[{ v: "anom", label: `Departure from ${city.baseline.label}` }, { v: "actual", label: "Actual °F" }].map((o) => (
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
                  ? `Each year's average low and high, shown as departure from this station's ${city.baseline.label} average. Watch the ember line climb away from zero while the blue line drifts.`
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
                        label={{ value: `${city.baseline.label} avg`, fill: C.muted, fontSize: 11, position: "insideBottomLeft" }} />
                    )}
                    <Line isAnimationActive={false} type="monotone" dataKey={view === "anom" ? "highAnom" : "high"} name="Avg high"
                      stroke={C.day} strokeWidth={2} dot={false} />
                    <Line isAnimationActive={false} type="monotone" dataKey={view === "anom" ? "lowAnom" : "low"} name="Avg low"
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
                    Thin gray tick = the {city.baseline.label} average low ({base.low.toFixed(1)}°F), for reference.
                  </p>
                )}
              </Card>
            )}

            {source === "acis" && rural && <UhiCard city={city} cityRows={rows} ruralRows={rural} />}

            {source === "acis" && rural && <GrowthCard city={city} cityRows={rows} ruralRows={rural} />}

            {source === "acis" && <GoalpostsCard city={city} rows={rows} />}

            {source === "acis" && seasonal && <SeasonsCard city={city} seasonal={seasonal} />}

            {diurnal && <DiurnalCard city={city} diurnal={diurnal} />}

            {heatSeason && <SeasonLengthCard city={city} heatSeason={heatSeason} />}

            {hotOk && (
              <Card>
                <CardHead kicker="What it feels like" title="Nights that never dropped below 80°F"
                  sub="Count of nights each year when the temperature stayed at or above 80°F — nights with no recovery for bodies, buildings, or power grids. The gold core counts nights that never even dropped below 90°F: once a once-a-decade freak event, now a summer routine." />
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer>
                    <BarChart data={chartData} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke={C.grid} strokeDasharray="2 6" vertical={false} />
                      <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={{ stroke: C.line }} minTickGap={32} />
                      <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<DarkTooltip unit=" nights" />} cursor={{ fill: "rgba(255,107,61,0.08)" }} />
                      <Bar isAnimationActive={false} dataKey="nights90" name="Nights ≥ 90°F" stackId="n" fill={C.gold} />
                      <Bar isAnimationActive={false} dataKey="nights8089" name="Nights 80–89°F" stackId="n" fill={C.ember} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {days110Ok && (
                  <>
                    <div className="text-xs tracking-widest uppercase mt-6 mb-2" style={{ color: C.muted }}>
                      …and the days at 110°F or hotter
                    </div>
                    <div style={{ width: "100%", height: 160 }}>
                      <ResponsiveContainer>
                        <BarChart data={chartData} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
                          <CartesianGrid stroke={C.grid} strokeDasharray="2 6" vertical={false} />
                          <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={{ stroke: C.line }} minTickGap={32} />
                          <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip content={<DarkTooltip unit=" days" />} cursor={{ fill: "rgba(255,177,92,0.08)" }} />
                          <Bar isAnimationActive={false} dataKey="days110" name="Days ≥ 110°F" fill={C.emberSoft} radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </Card>
            )}

            {streaks && <StreakCard city={city} streaks={streaks} />}

            {streaks && <WinterCard city={city} streaks={streaks} />}

            {heatDeaths && source === "acis" && <HumanCostCard city={city} heatDeaths={heatDeaths} rows={rows} />}

            {grid && <GridCard city={city} grid={grid} />}

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
                      <Area isAnimationActive={false} type="monotone" dataKey="cdd" name="Cooling degree days"
                        stroke={C.emberSoft} strokeWidth={2} fill="url(#cddFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            <Card style={{ background: "transparent", border: `1px dashed ${C.line}` }}>
              <h3 className="text-sm uppercase tracking-widest mb-2" style={{ color: C.muted }}>How this works</h3>
              <ul className="text-sm space-y-2 leading-relaxed" style={{ color: C.muted }}>
                <li>Data: {sourceLabel}, fetched live each time this page loads. Years missing more than 36 days of observations are excluded, as is the still-incomplete current year; {rows[rows.length - 1].year} is the last complete year shown.</li>
                <li>Trends are ordinary least-squares fits to yearly means over the selected window, expressed per decade. The small ± figures are 95% confidence intervals on those trends.</li>
                <li>"Departure" compares every year with the same station's {city.baseline.start}–{city.baseline.end} average — a fixed baseline, unlike rolling "normals" that quietly absorb past warming.</li>
                <li>The {city.urbanShort} station sits inside the urban heat island it measures — that's the point. The control-experiment card pairs it with an open-desert station to separate the city's contribution from the global trend.</li>
                <li>The hour-by-hour card is precomputed from NOAA's hourly archive (NCEI ISD); everything else is computed in your browser from the raw yearly and monthly station records.</li>
              </ul>
            </Card>

            <SourcesCard city={city} />
          </div>
        )}
      </div>
    </div>
  );
}
