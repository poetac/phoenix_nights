// Unit test for assetUrl (src/lib/data.js) — the cache-buster appended to every
// committed-asset fetch (M8 #3). Plain node, no deps: run `node tests/dataVersion.test.mjs`.
import { assetUrl } from "../src/lib/data.js";

let failed = false;
const eq = (a, b, msg) => { if (!Object.is(a, b)) { console.error("✗ FAIL:", `${msg} — got ${a}, expected ${b}`); failed = true; } };

eq(assetUrl("data/phx-facts.json", undefined), "data/phx-facts.json", "no version → path unchanged");
eq(assetUrl("data/phx-facts.json", ""), "data/phx-facts.json", "empty version → path unchanged");
eq(assetUrl("data/phx-facts.json", "abc123"), "data/phx-facts.json?v=abc123", "version → ?v= appended");
eq(assetUrl("data/phx-facts.json?raw=1", "abc123"), "data/phx-facts.json?raw=1&v=abc123",
  "existing query string → &v= appended, not a second ?");

console.log(failed ? "DATAVERSION TESTS FAILED" : "✓ data.js: assetUrl (no-version passthrough + ?v=/&v= append)");
process.exit(failed ? 1 : 0);
