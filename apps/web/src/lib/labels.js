// Axis/tooltip label helpers shared across the chart cards. These were copy-pasted
// verbatim per card (hourLabel in DiurnalCard + GridCard; doyLabel in SeasonLength +
// HotNightSeason) — pull them here so the formatting lives once and is unit-tested.
// No JSX/React imports, so it runs in node (covered by tests/labels.test.mjs).

// Hour-of-day → 12-hour clock label: 0 → "12 AM", 12 → "12 PM", 13 → "1 PM".
export function hourLabel(h) {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

// Day-of-year → short "Mon D" label. `monthNames` maps the specific tick day-of-years
// to a clean month-only label (e.g. { 91: "Apr" }) so axis ticks read "Apr" not
// "Apr 1"; any other day formats from a fixed non-leap reference year. Each card keeps
// its own monthNames (its axis starts at a different month), so it's passed in rather
// than closed over. NOTE: because the reference year (2001) is non-leap, a day-of-year
// ≥ 60 that came from a leap year renders one calendar day late — a known cosmetic
// issue tracked under the day-of-year unification (ROADMAP M8 #12); behaviour is
// preserved here exactly as the cards had it.
export function doyLabel(doy, monthNames = {}) {
  if (monthNames[doy]) return monthNames[doy];
  const d = new Date(2001, 0, doy);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
