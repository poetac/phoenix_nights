// Units layer — Phase B groundwork (WORLDWIDE.md §"Phase B").
//
// The official US record is in °F and the copy is in miles; the whole live US
// product runs in IMPERIAL. Every converter here treats imperial as the IDENTITY
// (convTemp(x, "imperial") === x, exactly), which is the safety keystone of this
// module:
//   1. The live site cannot change byte-for-byte by routing a number through these
//      helpers — imperial in, the same number out.
//   2. A mistake in a card migration (e.g. using convTemp where convTempDelta was
//      meant) can therefore only ever affect METRIC output, never the US product.
// A future international city declares `units: "metric"` in its cities.js entry;
// cards read the active system from <UnitsContext> via useUnits() (see ui.jsx) and
// format through the converters below. Pure module (no imports) so the node unit
// test (tests/units.test.mjs) can exercise it without a DOM or React.

// Which system a city renders in. Default imperial: every current (US) city omits
// `units`, so this is a no-op for the live product until a metric city is added.
export const unitsOf = (city) => (city && city.units === "metric" ? "metric" : "imperial");

// --- converters: canonical record units (°F, °F/decade, miles) -> display number ---

// Absolute temperature. °F -> °C applies the full offset+scale.
export const convTemp = (f, sys) => (sys === "metric" ? ((f - 32) * 5) / 9 : f);

// A temperature DIFFERENCE or trend (a °F gap, or °F/decade). A delta scales by 5/9
// with NO 32° offset: a +1.8 °F/decade trend is +1.0 °C/decade, not -17. Using
// convTemp here instead of convTempDelta is the classic bug; they are deliberately
// separate functions so the call site has to say which it means.
export const convTempDelta = (f, sys) => (sys === "metric" ? (f * 5) / 9 : f);

// Distance. Miles -> kilometres.
export const convDist = (mi, sys) => (sys === "metric" ? mi * 1.609344 : mi);

// --- unit labels for the active system ---
export const tempUnit = (sys) => (sys === "metric" ? "°C" : "°F");
export const tempRateUnit = (sys) => (sys === "metric" ? "°C/decade" : "°F/decade");
export const distUnit = (sys) => (sys === "metric" ? "km" : "miles");

// --- convenience formatters (convert -> round -> append unit) ---
// For exact-match card migrations, prefer the converters above with the card's own
// rounding so imperial output stays byte-identical; these are for new/simple copy.
export const fmtTemp = (f, sys, digits = 0) => `${convTemp(f, sys).toFixed(digits)}${tempUnit(sys)}`;
export const fmtTempDelta = (f, sys, digits = 2) => `${convTempDelta(f, sys).toFixed(digits)}${tempRateUnit(sys)}`;
export const fmtDist = (mi, sys, digits = 0) => `${convDist(mi, sys).toFixed(digits)} ${distUnit(sys)}`;

// Convert a rural-distance phrase like "~45 miles north" for display. Imperial
// returns the phrase unchanged (identity), so the live US copy is byte-for-byte the
// same; metric swaps the miles value for whole km, keeping the "~" and any trailing
// direction. Lets UhiCard's prose go metric without a per-city schema change.
export const convDistPhrase = (phrase, sys) =>
  sys === "metric" && phrase
    ? phrase.replace(/(\d+(?:\.\d+)?)\s*miles?/i, (_, n) => `${Math.round(convDist(+n, sys))} km`)
    : phrase;
