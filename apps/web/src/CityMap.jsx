import { US_MAP } from "./lib/usMap.js";
import { CITIES } from "./lib/cities.js";
import { C, DISPLAY, BODY } from "./ui.jsx";

// Per-city label placement (viewBox units) so the clustered SW labels don't
// collide. Unknown ids fall back to a label set to the right of the dot.
const LABEL = {
  phx: { dx: -10, dy: -7, anchor: "end" },
  tus: { dx: 9, dy: 16, anchor: "start" },
  lv: { dx: -10, dy: 4, anchor: "end" },
  ep: { dx: 9, dy: 5, anchor: "start" },
};
const FALLBACK = { dx: 9, dy: 5, anchor: "start" };

// The literal map for the explore landing: committed, pre-projected interior-West
// state outlines + a clickable dot per city -> its page. Pairs with the ranked
// list below it (the accessible, ordered fallback). No runtime map deps.
export default function CityMap({ onPick }) {
  const byId = new Map(CITIES.map((c) => [c.id, c]));
  const dots = Object.entries(US_MAP.cities)
    .map(([id, xy]) => ({ city: byId.get(id), xy }))
    .filter((d) => d.city);

  return (
    <figure className="mt-8 mb-2 rounded-2xl overflow-hidden"
      style={{ background: C.panel, border: `1px solid ${C.line}` }}>
      <svg
        data-testid="us-map"
        viewBox={US_MAP.viewBox}
        role="group"
        aria-label="Map of the interior West; select a city"
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        <title>Interior-West cities — select one to open its page</title>
        {US_MAP.states.map((s) => (
          <path key={s.id} d={s.d} fill={C.panel2} stroke={C.line} strokeWidth={0.6}
            strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        ))}
        {dots.map(({ city, xy: [x, y] }) => {
          const flagship = !!city.featured;
          const lab = LABEL[city.id] || FALLBACK;
          const activate = () => onPick(city.id);
          return (
            <g
              key={city.id}
              data-city={city.id}
              role="button"
              tabIndex={0}
              aria-label={`${city.name} — open page`}
              onClick={activate}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); }
              }}
              style={{ cursor: "pointer" }}
            >
              {/* generous invisible hit target */}
              <circle cx={x} cy={y} r={11} fill="transparent" />
              <circle cx={x} cy={y} r={flagship ? 5.4 : 4.4}
                fill={flagship ? C.gold : C.ember}
                stroke={C.bg} strokeWidth={1.4} />
              <text x={x + lab.dx} y={y + lab.dy} textAnchor={lab.anchor}
                style={{
                  fontFamily: DISPLAY, fontSize: 9, fontWeight: 650,
                  fill: C.text, paintOrder: "stroke",
                  stroke: C.bg, strokeWidth: 2.4, strokeLinejoin: "round",
                }}>
                {city.shortName}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="px-4 py-2 text-xs" style={{ color: C.muted, fontFamily: BODY }}>
        Each dot is a city in the arid interior West.
        <span style={{ color: C.gold }}> ★ gold</span> is the Phoenix flagship. Select a dot — or a row
        below — for that city's full record.
      </figcaption>
    </figure>
  );
}
