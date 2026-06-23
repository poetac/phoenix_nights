// Pure formatting helpers for card prose — the sign/direction/pluralization layer.
//
// These centralize logic that was hand-written next to signed values across many
// cards (the `>= 0 ? "+" : ""` prefix, "earlier/later", "longer/shorter", day
// pluralization). That duplication was the root of a recurring bug class: a clause
// like "X days earlier" rendered next to a value that is negative for some city, so
// it read false. Centralizing it here makes the direction a *tested* function instead
// of prose re-derived per card. No JSX/React imports, so it's unit-testable in node.

// A signed, fixed-precision number for display: "+1.2" / "-0.3" / "+0.0".
// (toFixed already prints the "-" for negatives; we only add the "+".)
export function signed(n, digits = 1) {
  const s = Number(n).toFixed(digits);
  return s.startsWith("-") ? s : `+${s}`;
}

// "1 day" / "3 days" — count + singular/plural noun.
export function pluralize(n, word) {
  return `${n} ${word}${Math.abs(n) === 1 ? "" : "s"}`;
}

// Round a signed delta and describe its direction. Returns { n, mag, word } where
// `n` is the rounded value, `mag` its absolute value (for display), and `word` the
// label chosen by sign: `pos` when n>0, `neg` when n<0, `zero` when it rounds to 0.
// e.g. direction(firstShift, { pos: "earlier", neg: "later", zero: "about steady" }).
export function direction(delta, { pos, neg, zero }) {
  const n = Math.round(Number(delta));
  if (n > 0) return { n, mag: n, word: pos };
  if (n < 0) return { n, mag: -n, word: neg };
  return { n: 0, mag: 0, word: zero };
}
