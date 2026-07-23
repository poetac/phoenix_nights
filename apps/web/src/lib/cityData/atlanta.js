export const ATLANTA = {
  id: "atl",
  name: "Atlanta, GA",
  shortName: "Atlanta",
  // Humid South biome (single source of truth — was the hand-kept HUMID set).
  climate: { key: "humid", label: "Humid South" },
  threadSid: "ATLthr 9",
  recordStart: "1879-01-01",
  stationLabel:
    "Atlanta Area ThreadEx record (Hartsfield\u2013Jackson Atlanta Intl, KATL)",
  urbanShort: "Hartsfield-Jackson",
  baseline: { start: 1970, end: 1979, label: "1970s" },
  windows: [
    { y: 1970, label: "Since 1970" },
    { y: 1948, label: "Since 1948" },
  ],
  latLon: [33.7490, -84.3880],
  rural: {
    sid: "USC00093621",
    name: "Gainesville",
    short: "Gainesville",
    kind: "rural countryside",
    firstYear: 1891,
    distance: "~53 miles NE",
    elevationNote:
      "Gainesville sits within ~200 ft of Atlanta's station elevation, so this gap is essentially free of the elevation confound. As the first humid-climate city, Atlanta is the proof that the overnight urban-heat-island fingerprint is not a desert-only phenomenon \u2014 it shows up just as clearly in the humid South.",
    growthCaveat:
      "Gainesville is an exurban town that has grown over the record, so the \u201crural\u201d reference is slowly developing its own modest heat island \u2014 if anything, that makes the city\u2019s excess an underestimate.",
    robustnessNote:
      "The audit\u2019s slowest-warming nearby candidate (Monticello) shows implausibly strong cooling, likely a station-siting artifact; Gainesville is the conservative, elevation-matched reference whose nights track the regional background. Reproduce with analysis/city_audit.py.",
  },
  citations: [
    {
      label: "NOAA/NWS ACIS web services",
      url: "https://www.rcc-acis.org/docs_webservices.html",
      note: "The official station record this page queries live in your browser.",
    },
    {
      label: "NWS Atlanta / Peachtree City (Weather Forecast Office, FFC)",
      url: "https://www.weather.gov/ffc/",
      note: "Local climate normals and records for the Atlanta metro.",
    },
    {
      label: "Climate Central, \"Warm Summer Nights\" (2025)",
      url: "https://www.climatecentral.org/climate-matters/warm-summer-nights-2025",
      note: "Summer nights have warmed across the US since 1970; Atlanta\u2019s overnight lows are rising about +0.9\u00b0F/decade in the ACIS record \u2014 roughly +0.6\u00b0F/decade faster than nearby rural Gainesville.",
    },
  ],
  repoUrl: "https://github.com/poetac/phoenix_nights",
  // diurnal wired (NCEI-hourly asset builds on the next rebuild). grid deferred:
  // Atlanta's BA (Southern Co.) isn't a single-utility metro authority, so the
  // grid card omits cleanly. The desert-specific cards (tropical nights, 100F-day
  // season, night-cooling) self-omit \u2014 Atlanta's nights rarely hit 80F and its
  // 1970s night-cooling baseline is non-positive.
};
