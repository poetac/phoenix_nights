export const BOISE = {
  id: "boi",
  name: "Boise, ID",
  shortName: "Boise",
  threadSid: "BOIthr 9",
  recordStart: "1893-01-01",
  stationLabel:
    "Boise Area ThreadEx record (Boise Air Terminal, KBOI)",
  urbanShort: "Boise Air Terminal",
  baseline: { start: 1970, end: 1979, label: "1970s" },
  windows: [
    { y: 1970, label: "Since 1970" },
    { y: 1948, label: "Since 1948" },
  ],
  latLon: [43.6150, -116.2023],
  rural: {
    sid: "USC00102942",
    name: "Emmett 2 E",
    short: "Emmett",
    firstYear: 1906,
    distance: "~25 miles NW",
    elevationNote:
      "Emmett sits ~300 ft below Boise, so the elevation confound is small and runs toward the city being cooler at baseline — the city's faster night warming is not an elevation artifact.",
    growthCaveat:
      "Emmett is a small agricultural town; any modest growth there would understate the city's excess warming.",
    robustnessNote:
      "Boise's +0.94°F/decade overnight-low trend outruns Emmett's +0.33; reproduce with analysis/city_audit.py.",
  },
  citations: [
    {
      label: "NOAA/NWS ACIS web services",
      url: "https://www.rcc-acis.org/docs_webservices.html",
      note: "The official station record this page queries live in your browser.",
    },
    {
      label: "NWS Boise (Weather Forecast Office, BOI)",
      url: "https://www.weather.gov/boi/",
      note: "Local climate normals and records for the Boise area.",
    },
    {
      label: "Climate Central, \"Warm Summer Nights\" (2025)",
      url: "https://www.climatecentral.org/climate-matters/warm-summer-nights-2025",
      note: "Summer nights across the interior West have warmed sharply since 1970; Boise's overnight lows are rising about +0.9°F/decade in the ACIS record.",
    },
  ],
  repoUrl: "https://github.com/poetac/phoenix_nights",
  // grid card uses IPCO (Idaho Power), the Boise metro's balancing authority.
};
