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

import { CITIES, climateOf } from "./lib/cities.js";

export const PRODUCTS = {
  explorer: {
    id: "explorer",
    name: "City Signals",
    short: "City Signals",
    layout: "signals", // salience-driven: each city shows ONLY its top-fact cards
    tagline: "How every city's climate is changing — in its own words.",
    // the whole registry (US today; worldwide is a future data-backend milestone)
    includes: () => CITIES,
    showClimateChips: true,
    kicker: "Live NOAA station record · arid West to humid South",
    h1Lines: ["Cities are losing", "the cool of the night"],
    intro:
      "From the desert Southwest to the humid South, US cities' overnight lows are abandoning their history faster than their afternoon highs — the urban-heat-island fingerprint, straight from the official record. Ranked by how fast each city's nights are warming; pick one for its full story.",
    caption:
      "Overnight-low warming since 1970, vs the ~0.36 °F/decade global background rate. Every city is computed from the NOAA (ACIS) record and measured against a nearby rural reference to isolate the city's own heat — from the arid West to the humid South.",
  },
  desert: {
    id: "desert",
    name: "Desert Nights",
    short: "Desert Nights",
    layout: "curated", // the full, fixed thesis-driven stack (DashboardBody)
    tagline: "The desert still cools off at night. The city doesn't.",
    // the arid West only — the cities where the open-desert control is cleanest.
    // Curation lives here: edit this predicate (or list ids) to tune the set.
    includes: () => CITIES.filter((c) => climateOf(c.id).key === "arid"),
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
