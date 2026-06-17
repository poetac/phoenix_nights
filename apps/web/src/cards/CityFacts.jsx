import { C, DISPLAY } from "../ui.jsx";

// The salience payoff: each city's top-ranked facts, straight from <city>-facts.json
// (built by analysis/build_facts.py). A "▲ most of any city here" badge flags a
// fact this city leads the whole dataset on.
export default function CityFacts({ facts, city }) {
  if (!facts || facts.length < 3) return null;
  const top = facts.slice(0, 5);
  return (
    <section aria-label={`What stands out in ${city.shortName}`}
      className="rounded-2xl p-4 sm:p-6 mb-6"
      style={{ background: C.panel, border: `1px solid ${C.line}` }}>
      <div className="text-xs tracking-widest uppercase mb-3" style={{ color: C.muted }}>
        What stands out in {city.shortName} · ranked from the record
      </div>
      <ol className="space-y-3">
        {top.map((f, i) => (
          <li key={f.key} className="flex gap-3 items-baseline">
            <span aria-hidden="true"
              style={{ fontFamily: DISPLAY, color: C.ember, fontSize: 18, minWidth: 22, fontWeight: 650 }}>
              {i + 1}
            </span>
            <span className="text-sm sm:text-base leading-relaxed" style={{ color: C.text }}>
              {f.label}
              {f.crossCityPercentile >= 0.999 && (
                <span className="ml-2 text-xs whitespace-nowrap" style={{ color: C.gold }}>
                  ▲ most of any city here
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
