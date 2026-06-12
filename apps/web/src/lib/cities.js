// Per-city configuration — everything the dashboard and fetchers need to
// render one city. Adding a city means adding an entry here (plus optional
// precomputed assets under public/data/), not touching the components.
export const PHOENIX = {
  id: "phx",
  name: "Phoenix, AZ",
  shortName: "Phoenix",
  threadSid: "PHXthr 9",
  recordStart: "1896-01-01",
  stationLabel:
    "Phoenix ThreadEx station record (downtown 1896–1933, Sky Harbor 1933–present)",
  urbanShort: "Sky Harbor",
  baseline: { start: 1970, end: 1979, label: "1970s" },
  // window choices offered in the UI; the full record is appended dynamically
  windows: [
    { y: 1970, label: "Since 1970" },
    { y: 1948, label: "Since 1948" },
  ],
  latLon: [33.4278, -112.0037],
  rural: {
    sid: "USC00021314",
    name: "Casa Grande National Monument",
    short: "Casa Grande NM",
    firstYear: 1948,
    distance: "~45 miles",
    elevationNote:
      "The monument station sits ~300 ft higher than Sky Harbor, so part of the absolute gap is elevation — the honest signal is the gap's growth, not its size.",
    growthCaveat:
      "the Casa Grande–Maricopa corridor has been booming, so the \"rural\" reference is slowly growing its own heat island. If anything, that makes the city share above an underestimate.",
  },
  // built by analysis/build_diurnal.py from NCEI hourly observations
  diurnalAsset: "data/phx-diurnal.json",
  // built by analysis/build_heat_season.py from ACIS daily highs
  heatSeasonAsset: "data/phx-heat-season.json",
  // hand-verified from the county's annual report (see the JSON's source field)
  heatDeathsAsset: "data/phx-heat-deaths.json",
  // decennial census, Maricopa County (US Census Bureau)
  metroPopulation: {
    1950: 331770, 1960: 663510, 1970: 971228, 1980: 1509175,
    1990: 2122101, 2000: 3072149, 2010: 3817117, 2020: 4420568,
  },
};
