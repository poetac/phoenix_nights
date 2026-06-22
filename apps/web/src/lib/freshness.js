import { lastCompleteYear } from "./data.js";

// The newest year a precomputed asset covers — prefer the build-time stamp,
// fall back to deriving it from the data shape (so it works before a rebuild
// has populated `throughYear`).
export function assetThroughYear(asset) {
  if (!asset) return null;
  if (typeof asset.throughYear === "number") return asset.throughYear;
  if (Array.isArray(asset.years) && asset.years.length) return Math.max(...asset.years.map((r) => r.year));
  if (asset.years && typeof asset.years === "object") {
    // Guard the empty container: Math.max(...[]) is -Infinity, which downstream reads
    // as "behind the target year" and would raise a false staleness banner.
    const ys = Object.keys(asset.years).map(Number).filter(Number.isFinite);
    if (ys.length) return Math.max(...ys);
  }
  if (Array.isArray(asset.series) && asset.series.length) return Math.max(...asset.series.map((r) => r.year));
  if (Array.isArray(asset.yearsCovered)) return asset.yearsCovered[1];
  return null; // e.g. the 1970s normals baseline — not a moving time series
}

const NAMES = {
  diurnal: "hourly curves", heatSeason: "100°F season", streaks: "night streaks",
  grid: "grid demand", cddSplit: "cooling split", heatDeaths: "heat deaths",
  series: "yearly series",
};

// Freshness of the *committed* (precomputed) assets. The live ACIS cards are
// always current; only these static datasets can age between scheduled rebuilds,
// so this is what surfaces a "data through YYYY" line and a staleness banner.
export function assetFreshness(assets) {
  const entries = Object.entries(assets)
    .map(([key, a]) => ({ key, name: NAMES[key] || key, year: assetThroughYear(a), generated: a?.generated || null }))
    .filter((e) => e.year != null);
  if (!entries.length) return null;
  const target = lastCompleteYear();
  return {
    through: Math.max(...entries.map((e) => e.year)),
    target,
    stale: entries.filter((e) => e.year < target),
    generated: entries.map((e) => e.generated).filter(Boolean).sort().slice(-1)[0] || null,
  };
}
