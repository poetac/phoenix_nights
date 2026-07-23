// Second international city (Worldwide Phase B). De Bilt is the Netherlands' national
// reference station (KNMI), the European / Northern-Hemisphere counterpart to Sydney —
// same `source:"ghcn"` path (NCEI GSOY, metric, a precomputed yearly series, no daily/
// hourly cards). Unlike Sydney it has no clean rural pair (De Bilt is itself the
// semi-rural national record), so it carries no `rural` block — UhiCard/GlobalContext
// self-omit. Its signal runs maritime like Sydney's (days outpace nights, the gap
// widens), and its most distinctive fact is the floor lifting: the coldest night of
// the year warms fastest. Numbers below come straight from dbt-facts.json.
export const DEBILT = {
  id: "dbt",
  name: "De Bilt, NL",
  shortName: "De Bilt",
  source: "ghcn",
  units: "metric",
  recordStart: "1948-01-01",
  stationLabel: "De Bilt (GHCN-Daily NLM00006260, KNMI national station, via NCEI GSOY; annual record 1948–2025)",
  urbanShort: "De Bilt",
  // Oceanic / maritime-temperate (Köppen Cfb) — its own climate, distinct from the
  // US two-biome split and from Sydney's southern temperate coast.
  climate: { key: "temperate", label: "Maritime temperate" },
  // City Signals surfaces each city's distinctive signal (Principle 3 — state it in the
  // card). De Bilt's runs maritime like Sydney's — the sea moderates the nights, so days
  // warm faster and the gap widens — but for a GHCN city the coldest-night signal has no
  // dedicated card (extremes need daily data GSOY lacks), so its standout lives here.
  caveat:
    "De Bilt's record runs maritime, much like Sydney's: the North Sea tempers its " +
    "overnight lows, so its days warm faster than its nights and the day–night gap is " +
    "widening (+0.12 °C/decade) — the opposite of the inland heat-island fingerprint. " +
    "What stands out most is the floor: the coldest night of the year is climbing " +
    "+0.79 °C/decade, more than double the pace of an ordinary night (+0.33), as the " +
    "Netherlands' hardest frosts soften.",
  baseline: { start: 1970, end: 1979, label: "1970s" },
  windows: [{ y: 1970, label: "Since 1970" }],
  latLon: [52.10, 5.18],
  citations: [
    { label: "NCEI Global Summary of the Year (GSOY) — GHCN-Daily station NLM00006260",
      url: "https://www.ncei.noaa.gov/access/search/data-search/global-summary-of-the-year",
      note: "The annual overnight-low / daytime-high series this page reproduces (rendered in °C)." },
    { label: "KNMI — De Bilt (the Netherlands' national reference station) climate data",
      url: "https://www.knmi.nl/nederland-nu/klimatologie/daggegevens",
      note: "The Netherlands' official meteorological record for the station." },
  ],
  repoUrl: "https://github.com/poetac/phoenix_nights",
};
