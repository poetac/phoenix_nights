import { useState, useEffect } from "react";
import { CITIES } from "./lib/cities.js";
import { C, BODY } from "./ui.jsx";
import CityDashboard from "./CityDashboard.jsx";
import CityExplore from "./CityExplore.jsx";

// No ?city -> the cross-city explore landing. ?city=<id> -> that city's page
// (set by the explore list, the picker, share links, and deep links).
function initialCityId() {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search).get("city");
  return CITIES.some((c) => c.id === q) ? q : null;
}

export default function App() {
  const [id, setId] = useState(initialCityId);
  const city = id ? CITIES.find((c) => c.id === id) ?? null : null;

  function selectCity(next) {
    setId(next);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (next) url.searchParams.set("city", next);
      else url.searchParams.delete("city");
      url.hash = "";
      window.history.replaceState(null, "", url);
      window.scrollTo(0, 0);
    }
  }

  // On a fresh deep-link load to #card (with ?city set), retry the scroll until
  // the lazy chart body has mounted. Only relevant when a city is shown.
  useEffect(() => {
    if (!id) return;
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (!hash) return;
    let tries = 0;
    const timer = setInterval(() => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      if (el || ++tries > 40) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
  }, [id]);

  if (!city) return <CityExplore onPick={selectCity} />;

  return (
    <>
      <nav
        aria-label="Choose city"
        style={{
          position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)",
          zIndex: 50, display: "flex", gap: 4, padding: 4, borderRadius: 999,
          background: C.panel2, border: `1px solid ${C.line}`, fontFamily: BODY,
          boxShadow: "0 6px 20px rgba(0,0,0,.35)", maxWidth: "94vw", flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => selectCity(null)}
          aria-label="Back to all cities"
          style={{
            border: "none", cursor: "pointer", borderRadius: 999, padding: "6px 14px",
            fontSize: 14, fontWeight: 600, color: C.muted, background: "transparent",
          }}
        >
          ← Cities
        </button>
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
      <CityDashboard key={city.id} city={city} />
    </>
  );
}
