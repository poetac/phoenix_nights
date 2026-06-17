import { useState, useEffect } from "react";
import { CITIES } from "./lib/cities.js";
import { C, BODY } from "./ui.jsx";
import CityDashboard from "./CityDashboard.jsx";

// Read ?city= from the URL (set by per-card share landing pages and deep links);
// fall back to the first registered city.
function initialCityId() {
  if (typeof window === "undefined") return CITIES[0].id;
  const q = new URLSearchParams(window.location.search).get("city");
  return CITIES.some((c) => c.id === q) ? q : CITIES[0].id;
}

// Thin shell over the city-agnostic dashboard: holds the selected city and, when
// more than one is registered, renders a compact segmented picker. Keying the
// dashboard on city.id gives each city a clean remount (fresh fetches + scroll).
export default function App() {
  const [id, setId] = useState(initialCityId);
  const city = CITIES.find((c) => c.id === id) ?? CITIES[0];

  // Keep ?city= in sync so the current view is always copy-paste shareable.
  function selectCity(next) {
    setId(next);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("city", next);
      window.history.replaceState(null, "", url);
    }
  }

  // A fresh load that deep-links to a card (#anchor) arrives before the lazy
  // chart body has mounted, so the browser's native jump misses. Retry the
  // scroll for a few seconds until the heading exists, then stop.
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (!hash) return;
    let tries = 0;
    const timer = setInterval(() => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      if (el || ++tries > 40) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {CITIES.length > 1 && (
        <nav
          aria-label="Choose city"
          style={{
            position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)",
            zIndex: 50, display: "flex", gap: 4, padding: 4, borderRadius: 999,
            background: C.panel2, border: `1px solid ${C.line}`, fontFamily: BODY,
            boxShadow: "0 6px 20px rgba(0,0,0,.35)",
          }}
        >
          {CITIES.map((c) => {
            const active = c.id === id;
            return (
              <button
                key={c.id}
                onClick={() => selectCity(c.id)}
                aria-current={active ? "true" : undefined}
                style={{
                  border: "none", cursor: "pointer", borderRadius: 999,
                  padding: "6px 16px", fontSize: 14, fontWeight: 600,
                  color: active ? "#1a0d06" : C.text,
                  background: active ? C.ember : "transparent",
                }}
              >
                {c.shortName}
              </button>
            );
          })}
        </nav>
      )}
      <CityDashboard key={city.id} city={city} />
    </>
  );
}
