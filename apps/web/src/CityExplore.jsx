import { lazy, Suspense, useEffect, useState } from "react";
import { climateOf } from "./lib/cities.js";
import { fetchFacts } from "./lib/data.js";
import { C, DISPLAY, BODY } from "./ui.jsx";
import CityMap from "./CityMap.jsx";
const CityCompare = lazy(() => import("./CityCompare.jsx"));

// The cross-city explorer / landing: the product's cities, ranked by how fast
// their summer nights are warming, each a click into its own page — plus the
// literal map and the cross-city overlay. All copy (headline, intro, footnote)
// and the city set come from the active product (see products.js), so Desert
// Nights and the broad explorer share this one component with different framing.
export default function CityExplore({ product, cities, onPick }) {
  const [ranked, setRanked] = useState(null);
  useEffect(() => {
    let alive = true;
    Promise.all(
      cities.map(async (c) => {
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
  }, [product.id, cities]);

  const rows = ranked ?? cities.map((c) => ({ city: c, nightWarming: null, top: null }));
  return (
    <div className="min-h-screen" style={{ background: C.bg, color: C.text, fontFamily: BODY }}>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0"
        style={{ background:
          `radial-gradient(120% 60% at 50% -10%, rgba(255,107,61,.16), transparent 60%)` }} />
      <main className="relative max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="text-xs tracking-widest uppercase mb-3" style={{ color: C.emberSoft }}>
          {product.kicker}
        </div>
        <h1 className="text-3xl sm:text-5xl leading-tight" style={{ fontFamily: DISPLAY, fontWeight: 650 }}>
          {product.h1Lines.map((line, i) => (
            <span key={i}>{line}{i < product.h1Lines.length - 1 ? <br /> : null}</span>
          ))}
        </h1>
        <p className="mt-3 text-sm sm:text-base leading-relaxed" style={{ color: C.muted }}>
          {product.intro}
        </p>

        <CityMap onPick={onPick} ranked={rows} cities={cities} product={product} />

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
                    {product.showClimateChips && (
                      <span className="ml-2 text-xs align-middle px-1.5 py-0.5 rounded-full"
                        style={{
                          fontFamily: BODY, fontWeight: 600,
                          color: climateOf(r.city.id).key === "humid" ? C.sage : C.emberSoft,
                          border: `1px solid ${climateOf(r.city.id).key === "humid" ? C.sage : C.emberSoft}`,
                          opacity: 0.85,
                        }}>
                        {climateOf(r.city.id).label}
                      </span>
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

        <Suspense fallback={null}><CityCompare onPick={onPick} cities={cities} /></Suspense>

        <p className="mt-8 text-xs leading-relaxed" style={{ color: C.muted }}>
          {product.caption}
        </p>
      </main>
    </div>
  );
}
