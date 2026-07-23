// Third city. Las Vegas observes Pacific DST, so its hour-of-day assets are
// bucketed via the IANA tz in analysis/cities.py (the AZ cities use a fixed
// offset). McCarran/Harry Reid is the fastest-warming of the three at night.
export const LASVEGAS = {
  id: "lv",
  name: "Las Vegas, NV",
  shortName: "Las Vegas",
  threadSid: "LASthr 9",
  recordStart: "1937-01-01",
  stationLabel:
    "Las Vegas Area ThreadEx record (early downtown record spliced to Harry Reid Intl, KLAS)",
  urbanShort: "Harry Reid",
  baseline: { start: 1970, end: 1979, label: "1970s" },
  windows: [
    { y: 1970, label: "Since 1970" },
    { y: 1948, label: "Since 1948" },
  ],
  latLon: [36.084, -115.1537],
  rural: {
    sid: "USC00262243",
    name: "Desert National Wildlife Refuge",
    short: "Desert NWR",
    firstYear: 1948,
    distance: "~25 miles north",
    elevationNote:
      "Desert NWR sits ~740 ft higher than Harry Reid Intl, so part of the absolute gap is elevation — the honest signal is the gap's growth, not its size.",
    growthCaveat:
      "the Desert National Wildlife Refuge is protected open desert, so the reference stays genuinely rural — if anything that makes the city's excess warming a conservative read.",
    robustnessNote:
      "The refuge COOP record has multi-year gaps; the city-vs-desert gap and its growth are computed from the complete years and re-checked from ACIS in verify_v0.py.",
  },
  citations: [
    {
      label: "NOAA/NWS ACIS web services",
      url: "https://www.rcc-acis.org/docs_webservices.html",
      note: "The official station record this page queries live in your browser.",
    },
    {
      label: "NWS Las Vegas (Weather Forecast Office, VEF) — local climate records",
      url: "https://www.weather.gov/vef/",
      note: "Local climate normals and records for the Las Vegas / Harry Reid area.",
    },
    {
      label: "Western Regional Climate Center (DRI) — Nevada climate data",
      url: "https://wrcc.dri.edu/",
      note: "Regional station records and summaries for Nevada and the Southwest.",
    },
    {
      label: "Climate Central, \"Warm Summer Nights\" (2025)",
      url: "https://www.climatecentral.org/climate-matters/warm-summer-nights-2025",
      note: "Las Vegas summer nights have warmed ~10°F since 1970 — the 2nd-largest of 241 U.S. locations analyzed (after Reno).",
    },
  ],
  repoUrl: "https://github.com/poetac/phoenix_nights",
  // heatDeathsAsset deferred: Clark County / Southern Nevada Health District do
  // publish heat-death data, but it hasn't yet been transcribed and verified to
  // the primary-source bar in analysis/HEAT_DEATHS.md. Omitting it leaves the
  // card hidden for Las Vegas until that verification is done (a clean follow-up).
  // decennial census, Clark County, NV (US Census Bureau)
  county: "Clark County",
  metroPopulation: {
    1950: 48289, 1960: 127016, 1970: 273288, 1980: 463087,
    1990: 741459, 2000: 1375765, 2010: 1951269, 2020: 2265461,
  },
};
