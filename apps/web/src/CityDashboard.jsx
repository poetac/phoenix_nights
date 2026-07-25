import { useState, useEffect, useMemo, useReducer, lazy, Suspense } from "react";
import { C, DISPLAY, BODY, Card, UnitsContext } from "./ui.jsx";
import { unitsOf } from "./lib/units.js";
import {
  fetchCityYearly, fetchRural, fetchSeasonal, fetchDiurnal,
  fetchHeatSeason, fetchHeatDeaths, fetchStreaks, fetchGrid, fetchOpenMeteo,
  fetchNormals, fetchLastNight, fetchCddSplit, fetchFacts,
} from "./lib/data.js";
import { assetFreshness } from "./lib/freshness.js";
import LastNightHero from "./cards/LastNightHero.jsx";
import CityFacts from "./cards/CityFacts.jsx";

// The chart-heavy body — and the ~160 KB-gzip recharts dependency it pulls in —
// is a lazy chunk, so it loads after this shell paints and in parallel with the
// ACIS fetch rather than blocking first paint.
const DashboardBody = lazy(() => import("./DashboardBody.jsx"));
// City Signals composes a different, salience-driven body (only this city's
// top-fact cards). Desert Nights keeps the full curated DashboardBody.
const SignalsBody = lazy(() => import("./SignalsBody.jsx"));

// The 11 secondary assets each resolve independently (their own fetch, their own
// catch) and all reset together on a city switch or Retry — one reducer captures
// both without 11 parallel useState/setX pairs staying in sync by convention.
const ASSET_KEYS = [
  "rural", "seasonal", "diurnal", "heatSeason", "heatDeaths",
  "streaks", "grid", "normals", "lastNight", "cddSplit", "facts",
];
const EMPTY_ASSETS = Object.fromEntries(ASSET_KEYS.map((k) => [k, null]));

function assetsReducer(assets, action) {
  switch (action.type) {
    case "reset": return EMPTY_ASSETS;
    case "set": return { ...assets, [action.key]: action.value };
    default: return assets;
  }
}

export default function CityDashboard({ city, product }) {
  const signals = product?.layout === "signals";
  const [state, setState] = useState({ loading: true, error: null, rows: [], source: null });
  const [assets, dispatchAssets] = useReducer(assetsReducer, EMPTY_ASSETS);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    const set = (key) => (value) => alive && dispatchAssets({ type: "set", key, value });
    setState((s) => ({ ...s, loading: true, error: null }));
    dispatchAssets({ type: "reset" });
    // these cards read static precomputed assets — independent of ACIS
    fetchDiurnal(city).then(set("diurnal")).catch(() => {});
    fetchHeatSeason(city).then(set("heatSeason")).catch(() => {});
    fetchHeatDeaths(city).then(set("heatDeaths")).catch(() => {});
    fetchStreaks(city).then(set("streaks")).catch(() => {});
    fetchGrid(city).then(set("grid")).catch(() => {});
    fetchCddSplit(city).then(set("cddSplit")).catch(() => {});
    fetchFacts(city).then(set("facts")).catch(() => {});
    // the live hero hook: last night's low (ACIS) vs the 1970s seasonal normal (asset)
    fetchNormals(city).then(set("normals")).catch(() => {});
    fetchLastNight(city).then(set("lastNight")).catch(() => {});
    // warm the lazy body chunk in parallel with the fetch so there's no gap
    // between the data resolving and the charts rendering.
    import(signals ? "./SignalsBody.jsx" : "./DashboardBody.jsx").catch(() => {});
    (async () => {
      try {
        const res = await fetchCityYearly(city);
        if (!alive) return;
        setState({ loading: false, error: null, ...res });
        // bonus cards — never block or fail the page on them
        fetchRural(city).then(set("rural")).catch(() => {});
        fetchSeasonal(city).then(set("seasonal")).catch(() => {});
      } catch {
        try {
          const res = await fetchOpenMeteo(city);
          if (alive) setState({ loading: false, error: null, ...res });
        } catch {
          if (alive) setState({ loading: false, error: "Couldn't reach NOAA (ACIS) or the Open-Meteo archive. Check your connection, then tap retry.", rows: [], source: null });
        }
      }
    })();
    return () => { alive = false; };
  }, [reloadKey, city, signals]);

  const { rows, source } = state;
  const { rural, seasonal, diurnal, heatSeason, heatDeaths, streaks, grid, normals, lastNight, cddSplit, facts } = assets;

  const freshness = useMemo(
    () => assetFreshness({
      diurnal, heatSeason, streaks, grid, cddSplit, heatDeaths,
      // International (GHCN) cities have no live ACIS trend — their whole record is the
      // committed GSOY series (rows). Feed it so a stale series (e.g. Sydney, whose GSOY
      // record ends 2019) is caught instead of silently driving a "current" headline.
      ...(source === "ghcn" && rows.length ? { series: { series: rows } } : {}),
    }),
    [diurnal, heatSeason, streaks, grid, cddSplit, heatDeaths, source, rows],
  );

  return (
    // Per-city unit system (imperial today; metric once an international city is
    // added). Imperial is the converter identity, so this wrapper is a no-op for
    // the live US product — see lib/units.js.
    <UnitsContext.Provider value={unitsOf(city)}>
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
          {!signals && city.featured ? (
            <>
              <h1 className="text-3xl sm:text-5xl leading-tight" style={{ fontFamily: DISPLAY, fontWeight: 650 }}>
                {city.featured.line1}
                {city.featured.line2 && (
                  <>
                    <br />
                    <span style={{ color: C.ember }}>{city.featured.line2}</span>
                  </>
                )}
              </h1>
              <p className="mt-3 text-sm sm:text-base leading-relaxed" style={{ color: C.muted }}>
                {city.featured.sub}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl sm:text-5xl leading-tight" style={{ fontFamily: DISPLAY, fontWeight: 650 }}>
                {facts?.facts?.[0]?.label ?? `How ${city.shortName}'s climate is changing`}
              </h1>
              {facts?.facts?.[0]?.crossCityPercentile >= 0.999 && (
                <div className="mt-2 text-xs tracking-widest uppercase" style={{ color: C.gold }}>
                  ▲ leads every city tracked
                </div>
              )}
              <p className="mt-3 text-sm sm:text-base leading-relaxed" style={{ color: C.muted }}>
                The official station record for {city.name}, ranked by what stands out from the
                last half-century{city.rural ? ` — overnight lows measured against ${city.rural.short}, its nearby ${city.rural.kind ?? "open-desert"} reference` : ""}.
              </p>
            </>
          )}
        </header>

        {city.caveat && (
          <div className="rounded-xl px-4 py-3 mb-6 text-sm leading-relaxed" role="note"
            style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.muted }}>
            <span style={{ color: C.ember, fontWeight: 650 }}>What's distinctive — </span>
            {city.caveat}
          </div>
        )}

        <LastNightHero city={city} lastNight={lastNight} normals={normals} />

      <CityFacts facts={facts?.facts} city={city} />

        {freshness?.stale?.length > 0 && (
          <div className="rounded-xl px-4 py-3 mb-6 text-sm" role="status"
            style={{ background: "rgba(255,177,92,.08)", border: `1px solid ${C.gold}`, color: C.gold }}>
            {source === "ghcn" ? (
              <>
                {city.shortName}'s annual record (NCEI Global Summary of the Year) currently runs through{" "}
                {freshness.through} — NCEI hasn't published a later annual summary for this station, so the trend
                and facts above reflect data through {freshness.through}, not {freshness.target}.
              </>
            ) : (
              <>
                Some precomputed series only run through {Math.min(...freshness.stale.map((s) => s.year))} — the live trend,
                anomaly, and hero cards are current through {freshness.target}. The static datasets refresh on the next
                scheduled data rebuild.
              </>
            )}
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
            signals ? (
              <SignalsBody key={city.id} city={city} rows={rows} source={source}
                rural={rural} diurnal={diurnal} heatSeason={heatSeason} streaks={streaks} cddSplit={cddSplit} facts={facts?.facts} />
            ) : (
              <DashboardBody key={city.id} city={city} rows={rows} source={source}
                rural={rural} seasonal={seasonal} diurnal={diurnal} heatSeason={heatSeason}
                heatDeaths={heatDeaths} streaks={streaks} grid={grid} cddSplit={cddSplit} freshness={freshness} />
            )
          )}
        </Suspense>
      </main>
    </div>
    </UnitsContext.Provider>
  );
}
