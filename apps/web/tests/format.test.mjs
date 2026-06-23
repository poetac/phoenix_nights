// Unit test for the prose formatting layer (src/lib/format.js). The render smoke test
// only proves cards mount; the *direction words* next to signed values (the recurring
// bug class — "X days earlier" rendered for a city whose shift is negative) are decided
// here, so this is the net under them. Asserts both signs and the zero case for each.
// Plain node, no deps: run `node tests/format.test.mjs` from apps/web.
import { signed, pluralize, direction } from "../src/lib/format.js";

let failed = false;
const ok = (cond, msg) => { if (!cond) { console.error("✗ FAIL:", msg); failed = true; } };
const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);

// --- signed: always shows the sign, both directions, including zero ---
eq(signed(1.2), "+1.2", "signed positive");
eq(signed(-0.3), "-0.3", "signed negative");
eq(signed(0), "+0.0", "signed zero → +0.0");
eq(signed(2), "+2.0", "signed integer → 1 decimal");
eq(signed(-2.16, 2), "-2.16", "signed 2 decimals negative");
eq(signed(0.049, 1), "+0.0", "signed rounds to +0.0");

// --- pluralize: singular only at exactly 1 (incl. -1) ---
eq(pluralize(1, "day"), "1 day", "pluralize 1");
eq(pluralize(0, "day"), "0 days", "pluralize 0");
eq(pluralize(3, "day"), "3 days", "pluralize 3");
eq(pluralize(1, "night"), "1 night", "pluralize other noun");

// --- direction: the keystone — sign decides the word, mag is always positive ---
{
  const d = direction(4.2, { pos: "earlier", neg: "later", zero: "about steady" });
  eq(d.n, 4, "direction +4.2 → n=4"); eq(d.mag, 4, "mag=4"); eq(d.word, "earlier", "word=earlier");
}
{
  // the exact case that shipped false: a NEGATIVE shift must NOT say "earlier"
  const d = direction(-4.2, { pos: "earlier", neg: "later", zero: "about steady" });
  eq(d.n, -4, "direction -4.2 → n=-4"); eq(d.mag, 4, "mag is positive (4)"); eq(d.word, "later", "word=later (not earlier)");
}
{
  const d = direction(-0.4, { pos: "earlier", neg: "later", zero: "about steady" });
  eq(d.n, 0, "direction -0.4 rounds to 0"); eq(d.word, "about steady", "rounds-to-zero → zero word");
}
{
  const d = direction(2.6, { pos: "longer", neg: "shorter", zero: "unchanged" });
  eq(d.mag, 3, "direction 2.6 → mag 3 (rounded)"); eq(d.word, "longer", "word=longer");
}

console.log(failed ? "FORMAT TESTS FAILED" : "✓ format.js: signed / pluralize / direction (both signs + zero)");
process.exit(failed ? 1 : 0);
