// Fourth city. El Paso has the cleanest control of the set: its open-desert pair
// (White Sands) sits at nearly the same elevation, so the city-vs-desert night
// gap is largely free of the elevation confound the other pairs carry.
export const ELPASO = {
  id: "ep",
  name: "El Paso, TX",
  shortName: "El Paso",
  threadSid: "ELPthr 9",
  recordStart: "1887-01-01",
  stationLabel:
    "El Paso Area ThreadEx record (early downtown record spliced to El Paso Intl, KELP)",
  urbanShort: "El Paso Intl",
  baseline: { start: 1970, end: 1979, label: "1970s" },
  windows: [
    { y: 1970, label: "Since 1970" },
    { y: 1948, label: "Since 1948" },
  ],
  latLon: [31.8111, -106.3758],
  rural: {
    sid: "USC00299686",
    name: "White Sands National Monument",
    short: "White Sands",
    firstYear: 1948,
    distance: "~70 miles north",
    elevationNote:
      "White Sands sits at nearly the same elevation as El Paso Intl (~90 ft difference), so unlike the other cities' pairs this gap is essentially free of the elevation confound — the cleanest control in the set.",
    growthCaveat:
      "White Sands is protected open desert (a national park unit), so the reference stays genuinely rural; the city-vs-desert gap is a like-for-like read.",
    robustnessNote:
      "The monument's COOP record has occasional gaps; the city-vs-desert gap and its growth are computed from the complete years and re-checked from ACIS in verify_v0.py.",
  },
  citations: [
    {
      label: "NOAA/NWS ACIS web services",
      url: "https://www.rcc-acis.org/docs_webservices.html",
      note: "The official station record this page queries live in your browser.",
    },
    {
      label: "NWS El Paso (Weather Forecast Office, EPZ) — local climate records",
      url: "https://www.weather.gov/epz/",
      note: "Local climate normals and records for the El Paso / Santa Teresa area.",
    },
    {
      label: "Climate Central, \"Warm Summer Nights\" (2025)",
      url: "https://www.climatecentral.org/climate-matters/warm-summer-nights-2025",
      note: "Summer nights across the Southwest have warmed ~4.5°F on average since 1970; El Paso's overnight lows are rising about +1.5°F/decade in the ACIS record.",
    },
  ],
  repoUrl: "https://github.com/poetac/phoenix_nights",
  // heatDeathsAsset deferred: not yet transcribed/verified to the HEAT_DEATHS.md
  // primary-source bar; the card cleanly omits until then.
  // decennial census, El Paso County, TX (US Census Bureau)
  county: "El Paso County",
  metroPopulation: {
    1950: 194968, 1960: 314070, 1970: 359291, 1980: 479899,
    1990: 591610, 2000: 679622, 2010: 800647, 2020: 865657,
  },
};
