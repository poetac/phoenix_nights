// Two products, one shared engine.
//
// The cards, fetchers, map, stats, and salience engine are city-agnostic and do
// not change between products. A "product" is just a curated composition of that
// engine: which cities it includes, how its landing frames them, and its brand.
//
//   - desert  → "Desert Nights": the curated, opinionated heat-island story,
//               anchored in the arid West where the city-vs-open-desert control
//               is cleanest. Phoenix is the flagship.
//   - explorer → the platform: every city, map-first, neutral "what's changing
//                here" framing. Grows to the whole US, then worldwide. The public
//                name is still being chosen (working title: "CityTrends").
//
// The active product is chosen at BUILD time via VITE_PRODUCT (one product per
// deployed site — that's what makes them two separate projects, not two tabs); a
// `?product=` query string overrides it at runtime for preview and CI render
// tests. Default is `explorer`, so an un-flagged build is the current site.

import { CITIES } from "./lib/cities.js";

// Desert Nights' city cut: the hot low deserts only — the purest "desert nights"
// story (high summer heat + a clean open-desert control). The cooler high-desert
// metros (Reno, SLC, Boise, Albuquerque) live in City Signals only. Edit to tune.
const HOT_DESERTS = new Set(["phx", "tus", "lv", "ep", "yum"]);

export const PRODUCTS = {
  explorer: {
    id: "explorer",
    name: "City Signals",
    short: "City Signals",
    layout: "signals", // salience-driven: each city shows ONLY its top-fact cards
    tagline: "Every city's climate, in its own words.",
    // the whole registry — US (ACIS) today, worldwide (GSOY) as cities are added
    includes: () => CITIES,
    showClimateChips: true,
    kicker: "Official station records · city by city, US to worldwide",
    h1Lines: ["Every city has", "its own climate signal"],
    intro:
      "The official station record for each city, read for what stands out — overnight lows racing ahead across the US Southwest and South, the day–night gap flipping the other way on Sydney Harbour, and more. Ranked here by overnight-low warming; each city's own page surfaces whatever its record makes most distinctive.",
    caption:
      "Each city's overnight-low warming since 1970, from the official station record — NOAA ACIS across the US, NCEI GSOY worldwide — against the ~0.36 °F/decade global background rate and a nearby rural reference where one exists.",
  },
  desert: {
    id: "desert",
    name: "Desert Nights",
    short: "Desert Nights",
    layout: "curated", // the full, fixed thesis-driven stack (DashboardBody)
    tagline: "The desert still cools off at night. The city doesn't.",
    includes: () => CITIES.filter((c) => HOT_DESERTS.has(c.id)),
    flagshipId: "phx",
    showClimateChips: false, // single biome — the chips would all say "Arid West"
    kicker: "Live NOAA station record · the arid West",
    h1Lines: ["The desert still cools off at night.", "The city doesn’t."],
    intro:
      "Asphalt and concrete soak up the day's sun and release it after dark, so the desert city no longer cools the way the open desert around it still does. These are the cities where that gap is widest — each measured live against a nearby open-desert station to separate the city's own heat from the climate. Phoenix is the flagship; pick any city for its full record.",
    caption:
      "Overnight-low warming since 1970, against the ~0.36 °F/decade global background rate and a nearby open-desert control. The desert still drops into the cool at night; the city holds the day's heat — the urban-heat-island fingerprint, from the official NOAA record.",
  },
};

// Build-time default (VITE_PRODUCT) with a runtime ?product= override for preview.
export function activeProduct() {
  let id;
  if (typeof window !== "undefined") {
    id = new URLSearchParams(window.location.search).get("product");
  }
  id = id || import.meta.env.VITE_PRODUCT || "explorer";
  return PRODUCTS[id] || PRODUCTS.explorer;
}

export const citiesOf = (product) => product.includes();
