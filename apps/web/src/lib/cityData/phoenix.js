export const PHOENIX = {
  id: "phx",
  name: "Phoenix, AZ",
  shortName: "Phoenix",
  threadSid: "PHXthr 9",
  recordStart: "1896-01-01",
  stationLabel:
    "Phoenix ThreadEx station record (downtown 1896–1933, Sky Harbor 1933–present)",
  urbanShort: "Sky Harbor",
  // Curated flagship overlay: Phoenix keeps its hand-written hero; other cities
  // get an auto hero built from their top-ranked fact (see CityDashboard).
  featured: {
    line1: "The desert still cools off at night.",
    line2: "The city doesn\u2019t.",
    sub: "Weather apps grade each day against a \"normal range\" and spotlight the afternoon high. This page tests a different question with the official record: are Phoenix\u2019s overnight lows abandoning their history faster than its highs?",
  },
  baseline: { start: 1970, end: 1979, label: "1970s" },
  // window choices offered in the UI; the full record is appended dynamically
  windows: [
    { y: 1970, label: "Since 1970" },
    { y: 1948, label: "Since 1948" },
  ],
  latLon: [33.4278, -112.0037],
  rural: {
    sid: "USC00021314",
    name: "Casa Grande National Monument",
    short: "Casa Grande NM",
    firstYear: 1948,
    distance: "~45 miles",
    elevationNote:
      "The monument station sits ~300 ft higher than Sky Harbor, so part of the absolute gap is elevation — the honest signal is the gap's growth, not its size.",
    growthCaveat:
      "the Casa Grande–Maricopa corridor has been booming, so the \"rural\" reference is slowly growing its own heat island. If anything, that makes the city share above an underestimate.",
    robustnessNote:
      "Robustness: swapping the desert reference for Wickenburg (record through 2014) or Sacaton (through 2011) raises the city share to 62–67% — this card shows the most conservative of the three. Reproduce with analysis/uhi_robustness.py.",
  },
  citations: [
    {
      label: "Brazel et al., \"The tale of two climates — Baseline and urban heat island analyses of the Phoenix region\"",
      url: "https://www.researchgate.net/publication/226592731",
      note: "Urbanization raised Sky Harbor nighttime minimums ~9°F — far more than daily averages.",
    },
    {
      label: "Climate Central via NPR (2023): Phoenix summer nights warmed ~6°F since 1970",
      url: "https://www.npr.org/2023/07/14/1187646149/",
      note: "The seasonal card reproduces this figure from the raw station record.",
    },
    {
      label: "ASU Arizona Climate: the Phoenix urban heat island",
      url: "https://globalfutures.asu.edu/azclimate/urban-heat-island/",
      note: "Documents the 10–14°F urban-rural temperature gap this page measures live.",
    },
    {
      label: "Maricopa County heat surveillance reports",
      url: "https://www.maricopa.gov/1858/Heat-Surveillance",
      note: "Source of the confirmed heat-death counts in the human-cost card.",
    },
    {
      label: "NOAA/NWS ACIS web services",
      url: "https://www.rcc-acis.org/docs_webservices.html",
      note: "The official station record this page queries live in your browser.",
    },
    {
      label: "US EIA Hourly Electric Grid Monitor",
      url: "https://www.eia.gov/electricity/gridmonitor/",
      note: "Source of the hourly demand curves in the grid card.",
    },
  ],
  repoUrl: "https://github.com/poetac/phoenix_nights",
  // asset paths (diurnal + grid + heat-deaths + the base four) are derived from
  // `id` by withAssets() at the CITIES array below.
  // decennial census, Maricopa County (US Census Bureau)
  county: "Maricopa County",
  metroPopulation: {
    1950: 331770, 1960: 663510, 1970: 971228, 1980: 1509175,
    1990: 2122101, 2000: 3072149, 2010: 3817117, 2020: 4420568,
  },
};
