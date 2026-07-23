export const YUMA = {
  id: "yum",
  name: "Yuma, AZ",
  shortName: "Yuma",
  threadSid: "YUMthr 9",
  recordStart: "1893-01-01",
  stationLabel:
    "Yuma Area ThreadEx record (Yuma MCAS / Yuma Intl)",
  urbanShort: "Yuma Intl",
  baseline: { start: 1970, end: 1979, label: "1970s" },
  windows: [
    { y: 1970, label: "Since 1970" },
    { y: 1948, label: "Since 1948" },
  ],
  latLon: [32.6927, -114.6277],
  rural: {
    sid: "USW00003125",
    name: "Yuma Proving Ground",
    short: "Yuma Proving Ground",
    firstYear: 1955,
    distance: "~19 miles NE",
    elevationNote:
      "Yuma Proving Ground sits within ~110 ft of the Yuma stations' elevation, so this gap is essentially free of the elevation confound — a clean low-desert control like El Paso's White Sands.",
    growthCaveat:
      "The Proving Ground is sparsely developed federal desert, so the reference stays genuinely rural; the city-vs-desert read is like-for-like.",
    robustnessNote:
      "The COOP record runs from 1955; the gap and its growth are computed from complete years and re-checked from ACIS in verify_v0.py.",
  },
  citations: [
    {
      label: "NOAA/NWS ACIS web services",
      url: "https://www.rcc-acis.org/docs_webservices.html",
      note: "The official station record this page queries live in your browser.",
    },
    {
      label: "NWS Phoenix (Weather Forecast Office, PSR) — serves Yuma County",
      url: "https://www.weather.gov/psr/",
      note: "Local climate normals and records for the Yuma area.",
    },
    {
      label: "Climate Central, \"Warm Summer Nights\" (2025)",
      url: "https://www.climatecentral.org/climate-matters/warm-summer-nights-2025",
      note: "Summer nights across the interior West have warmed sharply since 1970; Yuma's overnight lows are rising about +0.8°F/decade in the ACIS record.",
    },
  ],
  repoUrl: "https://github.com/poetac/phoenix_nights",
  // grid asset deferred: no clean single-utility metro balancing authority
  // for this city, so the grid card omits rather than show wrong-region demand.
};
