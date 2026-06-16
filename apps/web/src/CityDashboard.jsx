import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { C, DISPLAY, BODY, Card } from "./ui.jsx";
import {
  fetchCityYearly, fetchRural, fetchSeasonal, fetchDiurnal,
  fetchHeatSeason, fetchHeatDeaths, fetchStreaks, fetchGrid, fetchOpenMeteo,
  fetchNormals, fetchLastNight, fetchCddSplit,
} from "./lib/data.js";
import { assetFreshness } from "./lib/freshness.js";
import LastNightHero from "./cards/LastNightHero.jsx";

// The chart-heavy body — and the ~160 KB-gzip recharts dependency it pulls in —
// is a lazy chunk, so it loads after this shell paints and in parallel with the
// ACIS fetch rather than blocking first paint.
const DashboardBody = lazy(() => import("./DashboardBody.jsx"));

export default function CityDashboard({ city }) {
  const [state, setState] = useState({ loading: true, error: null, rows: [], source: null });
  const [rural, setRural] = useState(null);
  const [seasonal, setSeasonal] = useState(null);
  const [diurnal, setDiurnal] = useState(null);
  const [heatSeason, setHeatSeason] = useState(null);
  const [heatDeaths, setHeatDeaths] = useState(null);
  const [streaks, setStreaks] = useState(null);
  const [grid, setGrid] = useState(null);
  const [normals, setNormals] = useState(null);
  const [lastNight, setLastNight] = useState(null);
  const [cddSplit, setCddSplit] = useState(null);
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
    setNormals(null);
    setLastNight(null);
    setCddSplit(null);
    // these cards read static precomputed assets — independent of ACIS
    fetchDiurnal(city).then((d) => alive && setDiurnal(d)).catch(() => {});
    fetchHeatSeason(city).then((d) => alive && setHeatSeason(d)).catch(() => {});
    fetchHeatDeaths(city).then((d) => alive && setHeatDeaths(d)).catch(() => {});
    fetchStreaks(city).then((d) => alive && setStreaks(d)).catch(() => {});
    fetchGrid(city).then((d) => alive && setGrid(d)).catch(() => {});
    fetchCddSplit(city).then((d) => alive && setCddSplit(d)).catch(() => {});
    // the live hero hook: last night's low (ACIS) vs the 1970s seasonal normal (asset)
    fetchNormals(city).then((d) => alive && setNormals(d)).catch(() => {});
    fetchLastNight(city).then((d) => alive && setLastNight(d)).catch(() => {});
    // warm the lazy body chunk in parallel with the fetch so there's no gap
    // between the data resolving and the charts rendering.
    import("./DashboardBody.jsx").catch(() => {});
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

  const freshness = useMemo(
    () => assetFreshness({ diurnal, heatSeason, streaks, grid, cddSplit, heatDeaths }),
    [diurnal, heatSeason, streaks, grid, cddSplit, heatDeaths],
  );

  return (
    <div className="min-h-screen" style={{ background: C.bg, color: C.text, fontFamily: BODY }}>
      <style>{`
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
        .pulse { animation: pulse 1.4s ease-in-out infinite; }
        @keyframes pulse { 0%,100% { opacity: .35 } 50% { opacity: 1 } }
        button:focus-visible, a:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
        .skip-link { position: absolute; left: 8px; top: -48px; z-index: 50; padding: 8px 14px;
          border-radius: 8px; background: ${C.ember}; color: #1a0d06; font-weight: 600;
          transition: top .15s ease; }
        .skip-link:focus { top: 8px; }
      `}</style>

      <a href="#content" className="skip-link">Skip to content</a>

      <div aria-hidden="true" className="pointer-events-none fixed inset-0"
        style={{ background:
          `radial-gradient(120% 60% at 50% -10%, rgba(255,107,61,.16), transparent 60%),` +
          `radial-gradient(90% 50% at 80% 0%, rgba(255,177,92,.08), transparent 55%)` }} />

      <main id="content" tabIndex={-1} className="relative max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
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

        <LastNightHero city={city} lastNight={lastNight} normals={normals} />

        {freshness?.stale?.length > 0 && (
          <div className="rounded-xl px-4 py-3 mb-6 text-sm" role="status"
            style={{ background: "rgba(255,177,92,.08)", border: `1px solid ${C.gold}`, color: C.gold }}>
            Some precomputed series only run through {Math.min(...freshness.stale.map((s) => s.year))} — the live trend,
            anomaly, and hero cards are current through {freshness.target}. The static datasets refresh on the next
            scheduled data rebuild.
          </div>
        )}

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

        <Suspense fallback={null}>
          {!state.loading && !state.error && rows.length > 0 && (
            <DashboardBody key={city.id} city={city} rows={rows} source={source}
              rural={rural} seasonal={seasonal} diurnal={diurnal} heatSeason={heatSeason}
              heatDeaths={heatDeaths} streaks={streaks} grid={grid} cddSplit={cddSplit} freshness={freshness} />
          )}
        </Suspense>
      </main>
    </div>
  );
}
