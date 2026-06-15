import { useMemo } from "react";
import { C, DISPLAY } from "../ui.jsx";

// "+11" / "−4" with a real minus glyph
const signed = (n) => (n >= 0 ? "+" : "−") + Math.abs(n);

export default function LastNightHero({ city, lastNight, normals }) {
  const model = useMemo(() => {
    if (!lastNight || !normals?.byDate) return null;
    const key = lastNight.date.slice(5); // MM-DD
    const norm = normals.byDate[key] || normals.byDate["02-28"]; // Feb-29 fallback
    if (!norm || norm.low == null) return null;

    const low = Math.round(lastNight.low);
    const normLow = Math.round(norm.low);
    const anomLow = low - normLow;

    const high = lastNight.high != null ? Math.round(lastNight.high) : null;
    const normHigh = norm.high != null ? Math.round(norm.high) : null;
    const anomHigh = high != null && normHigh != null ? high - normHigh : null;

    const [y, m, d] = lastNight.date.split("-").map(Number);
    const dateLabel = new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric" });

    return { low, normLow, anomLow, high, normHigh, anomHigh, dateLabel };
  }, [lastNight, normals]);

  if (!model) return null;

  const { low, normLow, anomLow, anomHigh, dateLabel } = model;
  const warmer = anomLow >= 0;
  const accent = warmer ? C.ember : C.day;
  const near = Math.abs(anomLow) < 1;

  return (
    <div className="rounded-2xl p-4 sm:p-6 mb-6"
      style={{ background: C.panel2, border: `1px solid ${C.line}` }}>
      <div className="text-xs tracking-widest uppercase mb-3" style={{ color: C.muted }}>
        Most recent night on record · {dateLabel}
      </div>
      <div className="flex items-baseline gap-3 flex-wrap">
        <div style={{ fontFamily: DISPLAY, color: accent, fontSize: "3rem", lineHeight: 1, fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>
          {near ? `${low}°` : `${signed(anomLow)}°`}
        </div>
        <div className="text-base sm:text-lg leading-snug" style={{ color: C.text }}>
          {near ? (
            <>{city.shortName}'s low of <strong>{low}°F</strong> landed right on the{" "}
            <span style={{ color: C.gold }}>{city.baseline.label} normal</span> for {dateLabel} ({normLow}°F).</>
          ) : (
            <>{city.shortName}'s low of <strong>{low}°F</strong> was{" "}
            <span style={{ color: accent, fontFamily: DISPLAY }}>{Math.abs(anomLow)}°F {warmer ? "above" : "below"}</span>{" "}
            the <span style={{ color: C.gold }}>{city.baseline.label} normal</span> of {normLow}°F for {dateLabel}.</>
          )}
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: C.muted }}>
        Measured against a fixed yardstick — this station's {normals.baselineLabel || city.baseline.label} average
        for this date, smoothed over a two-week window — not a rolling "normal" that quietly absorbs the warming.
        {anomHigh != null && <> The afternoon high ran {signed(anomHigh)}°F against its own {city.baseline.label} normal.</>}{" "}
        One night is weather, not climate; the cards below are the climate. {city.urbanShort} also sits inside the
        urban heat island it measures.
      </p>
    </div>
  );
}
