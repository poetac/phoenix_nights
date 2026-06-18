import { useState, useEffect, useRef } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);
  const city = id ? CITIES.find((c) => c.id === id) ?? null : null;

  function selectCity(next) {
    setId(next);
    setMenuOpen(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (next) url.searchParams.set("city", next);
      else url.searchParams.delete("city");
      url.hash = "";
      window.history.replaceState(null, "", url);
      window.scrollTo(0, 0);
    }
  }

  // Close the city menu on an outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => { if (navRef.current && !navRef.current.contains(e.target)) setMenuOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [menuOpen]);

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

  const pill = {
    border: "none", cursor: "pointer", borderRadius: 999,
    padding: "6px 14px", fontSize: 14, fontWeight: 600, fontFamily: BODY,
  };

  return (
    <>
      {/* Compact, collapsible city switcher. A wrapping pill bar didn't scale
          past a handful of cities (it spilled into a multi-row block over the
          page); this stays one row and opens a scrollable menu on demand. */}
      <nav
        ref={navRef}
        aria-label="Choose city"
        style={{
          position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)",
          zIndex: 50, display: "flex", alignItems: "center", gap: 6, fontFamily: BODY,
          maxWidth: "94vw",
        }}
      >
        <button
          onClick={() => selectCity(null)}
          aria-label="Back to all cities"
          style={{
            ...pill, color: C.muted, background: C.panel2,
            border: `1px solid ${C.line}`, boxShadow: "0 6px 20px rgba(0,0,0,.35)",
          }}
        >
          ← Cities
        </button>

        <div style={{ position: "relative" }}>
          <button
            data-testid="city-switcher"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
            style={{
              ...pill, color: "#1a0d06", background: C.ember, border: "none",
              boxShadow: "0 6px 20px rgba(0,0,0,.35)", display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <span>{city.shortName}</span>
            <span aria-hidden="true" style={{ opacity: 0.75, transform: menuOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}>▾</span>
          </button>

          {menuOpen && (
            <ul
              role="listbox"
              aria-label="Cities"
              style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0, margin: 0, padding: 6,
                listStyle: "none", background: C.panel2, border: `1px solid ${C.line}`,
                borderRadius: 14, boxShadow: "0 12px 34px rgba(0,0,0,.5)",
                minWidth: 190, maxHeight: "min(62vh, 460px)", overflowY: "auto", zIndex: 60,
              }}
            >
              {CITIES.map((c) => {
                const active = c.id === id;
                return (
                  <li key={c.id}>
                    <button
                      role="option"
                      aria-current={active ? "true" : undefined}
                      onClick={() => selectCity(c.id)}
                      style={{
                        display: "block", width: "100%", textAlign: "left", border: "none",
                        cursor: "pointer", borderRadius: 9, padding: "8px 12px", fontSize: 14,
                        fontFamily: BODY, fontWeight: active ? 700 : 500,
                        color: active ? C.ember : C.text,
                        background: active ? "rgba(255,107,61,.12)" : "transparent",
                      }}
                    >
                      {c.shortName}
                      {c.featured && <span style={{ color: C.gold }}> ★</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </nav>
      <CityDashboard key={city.id} city={city} />
    </>
  );
}
