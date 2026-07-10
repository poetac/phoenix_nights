// Unit test for lib/series.js — the shared year-series windows adopted across the card
// models (M8 #5). The models' own exact-value tests prove adoption changed nothing; this
// file pins the helpers' EDGE semantics, which is where the two live variants differ:
//   1. baselineWindow is bounded — inclusive at BOTH ends, a pre-start year is out;
//   2. throughYear is the open-ended variant — everything up to and including the year;
//   3. lastYears is strictly `> lastYear - n`, anchored on the LAST ROW's year; and
//   4. decadeGroups buckets by calendar decade with a minimum-count floor, ascending.
// Plain node, no deps: run `node tests/series.test.mjs` from apps/web.
import { baselineWindow, throughYear, lastYears, decadeGroups } from "../src/lib/series.js";

let failed = false;
const ok = (cond, msg) => { if (!cond) { console.error("✗ FAIL:", msg); failed = true; } };
const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);
const years = (arr) => arr.map((y) => ({ year: y }));
const yrs = (rows) => rows.map((r) => r.year).join(",");

// --- baselineWindow: bounded, inclusive at both ends ---
const rows = years([1968, 1969, 1970, 1975, 1979, 1980, 1990]);
eq(yrs(baselineWindow(rows, { start: 1970, end: 1979 })), "1970,1975,1979",
  "baselineWindow keeps [start, end] inclusive and drops pre-start years");
eq(baselineWindow(rows, { start: 2000, end: 2009 }).length, 0, "empty when nothing falls in the span");

// --- throughYear: the open-ended early variant ---
eq(yrs(throughYear(rows, 1979)), "1968,1969,1970,1975,1979",
  "throughYear keeps everything up to AND including the year (pre-start years stay in)");
// the difference between the two variants IS the point — same span, different membership
ok(throughYear(rows, 1979).length > baselineWindow(rows, { start: 1970, end: 1979 }).length,
  "bounded vs open-ended variants disagree on pre-start years (deliberately)");

// --- lastYears: strictly > lastYear - n, anchored on the last row ---
const run = years([2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020]);
eq(lastYears(run, 10).length, 10, "a contiguous record yields exactly n years");
eq(lastYears(run, 3).map((r) => r.year).join(","), "2018,2019,2020", "boundary is strict (> lastYear - n)");
eq(lastYears(years([2000, 2001, 2015, 2020]), 10).map((r) => r.year).join(","), "2015,2020",
  "a gappy record keeps only the years that exist in the window");
eq(lastYears([], 10).length, 0, "empty input → empty (no crash on missing last row)");

// --- decadeGroups: calendar decades, min-count floor, ascending, rows kept ---
const g = decadeGroups(years([1968, 1969, 1971, 1972, 1973, 1980]), 2);
eq(g.length, 2, "the lone-1980 decade misses the 2-row floor");
eq(g[0].decade, 1960, "ascending: 1960s first");
eq(g[1].decade, 1970, "then the 1970s");
eq(g[0].n, 2, "n counts the decade's rows");
eq(yrs(g[1].rows), "1971,1972,1973", "rows are kept (callers take their own means) in order");
eq(decadeGroups(years([1999, 2000]), 1).map((x) => x.decade).join(","), "1990,2000",
  "1999 and 2000 land in different calendar decades");
eq(decadeGroups([], 1).length, 0, "empty input → empty");

console.log(failed ? "SERIES TEST FAILED" : "SERIES TEST PASSED");
process.exit(failed ? 1 : 0);
