// Shared year-series windows — the three selection patterns every card model was
// re-implementing (M8 #5), plus decade grouping. Pure module (no React/units) so the
// node tests exercise it directly (tests/series.test.mjs), and each model's own
// exact-value test pins that adopting these helpers changed nothing.
//
// The two baseline variants below are BOTH live on purpose, and they are separate
// functions so a call site has to say which it means (the convTemp/convTempDelta
// philosophy): Streak/NightCooling/HotNightSeason/SeasonLength read the bounded
// baseline span, while Sleep/Extremes/Seasons deliberately read everything up to the
// baseline's end. Bespoke windows (Winter's pre-1970 era, GlobalContext's since-1970,
// CoolWindow's asset-keyed decades) stay in their models — they are one-offs, not
// this pattern.

// Rows inside the city's baseline span, inclusive at both ends.
export const baselineWindow = (rows, baseline) =>
  rows.filter((r) => r.year >= baseline.start && r.year <= baseline.end);

// Everything up to (and including) a year — the open-ended "early" variant.
export const throughYear = (rows, endYear) => rows.filter((r) => r.year <= endYear);

// The trailing n-year window, anchored on the LAST ROW's year (rows are year-sorted
// everywhere in this app): strictly greater than lastYear - n, so a contiguous record
// yields exactly n years and a gappy one only the years that exist.
export function lastYears(rows, n) {
  if (!rows.length) return [];
  const lastYear = rows[rows.length - 1].year;
  return rows.filter((r) => r.year > lastYear - n);
}

// Group rows by calendar decade, keep decades with at least minCount rows, ascending.
// Returns { decade, rows, n } and lets the caller take its own means — the callers
// genuinely differ (Gap averages one derived value, the dashboard two fields, Growth a
// city-minus-rural join), so the mean is not baked in.
export function decadeGroups(rows, minCount = 1) {
  const byDec = {};
  for (const r of rows) {
    const d = Math.floor(r.year / 10) * 10;
    (byDec[d] ??= []).push(r);
  }
  return Object.keys(byDec)
    .map((d) => ({ decade: +d, rows: byDec[d], n: byDec[d].length }))
    .filter((g) => g.n >= minCount)
    .sort((a, b) => a.decade - b.decade);
}
