export const RALEIGH = {
  id: "rdu",
  name: "Raleigh, NC",
  shortName: "Raleigh",
  climate: { key: "humid", label: "Humid South" },
  threadSid: "RDUthr 9",
  recordStart: "1888-01-01",
  stationLabel: "Raleigh Area ThreadEx record (Raleigh\u2013Durham Intl, KRDU)",
  urbanShort: "Raleigh-Durham (RDU)",
  baseline: { start: 1970, end: 1979, label: "1970s" },
  windows: [
    { y: 1970, label: "Since 1970" },
    { y: 1948, label: "Since 1948" },
  ],
  latLon: [35.7796, -78.6382],
  rural: {
    sid: "USC00311820",
    name: "Clayton WTP",
    short: "Clayton",
    kind: "rural countryside",
    firstYear: 1955,
    distance: "~28 miles SE",
    elevationNote:
      "Clayton sits within ~15 ft of Raleigh's station elevation and just ~28 miles away \u2014 one of the cleanest, closest rural controls in the set. The humid Southeast shows the same overnight urban-heat-island fingerprint as the desert.",
    growthCaveat:
      "Clayton is a small town on Raleigh's exurban edge; any growth there would only understate the city\u2019s excess.",
    robustnessNote:
      "Raleigh\u2019s nights climb +0.9\u00b0F/decade vs Clayton\u2019s +0.2 \u2014 a clean urban excess in the humid Piedmont. Reproduce with analysis/city_audit.py.",
  },
  citations: [
    { label: "NOAA/NWS ACIS web services", url: "https://www.rcc-acis.org/docs_webservices.html",
      note: "The official station record this page queries live in your browser." },
    { label: "NWS Raleigh (Weather Forecast Office, RAH)", url: "https://www.weather.gov/rah/",
      note: "Local climate normals and records for the Raleigh / Triangle area." },
    { label: "Climate Central, \"Warm Summer Nights\" (2025)", url: "https://www.climatecentral.org/climate-matters/warm-summer-nights-2025",
      note: "Raleigh\u2019s overnight lows are rising about +0.9\u00b0F/decade in the ACIS record \u2014 roughly +0.7\u00b0F/decade faster than nearby rural Clayton." },
  ],
  repoUrl: "https://github.com/poetac/phoenix_nights",
  // diurnal wired (NCEI-hourly asset builds on the next rebuild). grid deferred.
  // Raleigh's desert-specific cards self-omit (mild, humid \u2014 few 80F nights, few
  // 100F days, non-positive 1970s night-cooling).
};
