export const DALLAS = {
  id: "dfw",
  name: "Dallas, TX",
  shortName: "Dallas",
  climate: { key: "humid", label: "Humid South" },
  threadSid: "DFWthr 9",
  recordStart: "1899-01-01",
  stationLabel: "Dallas Area ThreadEx record (Dallas\u2013Fort Worth Intl, KDFW)",
  urbanShort: "Dallas-Fort Worth (DFW)",
  baseline: { start: 1970, end: 1979, label: "1970s" },
  windows: [
    { y: 1970, label: "Since 1970" },
    { y: 1948, label: "Since 1948" },
  ],
  latLon: [32.7767, -96.7970],
  rural: {
    sid: "USC00410984",
    name: "Bowie",
    short: "Bowie",
    kind: "rural countryside",
    firstYear: 1897,
    distance: "~72 miles NW",
    elevationNote:
      "Bowie sits ~500 ft above Dallas on the North Texas plains, so part of the absolute night-low gap is elevation \u2014 the honest signal is the gap\u2019s growth, not its size. Dallas\u2019s nights warm 1.4\u00d7 as fast as its days.",
    growthCaveat:
      "Bowie is a small ranch-country town, a genuinely rural reference; modest growth there would understate the city\u2019s excess.",
    robustnessNote:
      "Dallas\u2019s nights climb +0.8\u00b0F/decade while Bowie\u2019s are flat-to-cooling (\u22120.3) \u2014 the urban-heat-island fingerprint in a hot, humid-subtropical city. Reproduce with analysis/city_audit.py.",
  },
  citations: [
    { label: "NOAA/NWS ACIS web services", url: "https://www.rcc-acis.org/docs_webservices.html",
      note: "The official station record this page queries live in your browser." },
    { label: "NWS Fort Worth / Dallas (Weather Forecast Office, FWD)", url: "https://www.weather.gov/fwd/",
      note: "Local climate normals and records for the Dallas-Fort Worth metroplex." },
    { label: "Climate Central, \"Warm Summer Nights\" (2025)", url: "https://www.climatecentral.org/climate-matters/warm-summer-nights-2025",
      note: "Dallas\u2019s overnight lows are rising about +0.8\u00b0F/decade in the ACIS record \u2014 roughly +1.1\u00b0F/decade faster than nearby rural Bowie." },
  ],
  repoUrl: "https://github.com/poetac/phoenix_nights",
  // diurnal wired (NCEI-hourly asset builds on the next rebuild). grid deferred:
  // ERCOT is the whole Texas interconnect, not a metro utility, so it omits.
};
