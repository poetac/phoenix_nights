// Unit test for the shared axis/tooltip label helpers (src/lib/labels.js). These were
// copy-pasted per chart card; now they live once and are pinned here. Plain node, no
// deps: run `node tests/labels.test.mjs` from apps/web (or via `npm test`).
import { hourLabel, doyLabel } from "../src/lib/labels.js";

let failed = false;
const ok = (cond, msg) => { if (!cond) { console.error("✗ FAIL:", msg); failed = true; } };
const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);

// --- hourLabel: 12-hour clock with the two noon/midnight special cases ---
eq(hourLabel(0), "12 AM", "hourLabel 0 → 12 AM");
eq(hourLabel(12), "12 PM", "hourLabel 12 → 12 PM");
eq(hourLabel(1), "1 AM", "hourLabel 1 → 1 AM");
eq(hourLabel(11), "11 AM", "hourLabel 11 → 11 AM");
eq(hourLabel(13), "1 PM", "hourLabel 13 → 1 PM");
eq(hourLabel(23), "11 PM", "hourLabel 23 → 11 PM");

// --- doyLabel: monthNames takes precedence; otherwise format from a non-leap year ---
eq(doyLabel(91, { 91: "Apr" }), "Apr", "doyLabel uses monthNames when the day is a tick");
eq(doyLabel(1, {}), "Jan 1", "doyLabel day-of-year 1 → Jan 1");
eq(doyLabel(32, {}), "Feb 1", "doyLabel day-of-year 32 → Feb 1");
eq(doyLabel(91, {}), "Apr 1", "doyLabel day-of-year 91 (no monthNames) → Apr 1");
// the monthNames map only short-circuits its own keys; other days still compute
eq(doyLabel(100, { 91: "Apr" }), "Apr 10", "doyLabel falls through for non-tick days");
// default arg: omitting monthNames behaves like an empty map
eq(doyLabel(32), "Feb 1", "doyLabel default monthNames → date-computed");

console.log(failed ? "LABELS TESTS FAILED" : "✓ labels.js: hourLabel (12h + noon/midnight) / doyLabel (monthNames + date fallback)");
process.exit(failed ? 1 : 0);
