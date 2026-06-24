export const RELIEF = 85;   // hours below this are usable overnight relief
export const RECOVERY = 77; // the cited sleep-recovery line (see the sleep card)
const MIN_OBS_PER_HOUR = 500; // same density gate the diurnal card uses

// Pure transform behind CoolWindowCard — per observation-dense decade, the hours a
// typical summer night spends below the 85°F relief line (split at the 77°F deep-recovery
// line) → the baseline vs latest decade and the last decade that still had any recovery
// hour. The applicability guard is the point: this is a hot-city *scarcity* story (relief
// shrinking toward zero). Cool / high-elevation cities spend most of the night under 85°F
// — relief is abundant, not vanishing — and would overflow the axis, so when the latest
// decade still has more than 13 relief hours the model returns null and the card
// self-omits (hot cities, incl. El Paso ~12h, keep it). Pulled out of JSX so that guard
// is unit-testable without a DOM (tests/coolWindowModel.test.mjs). Also null when the
// asset is missing or fewer than 3 decades clear the observation-density gate.
export function coolWindowModel(diurnal, city) {
  if (!diurnal?.decades) return null;
  const solid = Object.keys(diurnal.decades)
    .filter((k) => diurnal.decades[k].nObs.reduce((a, b) => a + b, 0) / 24 >= MIN_OBS_PER_HOUR)
    .sort();
  if (solid.length < 3) return null;

  const data = solid.map((k) => {
    const t = diurnal.decades[k].temp;
    const below85 = t.filter((x) => x < RELIEF).length;
    const below77 = t.filter((x) => x < RECOVERY).length;
    return {
      decade: `${k}s`, k,
      recovery: below77,           // hours below 77°F
      some: below85 - below77,     // hours between 77 and 85°F
      total: below85,
    };
  });

  const baseK = String(Math.floor(city.baseline.start / 10) * 10);
  const base = data.find((d) => d.k === baseK) || data[0];
  const now = data[data.length - 1];
  // last decade that still had any hour below the 77°F recovery line
  const lastRecovery = [...data].reverse().find((d) => d.recovery > 0);

  if (now.total > 13) return null;

  return { data, base, now, lastRecovery };
}
