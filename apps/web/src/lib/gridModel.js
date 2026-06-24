// Pure transform behind GridCard — the EIA grid asset → chart series + the two
// direction clauses (compare/floor) that describe it in prose. Pulled out of the card
// so the branches, which must read true for every grid city and not just Phoenix, are
// unit-testable without a DOM (tests/gridModel.test.mjs).
//
// History this guards: a hardcoded "twice as fast" once rendered "grown 23%, twice as
// fast as the peak (-2%)" for Tucson, whose evening peak actually fell. Every word
// below is derived from the asset — `compare` reads the trough-vs-peak growth ratio,
// `floor` reads the change in trough-as-%-of-peak — so the sign and the comparison
// always match the numbers. Returns null (card renders nothing) when the asset is
// missing or has fewer than four years.
export function gridModel(grid) {
  if (!grid?.years) return null;
  const keys = Object.keys(grid.years).sort();
  if (keys.length < 4) return null;
  const thenK = keys[0], nowK = keys[keys.length - 1];
  const then = grid.years[thenK].mw, now = grid.years[nowK].mw;
  const data = then.map((v, h) => ({ hour: h, then: v, now: now[h], band: [v, now[h]] }));
  const tg = (Math.min(...now) / Math.min(...then) - 1) * 100;
  const pg = (Math.max(...now) / Math.max(...then) - 1) * 100;
  const tpThen = grid.years[thenK].troughPct;
  const tpNow = grid.years[nowK].troughPct;

  let compare;
  if (pg <= 0.5) {
    compare = `while the evening peak ${pg < -0.5 ? `fell ${Math.abs(pg).toFixed(0)}%` : "barely moved"}`;
  } else {
    const ratio = tg / pg;
    if (ratio >= 1.8) compare = `roughly ${Math.round(ratio)}× as fast as the evening peak (+${pg.toFixed(0)}%)`;
    else if (ratio >= 1.15) compare = `faster than the evening peak (+${pg.toFixed(0)}%)`;
    else if (ratio >= 0.85) compare = `about as fast as the evening peak (+${pg.toFixed(0)}%)`;
    else compare = `slower than the evening peak (+${pg.toFixed(0)}%)`;
  }
  const floorDelta = tpNow - tpThen;
  let floor;
  if (floorDelta >= 0.5) floor = `now holds at ${tpNow}% of peak load, up from ${tpThen}%`;
  else if (floorDelta <= -0.5) floor = `now sits at ${tpNow}% of peak load, down from ${tpThen}%`;
  else floor = `holds near ${tpNow}% of peak load (${tpThen}% then)`;

  return {
    data, thenK, nowK,
    troughGrowth: tg, peakGrowth: pg,
    troughPctThen: tpThen, troughPctNow: tpNow,
    respondents: grid.respondents,
    month: grid.month || "July",
    source: grid.source || "US EIA Hourly Electric Grid Monitor (EIA-930)",
    compare, floor,
  };
}
