import { useMemo } from "react";
import { C, DISPLAY, useUnits } from "../ui.jsx";
import { convTemp, convTempDelta, tempUnit } from "../lib/units.js";
import { lastNightModel } from "../lib/lastNightModel.js";

// "+11" / "−4" with a real minus glyph
const signed = (n) => (n >= 0 ? "+" : "−") + Math.abs(n);

export default function LastNightHero({ city, lastNight, normals }) {
  // warmer (sets the accent + above/below) and near (|anomLow| < 1 → "landed right on the
  // normal") are computed in lastNightModel from the raw °F anomaly. See lib/lastNightModel.js.
  const model = useMemo(() => lastNightModel(lastNight, normals), [lastNight, normals]);

  const units = useUnits();
  if (!model) return null;

  const { low, normLow, anomLow, anomHigh, dateLabel, warmer, near } = model;
  const accent = warmer ? C.ember : C.day;
  // Lows are absolute temps (convTemp); anomalies are differences (convTempDelta).
  // Both are the identity in °F (and the "near" test stays on the °F anomaly), so
  // the live US hero is unchanged; metric displays °C.
  const u = tempUnit(units);
  const dLow = Math.round(convTemp(low, units));
  const dNormLow = Math.round(convTemp(normLow, units));
  const dAnomLow = Math.round(convTempDelta(anomLow, units));
  const dAnomHigh = anomHigh != null ? Math.round(convTempDelta(anomHigh, units)) : null;

  return (
    <div className="rounded-2xl p-4 sm:p-6 mb-6"
      style={{ background: C.panel2, border: `1px solid ${C.line}` }}>
      <div className="text-xs tracking-widest uppercase mb-3" style={{ color: C.muted }}>
        Most recent night on record · {dateLabel}
      </div>
      <div className="flex items-baseline gap-3 flex-wrap">
        <div style={{ fontFamily: DISPLAY, color: accent, fontSize: "3rem", lineHeight: 1, fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>
          {near ? `${dLow}°` : `${signed(dAnomLow)}°`}
        </div>
        <div className="text-base sm:text-lg leading-snug" style={{ color: C.text }}>
          {near ? (
            <>{city.shortName}'s low of <strong>{dLow}{u}</strong> landed right on the{" "}
            <span style={{ color: C.gold }}>{city.baseline.label} normal</span> for {dateLabel} ({dNormLow}{u}).</>
          ) : (
            <>{city.shortName}'s low of <strong>{dLow}{u}</strong> was{" "}
            <span style={{ color: accent, fontFamily: DISPLAY }}>{Math.abs(dAnomLow)}{u} {warmer ? "above" : "below"}</span>{" "}
            the <span style={{ color: C.gold }}>{city.baseline.label} normal</span> of {dNormLow}{u} for {dateLabel}.</>
          )}
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: C.muted }}>
        Measured against a fixed yardstick — this station's {normals.baselineLabel || city.baseline.label} average
        for this date, smoothed over a two-week window — not a rolling "normal" that quietly absorbs the warming.
        {dAnomHigh != null && <> The afternoon high ran {signed(dAnomHigh)}{u} against its own {city.baseline.label} normal.</>}{" "}
        One night is weather, not climate; the cards below are the climate. {city.urbanShort} also sits inside the
        urban heat island it measures.
      </p>
    </div>
  );
}
