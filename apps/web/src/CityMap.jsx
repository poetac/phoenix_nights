import { US_MAP } from "./lib/usMap.js";
import { CITIES } from "./lib/cities.js";
import { C, DISPLAY, BODY } from "./ui.jsx";

// Per-city label placement (viewBox units) so the clustered SW labels don't
// collide. Unknown ids fall back to a label set to the right of the dot.
const LABEL = {
  phx: { dx: -11, dy: -7, anchor: "end" },
  tus: { dx: 9, dy: 16, anchor: "start" },
  lv: { dx: -10, dy: 4, anchor: "end" },
  ep: { dx: 9, dy: 5, anchor: "start" },
  yum: { dx: -10, dy: 6, anchor: "end" },
  rno: { dx: 9, dy: 4, anchor: "start" },
  abq: { dx: -10, dy: 5, anchor: "end" },
  slc: { dx: 9, dy: -7, anchor: "start" },
  boi: { dx: 9, dy: 4, anchor: "start" },
};
const FALLBACK = { dx: 9, dy: 5, anchor: "start" };

// Map a night-warming rate (°F/decade, ~0.8–2.2 across the set) to a dot radius
// and a slow→fast color ramp. Null (facts not loaded yet) → a neutral default.
const R_MIN = 3.6, R_MAX = 7.4, LO = 0.7, HI = 2.2;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
function radiusFor(nw) {
  if (nw == null) return 4.6;
  return R_MIN + clamp01((nw - LO) / (HI - LO)) * (R_MAX - R_MIN);
}

// The literal map for the explore landing: committed, pre-projected interior-West
// state outlines + a clickable dot per city -> its page. Dots are sized by how
// fast that city's summer nights are warming, so the map carries the ranking
// spatially. Pairs with the ranked list below it (the accessible fallback).
export default function CityMap({ onPick, ranked }) {
  const byId = new Map(CITIES.map((c) => [c.id, c]));
  const rate = new Map((ranked || []).map((r) => [r.city.id, r.nightWarming]));
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
        aria-label="Map of the interior West; dot size shows each city's overnight-low warming rate. Select a city."
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        <title>Interior-West cities — bigger dot = faster-warming summer nights. Select one to open its page.</title>
        {US_MAP.states.map((s) => (
          <path key={s.id} d={s.d} fill={C.panel2} stroke={C.line} strokeWidth={0.6}
            strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        ))}
        {dots.map(({ city, xy: [x, y] }) => {
          const flagship = !!city.featured;
          const nw = rate.get(city.id) ?? null;
          const r = radiusFor(nw);
          const lab = LABEL[city.id] || FALLBACK;
          const activate = () => onPick(city.id);
          const rateText = nw != null ? `, overnight lows +${nw.toFixed(1)}°F per decade` : "";
          return (
            <g
              key={city.id}
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
              {/* generous invisible hit target */}
              <circle cx={x} cy={y} r={Math.max(11, r + 6)} fill="transparent" />
              <circle cx={x} cy={y} r={r}
                fill={flagship ? C.gold : C.ember}
                fillOpacity={nw == null ? 0.85 : 0.92}
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
        Each dot is a city in the arid interior West; <strong style={{ color: C.text }}>bigger dots warm
        faster at night</strong> (overnight-low trend since 1970).
        <span style={{ color: C.gold }}> ★ gold</span> is the Phoenix flagship. Select a dot — or a row
        below — for that city's full record.
      </figcaption>
    </figure>
  );
}
