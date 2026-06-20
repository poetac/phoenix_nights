import { useState, createContext, useContext } from "react";

// Active unit system for the subtree (imperial | metric), provided per-city by
// CityDashboard via <UnitsContext.Provider value={unitsOf(city)}>. Defaults to
// "imperial" so any card reading it outside a provider (or before the metric work
// lands) renders the live US product unchanged. Cards format through ../lib/units.js.
export const UnitsContext = createContext("imperial");
export const useUnits = () => useContext(UnitsContext);

export const C = {
  bg: "#141021", panel: "#1d1832", panel2: "#251e3e", line: "#2f2750",
  grid: "#2a2347", text: "#f2ecdf", muted: "#9b93ae",
  ember: "#ff6b3d", emberSoft: "#ffb15c", day: "#8fb8d8", gold: "#ffd9a0",
  sage: "#9fd8b4", rose: "#e26d6d",
};

export const DISPLAY = "'Fraunces', Georgia, 'Times New Roman', serif";
export const BODY = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";

export const axisTick = { fill: C.muted, fontSize: 11, fontFamily: BODY };

export function Card({ children, style, id }) {
  return (
    <div id={id} className="rounded-2xl p-4 sm:p-6"
      style={{ background: C.panel, border: `1px solid ${C.line}`, ...style }}>
      {children}
    </div>
  );
}

const slugify = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);

export function CardHead({ kicker, title, sub, id, shareCity, shareSlug }) {
  const anchor = id || slugify(title);
  const [copied, setCopied] = useState(false);
  const canShare = shareCity && shareSlug;
  function share() {
    const url = new URL(`share/${shareCity}-${shareSlug}.html`, document.baseURI).href;
    if (navigator.share) { navigator.share({ url, title }).catch(() => {}); return; }
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }
  return (
    <div className="mb-4">
      {kicker && <div className="text-xs tracking-widest uppercase mb-1" style={{ color: C.muted }}>{kicker}</div>}
      <h2 id={anchor} className="group text-xl sm:text-2xl" style={{ fontFamily: DISPLAY, color: C.text, fontWeight: 600, scrollMarginTop: "1rem" }}>
        {title}
        <a href={`#${anchor}`} aria-label={`Permalink to “${title}”`}
          className="ml-2 text-base opacity-0 group-hover:opacity-50 focus:opacity-100"
          style={{ color: C.muted, textDecoration: "none" }}>#</a>
        {canShare && (
          <button type="button" onClick={share} aria-label={`Share “${title}”`}
            className="ml-1 align-middle opacity-0 group-hover:opacity-70 focus:opacity-100"
            style={{ fontFamily: BODY, fontSize: 13, color: C.muted, background: "none", border: "none", cursor: "pointer" }}>
            {copied ? "✓ link copied" : "↗ share"}
          </button>
        )}
      </h2>
      {sub && <p className="text-sm mt-1 leading-relaxed" style={{ color: C.muted }}>{sub}</p>}
    </div>
  );
}

export function DarkTooltip({ active, payload, label, unit }) {
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
