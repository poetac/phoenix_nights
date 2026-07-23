export const SALTLAKE = {
  id: "slc",
  name: "Salt Lake City, UT",
  shortName: "Salt Lake City",
  threadSid: "SLCthr 9",
  recordStart: "1893-01-01",
  stationLabel:
    "Salt Lake City Area ThreadEx record (Salt Lake City Intl, KSLC)",
  urbanShort: "SLC Intl",
  baseline: { start: 1970, end: 1979, label: "1970s" },
  windows: [
    { y: 1970, label: "Since 1970" },
    { y: 1948, label: "Since 1948" },
  ],
  latLon: [40.7608, -111.8910],
  rural: {
    sid: "USC00429133",
    name: "Vernon",
    short: "Vernon",
    firstYear: 1953,
    distance: "~60 miles SW",
    elevationNote:
      "Vernon sits ~1,200 ft above Salt Lake City, so part of the absolute gap is elevation; the honest signal is the gap's growth, not its size. Vernon is the longest slow-warming rural record within the basin's reach.",
    growthCaveat:
      "Vernon is tiny high-desert ranchland with negligible development, so it stays a genuinely rural reference.",
    robustnessNote:
      "Salt Lake's +1.05°F/decade overnight-low trend outruns Vernon's +0.15; the gap and its growth are re-checked from ACIS in verify_v0.py.",
  },
  citations: [
    {
      label: "NOAA/NWS ACIS web services",
      url: "https://www.rcc-acis.org/docs_webservices.html",
      note: "The official station record this page queries live in your browser.",
    },
    {
      label: "NWS Salt Lake City (Weather Forecast Office, SLC)",
      url: "https://www.weather.gov/slc/",
      note: "Local climate normals and records for the Salt Lake City area.",
    },
    {
      label: "Climate Central, \"Warm Summer Nights\" (2025)",
      url: "https://www.climatecentral.org/climate-matters/warm-summer-nights-2025",
      note: "Summer nights across the interior West have warmed sharply since 1970; Salt Lake City's overnight lows are rising about +1.1°F/decade in the ACIS record.",
    },
  ],
  repoUrl: "https://github.com/poetac/phoenix_nights",
  // grid asset deferred: no clean single-utility metro balancing authority
  // for this city, so the grid card omits rather than show wrong-region demand.
};
