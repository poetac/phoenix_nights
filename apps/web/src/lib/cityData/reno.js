export const RENO = {
  id: "rno",
  name: "Reno, NV",
  shortName: "Reno",
  threadSid: "RNOthr 9",
  recordStart: "1893-01-01",
  stationLabel:
    "Reno Area ThreadEx record (downtown record spliced to Reno-Tahoe Intl, KRNO)",
  urbanShort: "Reno-Tahoe Intl",
  baseline: { start: 1970, end: 1979, label: "1970s" },
  windows: [
    { y: 1970, label: "Since 1970" },
    { y: 1948, label: "Since 1948" },
  ],
  latLon: [39.4985, -119.7681],
  rural: {
    sid: "USC00048758",
    name: "Tahoe City",
    short: "Tahoe City",
    firstYear: 1909,
    distance: "~34 miles SW",
    elevationNote:
      "Tahoe City sits ~1,800 ft ABOVE Reno, so much of the absolute night-low gap is elevation, not city heat — the honest signal here is the gap's GROWTH over time, not its size. Reno's mountain basin has no low-elevation long-record rural neighbor.",
    growthCaveat:
      "Tahoe City is a small lakeshore community that has grown over the record; if anything that warms the reference, so the city's excess night warming is understated rather than inflated.",
    robustnessNote:
      "Reno's +2.16°F/decade overnight-low trend is the fastest in the set and far outruns Tahoe City's +0.27; reproduce with analysis/city_audit.py.",
  },
  citations: [
    {
      label: "NOAA/NWS ACIS web services",
      url: "https://www.rcc-acis.org/docs_webservices.html",
      note: "The official station record this page queries live in your browser.",
    },
    {
      label: "NWS Reno (Weather Forecast Office, REV)",
      url: "https://www.weather.gov/rev/",
      note: "Local climate normals and records for the Reno area.",
    },
    {
      label: "Climate Central, \"Warm Summer Nights\" (2025)",
      url: "https://www.climatecentral.org/climate-matters/warm-summer-nights-2025",
      note: "Summer nights across the interior West have warmed sharply since 1970; Reno's overnight lows are rising about +2.2°F/decade in the ACIS record.",
    },
  ],
  repoUrl: "https://github.com/poetac/phoenix_nights",
  // grid asset deferred: no clean single-utility metro balancing authority
  // for this city, so the grid card omits rather than show wrong-region demand.
};
