import { useState } from "react";
import { CITIES } from "./lib/cities.js";
import { C, BODY } from "./ui.jsx";
import CityDashboard from "./CityDashboard.jsx";

// Thin shell over the city-agnostic dashboard: holds the selected city and, when
// more than one is registered, renders a compact segmented picker. Keying the
// dashboard on city.id gives each city a clean remount (fresh fetches + scroll).
export default function App() {
  const [id, setId] = useState(CITIES[0].id);
  const city = CITIES.find((c) => c.id === id) ?? CITIES[0];
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
                onClick={() => setId(c.id)}
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
