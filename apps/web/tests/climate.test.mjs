// Unit test for climateOf (src/lib/cities.js). The biome chip used to come from a
// hand-kept HUMID set kept in sync by hand; now every city declares its own `climate`
// and climateOf falls back to "Arid West". This pins that contract: a city's declared
// climate wins, an undeclared one is arid, and the known biomes resolve as before.
import { CITIES, climateOf } from "../src/lib/cities.js";

let failed = false;
const ok = (cond, msg) => { if (!cond) { console.error("✗ FAIL:", msg); failed = true; } };
const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);

// --- known biomes resolve to the exact chip text the explore landing renders ---
eq(climateOf("atl").label, "Humid South", "atl → Humid South");
eq(climateOf("atl").key, "humid", "atl key humid");
eq(climateOf("phx").label, "Arid West", "phx → Arid West (arid fallback)");
eq(climateOf("phx").key, "arid", "phx key arid");
eq(climateOf("syd").label, "Temperate coast", "syd → its declared temperate climate");
eq(climateOf("dbt").label, "Maritime temperate", "dbt → its declared temperate climate");

// --- the contract: declared climate wins; otherwise the arid fallback ---
for (const c of CITIES) {
  const got = climateOf(c.id);
  ok(got && typeof got.key === "string" && got.label, `${c.id}: returns a {key,label}`);
  if (c.climate) eq(got, c.climate, `${c.id}: declared climate is returned verbatim`);
  else eq(got.key, "arid", `${c.id}: no declared climate → arid fallback`);
}

// --- exactly the five South/Gulf cities carry the humid biome (no more, no fewer) ---
const humid = CITIES.filter((c) => climateOf(c.id).key === "humid").map((c) => c.id).sort();
eq(humid.join(","), "atl,dfw,hou,nola,rdu", "the humid set is exactly the South/Gulf cities");
// an unknown id falls back to arid (climateOf is a lookup, not a throw)
eq(climateOf("nope").key, "arid", "unknown city → arid fallback");

console.log(failed ? "CLIMATE TESTS FAILED" : "✓ climateOf: declared-climate-wins + arid fallback (16 cities, humid = South/Gulf)");
process.exit(failed ? 1 : 0);
