export const ALBUQUERQUE = {
  id: "abq",
  name: "Albuquerque, NM",
  shortName: "Albuquerque",
  threadSid: "ABQthr 9",
  recordStart: "1893-01-01",
  stationLabel:
    "Albuquerque Area ThreadEx record (Albuquerque Intl Sunport, KABQ)",
  urbanShort: "Sunport",
  baseline: { start: 1970, end: 1979, label: "1970s" },
  windows: [
    { y: 1970, label: "Since 1970" },
    { y: 1948, label: "Since 1948" },
  ],
  latLon: [35.0844, -106.6504],
  rural: {
    sid: "USC00295150",
    name: "Los Lunas 3 SSW",
    short: "Los Lunas",
    firstYear: 1923,
    distance: "~25 miles S",
    elevationNote:
      "Los Lunas sits ~500 ft BELOW the Sunport, so the elevation confound runs the other way — the city is higher yet its nights warm faster, which strengthens rather than inflates the urban signal.",
    growthCaveat:
      "Los Lunas has suburbanized along the Rio Grande; a warming reference understates the city's excess, not the reverse.",
    robustnessNote:
      "Swapping in higher, slower Santa Fe widens the gap; this card uses the closer, lower Los Lunas as the more conservative control. Reproduce with analysis/city_audit.py.",
  },
  citations: [
    {
      label: "NOAA/NWS ACIS web services",
      url: "https://www.rcc-acis.org/docs_webservices.html",
      note: "The official station record this page queries live in your browser.",
    },
    {
      label: "NWS Albuquerque (Weather Forecast Office, ABQ)",
      url: "https://www.weather.gov/abq/",
      note: "Local climate normals and records for the Albuquerque area.",
    },
    {
      label: "Climate Central, \"Warm Summer Nights\" (2025)",
      url: "https://www.climatecentral.org/climate-matters/warm-summer-nights-2025",
      note: "Summer nights across the interior West have warmed sharply since 1970; Albuquerque's overnight lows are rising about +1.1°F/decade in the ACIS record.",
    },
  ],
  repoUrl: "https://github.com/poetac/phoenix_nights",
  // grid card uses PNM, the Albuquerque metro's single balancing authority.
};
