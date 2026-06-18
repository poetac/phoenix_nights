import { US_MAP } from "./lib/usMap.js";
import { CITIES } from "./lib/cities.js";
import { C, DISPLAY, BODY } from "./ui.jsx";

// Map a night-warming rate (°F/decade, ~0.8–2.2) to a 0..1 ramp position.
const LO = 0.7, HI = 2.2;
const clamp01 = (t) => Math.max(0, Math.min(1, t));

// The literal map for the explore landing: committed, pre-projected US state
// outlines + a clickable dot per city. Dots are sized by how fast that city's
// summer nights are warming, so the map carries the ranking spatially; the city
// name reveals on hover/focus (the engine now spans the arid West and the humid
// South, so the dots are spread across the country and always-on labels would
// collide). Pairs with the ranked list + comparison below. No runtime map deps.
export default function CityMap({ onPick, ranked }) {
  const byId = new Map(CITIES.map((c) => [c.id, c]));
  const rate = new Map((ranked || []).map((r) => [r.city.id, r.nightWarming]));
  const dots = Object.entries(US_MAP.cities)
    .map(([id, xy]) => ({ city: byId.get(id), xy }))
    .filter((d) => d.city);

  // Scale dot/label sizes to the viewBox so they render at a consistent on-screen
  // size whatever the map's geographic extent (regional SW vs national).
  const vbW = parseFloat(US_MAP.viewBox.split(" ")[2]) || 290;
  const k = vbW / 290;
  const radius = (nw) => (nw == null ? 4.6 : 3.6 + clamp01((nw - LO) / (HI - LO)) * 3.8) * k;

  return (
    <figure className="mt-8 mb-2 rounded-2xl overflow-hidden"
      style={{ background: C.panel, border: `1px solid ${C.line}` }}>
      <svg
        data-testid="us-map"
        viewBox={US_MAP.viewBox}
        role="group"
        aria-label="Map of the United States; dot size shows each city's overnight-low warming rate. Select a city."
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        <title>US cities — bigger dot = faster-warming summer nights. Select one to open its page.</title>
        {US_MAP.states.map((s) => (
          <path key={s.id} d={s.d} fill={C.panel2} stroke={C.line} strokeWidth={0.6 * k}
            strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        ))}
        {dots.map(({ city, xy: [x, y] }) => {
          const flagship = !!city.featured;
          const nw = rate.get(city.id) ?? null;
          const r = radius(nw) * (flagship ? 1.12 : 1);
          const activate = () => onPick(city.id);
          const rateText = nw != null ? `, overnight lows +${nw.toFixed(1)}°F per decade` : "";
          return (
            <g
              key={city.id}
              className="group"
              data-city={city.id}
              data-rate={nw != null ? nw.toFixed(2) : ""}
              role="button"
              tabIndex={0}
              aria-label={`${city.name}${rateText} — open page`}
              onClick={activate}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); }
              }}
              style={{ cursor: "pointer" }}
            >
              <title>{`${city.name}${rateText}`}</title>
              <circle cx={x} cy={y} r={Math.max(11, r + 6)} fill="transparent" />
              <circle cx={x} cy={y} r={r}
                fill={flagship ? C.gold : C.ember}
                fillOpacity={nw == null ? 0.85 : 0.92}
                stroke={C.bg} strokeWidth={1.4 * k}
                className="transition-all group-hover:brightness-110" />
              <text x={x + 7 * k} y={y - 6 * k} textAnchor="start"
                className="opacity-0 group-hover:opacity-100 group-focus:opacity-100 pointer-events-none transition-opacity"
                style={{
                  fontFamily: DISPLAY, fontSize: 11 * k, fontWeight: 650,
                  fill: C.text, paintOrder: "stroke",
                  stroke: C.bg, strokeWidth: 3 * k, strokeLinejoin: "round",
                }}>
                {city.shortName}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="px-4 py-2 text-xs" style={{ color: C.muted, fontFamily: BODY }}>
        Each dot is a US city; <strong style={{ color: C.text }}>bigger dots warm faster at night</strong>
        {" "}(overnight-low trend since 1970). <span style={{ color: C.gold }}>★ gold</span> is the Phoenix
        flagship. Hover or focus a dot for its name; select it — or a row below — for the full record.
      </figcaption>
    </figure>
  );
}
