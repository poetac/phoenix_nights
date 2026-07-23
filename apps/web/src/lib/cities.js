// City registry orchestrator — the per-city data itself lives one file per city under
// ./cityData/ (each a byte-for-byte relocation, this file unchanged in shape); this file
// only assembles them plus the shared derivation logic (climateOf/withAssets/CITIES).
import { PHOENIX } from "./cityData/phoenix.js";
import { TUCSON } from "./cityData/tucson.js";
import { LASVEGAS } from "./cityData/lasVegas.js";
import { ELPASO } from "./cityData/elPaso.js";
import { SYDNEY } from "./cityData/sydney.js";
import { DEBILT } from "./cityData/deBilt.js";
import { YUMA } from "./cityData/yuma.js";
import { RENO } from "./cityData/reno.js";
import { ALBUQUERQUE } from "./cityData/albuquerque.js";
import { SALTLAKE } from "./cityData/saltLake.js";
import { BOISE } from "./cityData/boise.js";
import { ATLANTA } from "./cityData/atlanta.js";
import { HOUSTON } from "./cityData/houston.js";
import { NEWORLEANS } from "./cityData/newOrleans.js";
import { RALEIGH } from "./cityData/raleigh.js";
import { DALLAS } from "./cityData/dallas.js";

// Re-exported for API-surface parity with the pre-split cities.js (nothing in
// apps/web/src currently imports these by name — grep-confirmed — but this
// keeps the module's public surface unchanged rather than silently shrinking it).
export { PHOENIX, TUCSON, LASVEGAS, ELPASO, SYDNEY, DEBILT };

// Climate chip for the ranked list. Fully data-driven: every city carries its own
// `climate` ({key,label}) — the South/Gulf additions declare "Humid South", the
// international cities their own (temperate), and the arid/interior-West cities omit
// it and fall back here. One source of truth per city (no separate biome set to keep
// in sync — that hand-kept HUMID set was a drift point, the kind the registry-parity
// check guards against).
export const climateOf = (id) => {
  const c = CITIES.find((x) => x.id === id);
  return c?.climate ?? { key: "arid", label: "Arid West" };
};

// Precomputed-asset paths all follow one rule: data/<id>-<asset>.json, built by
// the matching analysis/build_*.py pipeline. Rather than spell out ~7 identical
// lines on every city, each city declares which assets it actually has and the
// paths are derived from its id here. Omitting an asset is how a city opts out of
// that card — the fetcher returns null and the card self-hides (e.g. humid cities
// carry no grid asset, since none has a clean single-utility metro BA; only
// Phoenix carries heat-deaths).
//   base four (every city, ACIS-derived): heat-season · streaks · normals · cdd-split
//   opt-in: "diurnal" (NCEI hourly) · "grid" (EIA-930) · "heatDeaths" (hand-curated)
const ASSET_FILE = {
  diurnal: "diurnal", heatSeason: "heat-season", heatDeaths: "heat-deaths",
  streaks: "streaks", grid: "grid", normals: "normals", cddSplit: "cdd-split",
  series: "series",
};
const BASE_ASSETS = ["heatSeason", "streaks", "normals", "cddSplit"];
function withAssets(city, optIn = []) {
  const out = { ...city };
  // The base four are ACIS-derived (daily reduces); an international (source:"ghcn")
  // city has none of them — it carries only its precomputed GSOY `series` (+ facts).
  const base = city.source === "ghcn" ? [] : BASE_ASSETS;
  for (const a of [...base, ...optIn]) out[`${a}Asset`] = `data/${city.id}-${ASSET_FILE[a]}.json`;
  return out;
}

export const CITIES = [
  withAssets(PHOENIX, ["diurnal", "grid", "heatDeaths"]),
  withAssets(TUCSON, ["diurnal", "grid"]),
  withAssets(LASVEGAS, ["diurnal", "grid"]),
  withAssets(ELPASO, ["diurnal", "grid"]),
  withAssets(YUMA, ["diurnal"]),
  withAssets(RENO, ["diurnal"]),
  withAssets(ALBUQUERQUE, ["diurnal", "grid"]),
  withAssets(SALTLAKE, ["diurnal"]),
  withAssets(BOISE, ["diurnal", "grid"]),
  withAssets(ATLANTA, ["diurnal"]),
  withAssets(HOUSTON, ["diurnal"]),
  withAssets(NEWORLEANS, ["diurnal"]),
  withAssets(RALEIGH, ["diurnal"]),
  withAssets(DALLAS, ["diurnal"]),
  withAssets(SYDNEY, ["series"]),  // first international city (GHCN/GSOY, metric)
  withAssets(DEBILT, ["series"]),  // second international city (Europe / N hemisphere)
];
