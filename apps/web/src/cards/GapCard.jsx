import { useMemo } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { C, DISPLAY, Card, CardHead, DarkTooltip, axisTick, useUnits } from "../ui.jsx";
import { convTempDelta, tempUnit, tempRateUnit } from "../lib/units.js";
import { signed } from "../lib/format.js";
import { gapModel } from "../lib/gapModel.js";

// Diurnal temperature range (DTR = high − low). A desert's signature is a big
// daily swing; as nights warm faster than days, that swing collapses — the whole
// thesis as one falling line, and a textbook urban-heat-island fingerprint.
//
// Scoped to 1948+ on purpose: before then the threaded record includes downtown
// Phoenix and a valley blanketed in irrigated farmland, whose "oasis effect"
// suppressed daytime highs and inflated nighttime lows — a confound that runs the
// opposite way from urbanization. The Sky Harbor modern era isolates the city's
// own signal. (Same era the diurnal card uses.)
const DTR_START = 1948;

export default function GapCard({ city, rows }) {
  const model = useMemo(() => gapModel(rows, DTR_START), [rows]);

  const units = useUnits();
  if (!model) return null;
  // narrowed (is the daily swing collapsing? — the inland fingerprint vs the maritime
  // signal) is computed in gapModel; see lib/gapModel.js.
  const { narrowed } = model;
  // Diurnal range is a temperature DIFFERENCE, so every value scales with
  // convTempDelta (the °F branch is the identity → US output is unchanged).
  const d = (v) => convTempDelta(v, units);
  const displayData = model.data.map((r) => ({
    year: r.year, dtr: +d(r.dtr).toFixed(1), trend: +d(r.trend).toFixed(2),
  }));

  return (
    <Card>
      <CardHead kicker="Day minus night" title={`${city.shortName}'s daily swing is ${narrowed ? "collapsing" : "widening"}`}
        sub={`A day here is built on the gap between the afternoon high and the pre-dawn low — the diurnal range, what air conditioning, bodies, and the landscape lean on for relief. Here it is for every year since ${DTR_START} at ${city.urbanShort}.`} />
      <div role="img" style={{ width: "100%", height: 280 }}
        aria-label={`Line chart of the daily high-minus-low temperature range each year at ${city.urbanShort}, ${narrowed ? "narrowing" : "widening"} over time.`}>

        <ResponsiveContainer>
          <ComposedChart data={displayData} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
            <defs>
              <linearGradient id="dtrFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.day} stopOpacity={0.45} />
                <stop offset="100%" stopColor={C.day} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={C.grid} strokeDasharray="2 6" vertical={false} />
            <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={{ stroke: C.line }} minTickGap={32} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false}
              domain={["auto", "auto"]} tickFormatter={(v) => `${v}°`} />
            <Tooltip content={<DarkTooltip unit={tempUnit(units)} />} />
            <Area isAnimationActive={false} type="monotone" dataKey="dtr" name="Day–night gap"
              stroke={C.day} strokeWidth={2} fill="url(#dtrFill)" />
            <Line isAnimationActive={false} type="monotone" dataKey="trend" name="Trend"
              stroke={C.ember} strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-4 text-base leading-relaxed">
        In the {model.first.decade}s, an average {city.shortName} day swung{" "}
        <span style={{ fontFamily: DISPLAY, color: C.day }}>{d(model.first.dtr).toFixed(1)}{tempUnit(units)}</span> between afternoon and
        dawn. In the {model.last.decade}s it swings{" "}
        <span style={{ fontFamily: DISPLAY, color: C.ember }}>{d(model.last.dtr).toFixed(1)}{tempUnit(units)}</span> —{" "}
        {narrowed ? (
          <>the daily gap has narrowed by{" "}
            <span style={{ color: C.gold, fontFamily: DISPLAY }}>{d(model.narrowing).toFixed(1)}{tempUnit(units)}</span>. The highs barely
            moved; the lows climbed up to meet them. A shrinking diurnal range is the classic fingerprint of a heat
            island and of greenhouse warming alike — the city is quietly erasing the difference between day and night.</>
        ) : (
          <>the daily gap has{" "}
            <span style={{ color: C.gold, fontFamily: DISPLAY }}>widened by {Math.abs(d(model.narrowing)).toFixed(1)}{tempUnit(units)}</span>:
            here the days have warmed faster than the nights — the maritime signal that runs opposite the inland heat
            island, where the gap shrinks as the lows climb to meet the highs.</>
        )}
      </p>
      <p className="text-xs mt-3" style={{ color: C.muted }}>
        Diurnal range = annual mean daily high minus annual mean daily low, from the same{" "}
        {city.source === "ghcn" ? "precomputed NCEI GSOY annual series" : "live station record"} as the
        rest of the page (dashed line is the ordinary-least-squares trend,{" "}
        {signed(d(model.perDecade), 2)}{tempRateUnit(units)}). {city.id === "phx"
          ? <>Shown from {DTR_START}: earlier years in Phoenix's threaded record carry an agricultural "oasis effect" —
            heavy valley irrigation that lowered highs and raised lows — which confounds the urban signal, so they're
            left out here.</>
          : <>Shown from {DTR_START} to keep to the modern, densely-observed era.</>}
      </p>
    </Card>
  );
}
