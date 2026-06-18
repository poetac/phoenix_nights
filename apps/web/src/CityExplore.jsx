import { lazy, Suspense, useEffect, useState } from "react";
import { CITIES } from "./lib/cities.js";
import { fetchFacts } from "./lib/data.js";
import { C, DISPLAY, BODY } from "./ui.jsx";
import CityMap from "./CityMap.jsx";
const CityCompare = lazy(() => import("./CityCompare.jsx"));

// The cross-city explorer / landing: every computed city, ranked by how fast its
// summer nights are warming, each a click into its own page. The shareable hook
// — and the "pick a city" entry point. (A literal US map is the next step.)
export default function CityExplore({ onPick }) {
  const [ranked, setRanked] = useState(null);
  useEffect(() => {
    let alive = true;
    Promise.all(
      CITIES.map(async (c) => {
        try {
          const f = await fetchFacts(c);
          const nw = f.facts.find((x) => x.key === "night_warming");
          return { city: c, nightWarming: nw?.value ?? null, top: f.facts[0] };
        } catch {
          return { city: c, nightWarming: null, top: null };
        }
      }),
    ).then((rows) => {
      if (!alive) return;
      rows.sort((a, b) => (b.nightWarming ?? -99) - (a.nightWarming ?? -99));
      setRanked(rows);
    });
    return () => { alive = false; };
  }, []);

  const rows = ranked ?? CITIES.map((c) => ({ city: c, nightWarming: null, top: null }));
  return (
    <div className="min-h-screen" style={{ background: C.bg, color: C.text, fontFamily: BODY }}>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0"
        style={{ background:
          `radial-gradient(120% 60% at 50% -10%, rgba(255,107,61,.16), transparent 60%)` }} />
      <main className="relative max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="text-xs tracking-widest uppercase mb-3" style={{ color: C.emberSoft }}>
          Live NOAA station record · the desert Southwest
        </div>
        <h1 className="text-3xl sm:text-5xl leading-tight" style={{ fontFamily: DISPLAY, fontWeight: 650 }}>
          Where the desert is losing<br />its cool nights
        </h1>
        <p className="mt-3 text-sm sm:text-base leading-relaxed" style={{ color: C.muted }}>
          Each city's overnight lows, straight from the official record, ranked by how fast its
          summer nights are warming. Pick a city to see its full story.
        </p>

        <CityMap onPick={onPick} ranked={rows} />

        <ol className="mt-4 space-y-3" aria-label="Cities ranked by overnight-low warming">
          {rows.map((r, i) => (
            <li key={r.city.id}>
              <button onClick={() => onPick(r.city.id)}
                className="w-full text-left rounded-2xl p-4 sm:p-5 flex items-center gap-4 transition"
                style={{ background: C.panel, border: `1px solid ${C.line}`, cursor: "pointer" }}>
                <span aria-hidden="true"
                  style={{ fontFamily: DISPLAY, color: C.muted, fontSize: 22, minWidth: 28 }}>{i + 1}</span>
                <span className="flex-1 min-w-0">
                  <span className="block" style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 650 }}>
                    {r.city.name}
                    {r.city.featured && (
                      <span className="ml-2 text-xs align-middle" style={{ color: C.gold }}>★ flagship</span>
                    )}
                  </span>
                  <span className="block text-sm mt-0.5 truncate" style={{ color: C.muted }}>
                    {r.top ? r.top.label : "—"}
                  </span>
                </span>
                {r.nightWarming != null && (
                  <span className="text-right" style={{ minWidth: 96 }}>
                    <span className="block" style={{ fontFamily: DISPLAY, color: C.ember, fontSize: 24, fontWeight: 650 }}>
                      +{r.nightWarming.toFixed(1)}°
                    </span>
                    <span className="block text-xs" style={{ color: C.emberSoft }}>nights, °F/decade</span>
                  </span>
                )}
              </button>
            </li>
          ))}
        </ol>

        <Suspense fallback={null}><CityCompare onPick={onPick} /></Suspense>

        <p className="mt-8 text-xs leading-relaxed" style={{ color: C.muted }}>
          Overnight-low warming since 1970, vs the ~0.36 °F/decade global background rate. Phoenix is
          the flagship narrative; every city is computed live from the NOAA (ACIS) station record. The map above and the list share one ranking.
        </p>
      </main>
    </div>
  );
}
