export const NEWORLEANS = {
  id: "nola",
  name: "New Orleans, LA",
  shortName: "New Orleans",
  climate: { key: "humid", label: "Humid South" },
  threadSid: "MSYthr 9",
  recordStart: "1946-01-01",
  stationLabel:
    "New Orleans Area ThreadEx record (Louis Armstrong New Orleans Intl, KMSY)",
  urbanShort: "New Orleans (MSY)",
  baseline: { start: 1970, end: 1979, label: "1970s" },
  windows: [
    { y: 1970, label: "Since 1970" },
    { y: 1948, label: "Since 1948" },
  ],
  latLon: [29.9511, -90.0715],
  rural: {
    sid: "USC00162534",
    name: "Donaldsonville 4 SW",
    short: "Donaldsonville",
    kind: "rural countryside",
    firstYear: 1893,
    distance: "~67 miles W",
    elevationNote:
      "Donaldsonville sits on the same Gulf coastal plain (~30 ft) as New Orleans, so the elevation confound is negligible. New Orleans shows the strongest lows-first ratio in the set \u2014 its overnight lows are warming ~2.4\u00d7 as fast as its afternoon highs.",
    growthCaveat:
      "Donaldsonville is small sugarcane-country ranch-and-farm land, a genuinely rural reference; modest growth there would understate the city\u2019s excess.",
    robustnessNote:
      "New Orleans\u2019 nights climb +1.1\u00b0F/decade vs Donaldsonville\u2019s +0.3 \u2014 a clean +0.8\u00b0F/decade urban excess in a humid delta city. Reproduce with analysis/city_audit.py.",
  },
  citations: [
    {
      label: "NOAA/NWS ACIS web services",
      url: "https://www.rcc-acis.org/docs_webservices.html",
      note: "The official station record this page queries live in your browser.",
    },
    {
      label: "NWS New Orleans / Baton Rouge (Weather Forecast Office, LIX)",
      url: "https://www.weather.gov/lix/",
      note: "Local climate normals and records for the New Orleans metro.",
    },
    {
      label: "Climate Central, \"Warm Summer Nights\" (2025)",
      url: "https://www.climatecentral.org/climate-matters/warm-summer-nights-2025",
      note: "New Orleans\u2019 overnight lows are rising about +1.1\u00b0F/decade in the ACIS record \u2014 the fastest lows-vs-highs ratio in this set.",
    },
  ],
  repoUrl: "https://github.com/poetac/phoenix_nights",
  // diurnal wired (NCEI-hourly asset builds on the next rebuild). grid deferred:
  // Entergy / MISO isn't a clean metro BA, so the grid card omits.
};
