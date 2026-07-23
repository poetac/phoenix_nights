export const HOUSTON = {
  id: "hou",
  name: "Houston, TX",
  shortName: "Houston",
  climate: { key: "humid", label: "Humid South" },
  threadSid: "IAHthr 9",
  recordStart: "1889-01-01",
  stationLabel:
    "Houston Area ThreadEx record (early city record spliced to Houston Intercontinental, KIAH)",
  urbanShort: "Houston (IAH)",
  baseline: { start: 1970, end: 1979, label: "1970s" },
  windows: [
    { y: 1970, label: "Since 1970" },
    { y: 1948, label: "Since 1948" },
  ],
  latLon: [29.7604, -95.3698],
  rural: {
    sid: "USC00412266",
    name: "Danevang 1 W",
    short: "Danevang",
    kind: "rural countryside",
    firstYear: 1896,
    distance: "~78 miles SW",
    elevationNote:
      "Danevang sits on the same near-sea-level Gulf coastal plain as Houston (within ~50 ft), so this gap is essentially free of the elevation confound \u2014 a clean humid-climate control.",
    growthCaveat:
      "Danevang is a small rice-farming community, so the reference stays genuinely rural; any growth there would only understate the city\u2019s excess.",
    robustnessNote:
      "Danevang\u2019s nights are flat-to-cooling (\u22120.1\u00b0F/decade) while Houston\u2019s climb +1.0\u00b0F/decade \u2014 the urban-heat-island fingerprint, in a humid Gulf city. Reproduce with analysis/city_audit.py.",
  },
  citations: [
    {
      label: "NOAA/NWS ACIS web services",
      url: "https://www.rcc-acis.org/docs_webservices.html",
      note: "The official station record this page queries live in your browser.",
    },
    {
      label: "NWS Houston / Galveston (Weather Forecast Office, HGX)",
      url: "https://www.weather.gov/hgx/",
      note: "Local climate normals and records for the Houston metro.",
    },
    {
      label: "Climate Central, \"Warm Summer Nights\" (2025)",
      url: "https://www.climatecentral.org/climate-matters/warm-summer-nights-2025",
      note: "Gulf-coast summer nights have warmed sharply since 1970; Houston\u2019s overnight lows are rising about +1.0\u00b0F/decade in the ACIS record \u2014 roughly +1.1\u00b0F/decade faster than nearby rural Danevang.",
    },
  ],
  repoUrl: "https://github.com/poetac/phoenix_nights",
  // diurnal wired (NCEI-hourly asset builds on the next rebuild). grid deferred:
  // ERCOT is the whole Texas interconnect, not a metro utility, so it omits.
};
