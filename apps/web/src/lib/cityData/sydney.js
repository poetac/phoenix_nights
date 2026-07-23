// First international city (Worldwide Phase B). ACIS is US-only, so Sydney is
// `source: "ghcn"` — it loads a precomputed yearly series (NCEI GSOY, built by
// analysis/build_series.py) instead of querying ACIS live, and renders in metric
// (`units: "metric"`). GSOY is annual, so the yearly-trend cards light up (trend,
// extrapolation, day-night gap, the facts list in °C) and the daily/hourly cards
// (streaks, heat-season, diurnal, grid) carry no asset and self-hide. It appears in
// the city switcher / deep-link; the US explore map + ranked list are keyed off
// US-only data, so Sydney doesn't pollute them.
export const SYDNEY = {
  id: "syd",
  name: "Sydney, AU",
  shortName: "Sydney",
  source: "ghcn",
  units: "metric",
  recordStart: "1970-01-01",
  stationLabel: "Sydney Observatory Hill (GHCN-Daily ASN00066062, via NCEI GSOY; annual record 1948–2019)",
  urbanShort: "Observatory Hill",
  // Oceanic/temperate — its own climate, not the US two-biome split.
  climate: { key: "temperate", label: "Temperate coast" },
  // City Signals surfaces each city's distinctive signal (Principle 3 — state it in
  // the card). Sydney's runs opposite the inland cities: the harbour moderates its
  // nights, so its days warm faster and the day–night gap widens. Not an exception to
  // apologize for — it's exactly what a per-city-signal viewer is for.
  caveat:
    "Sydney's signal runs the other way from the inland cities: at harbour-side " +
    "Observatory Hill the sea moderates the overnight lows, so the days warm faster " +
    "than the nights (+0.30 vs +0.19 °C/decade) and the day–night gap widens. That's " +
    "the engine doing its job — surfacing whatever each city's record makes most distinctive.",
  baseline: { start: 1970, end: 1979, label: "1970s" },
  windows: [{ y: 1970, label: "Since 1970" }],
  latLon: [-33.8607, 151.205],
  rural: {
    sid: "ASN00063005",
    name: "Bathurst Agricultural Station",
    short: "Bathurst",
    firstYear: 1970,
    distance: "~160 km west",
    kind: "rural tablelands",
    elevationNote:
      "Bathurst sits ~670 m higher than Observatory Hill, so part of the absolute night-low gap is elevation — the honest signal is the gap's growth, not its size.",
  },
  citations: [
    { label: "NCEI Global Summary of the Year (GSOY) — GHCN-Daily station ASN00066062",
      url: "https://www.ncei.noaa.gov/access/search/data-search/global-summary-of-the-year",
      note: "The annual overnight-low / daytime-high series this page reproduces (rendered in °C)." },
    { label: "Bureau of Meteorology — Sydney (Observatory Hill) climate data",
      url: "http://www.bom.gov.au/climate/data/",
      note: "Australia's official record for the station." },
  ],
  repoUrl: "https://github.com/poetac/phoenix_nights",
};
