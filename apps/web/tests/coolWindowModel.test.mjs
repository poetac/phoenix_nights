// Unit test for lib/coolWindowModel.js — the CoolWindowCard transform. The render smoke
// test only asserts the card MOUNTS where it already does; it can't catch a card that
// should have OMITTED itself. This is the net under the hot-city scarcity guard: the
// "relief vanished" story may render only where overnight relief has shrunk toward zero
// (latest decade <= 13 hours below 85°F), never on a cool/high-elevation city where
// relief is abundant and the bars would overflow. Plain node, no deps.
import { coolWindowModel, RELIEF, RECOVERY } from "../src/lib/coolWindowModel.js";

let failed = false;
const ok = (cond, msg) => { if (!cond) { console.error("✗ FAIL:", msg); failed = true; } };
const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);

// A decade's average-night temp curve: `r` hours below 77°F (deep recovery), `s` hours
// in 77–85°F (some relief), the remaining 24 above 85°F (no relief). So below77 = r,
// below85 = r + s = total.
function temps(r, s) {
  const out = [];
  for (let i = 0; i < r; i++) out.push(70);
  for (let i = 0; i < s; i++) out.push(80);
  while (out.length < 24) out.push(90);
  return out;
}
const DENSE = new Array(24).fill(500);   // avg 500/hr → clears the density gate
const SPARSE = new Array(24).fill(100);  // avg 100/hr → excluded
const decade = (r, s, nObs = DENSE) => ({ nObs, temp: temps(r, s) });
const diurnalOf = (decades) => ({ decades });
const cityOf = (start) => ({ baseline: { start } });

// --- a hot city whose relief collapses → renders ---
const m = coolWindowModel(diurnalOf({
  1970: decade(4, 8),   // baseline: total 12, recovery 4
  1980: decade(2, 6),   // total 8, recovery 2
  1990: decade(0, 2),   // latest: total 2, recovery 0  (<= 13 → passes the guard)
}), cityOf(1970));
ok(m !== null, "hot-city collapse yields a model");
eq(m.data.length, 3, "one row per dense decade");
eq(m.base.k, "1970", "base = the baseline-start decade");
eq(m.base.total, 12, "base total = hours below 85°F");
eq(m.base.recovery, 4, "base recovery = hours below 77°F");
eq(m.base.some, 8, "base some = the 77–85°F band");
eq(m.now.total, 2, "now = the latest decade");
eq(m.now.recovery, 0, "latest decade has no deep-recovery hour");
eq(m.lastRecovery.decade, "1980s", "lastRecovery = last decade with any hour below 77°F");

// --- guard: a cool city, relief abundant (latest decade > 13 h below 85°F) → omit ---
eq(coolWindowModel(diurnalOf({
  1970: decade(8, 10), 1980: decade(9, 10), 1990: decade(10, 8), // latest total 18 > 13
}), cityOf(1970)), null, "latest decade with > 13 relief hours → null (cool city)");

// --- density gate: a sparse decade is dropped from the series ---
const gappy = coolWindowModel(diurnalOf({
  1970: decade(4, 8),
  1980: decade(3, 6, SPARSE), // too few obs → excluded
  1990: decade(2, 4),
  2000: decade(0, 2),
}), cityOf(1970));
eq(gappy.data.length, 3, "the sparse 1980s decade is filtered out");
ok(!gappy.data.some((d) => d.k === "1980"), "…and absent from the series");
eq(gappy.now.k, "2000", "now is the latest dense decade");

// --- guard: fewer than 3 dense decades → null ---
eq(coolWindowModel(diurnalOf({
  1970: decade(4, 8), 1980: decade(2, 6, SPARSE), 1990: decade(0, 2),
}), cityOf(1970)), null, "only 2 dense decades → null");

// --- base falls back to the earliest decade when the baseline decade is absent ---
const noBase = coolWindowModel(diurnalOf({
  1970: decade(4, 8), 1980: decade(2, 6), 1990: decade(0, 2),
}), cityOf(1950)); // baseline decade 1950 not present
eq(noBase.base.k, "1970", "base falls back to data[0] when the baseline decade is missing");

// --- guards: missing asset ---
eq(coolWindowModel(null, cityOf(1970)), null, "null diurnal → null");
eq(coolWindowModel({}, cityOf(1970)), null, "no decades → null");

// thresholds are exported for the card's labels
eq(RELIEF, 85, "RELIEF threshold exported");
eq(RECOVERY, 77, "RECOVERY threshold exported");

console.log(failed ? "COOLWINDOWMODEL TEST FAILED" : "COOLWINDOWMODEL TEST PASSED");
process.exit(failed ? 1 : 0);
