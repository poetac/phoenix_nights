import { useMemo } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from "recharts";
import { C, DISPLAY, BODY, Card, CardHead, DarkTooltip, axisTick, useUnits } from "../ui.jsx";
import { convTemp, convTempDelta, tempUnit } from "../lib/units.js";
import { extrapolationModel } from "../lib/extrapolationModel.js";

const HORIZON = 2050;

// Phase 5 — honest extrapolation. Carries the city's MEASURED overnight-low
// trend forward in a straight line, with the *existing* moving-block-bootstrap
// slope CI fanned out from the data centroid. It is deliberately framed as a
// hypothetical ("if the line held"), NOT a forecast: no emissions scenario, no
// physics. A real projection (CMIP6 / LOCA2 downscaling) is a separate layer.
export default function ExtrapolationCard({ city, rows, fit, windowStart }) {
  const model = useMemo(() => extrapolationModel(rows, fit, HORIZON), [rows, fit]);

  const units = useUnits();
  if (!model) return null;
  const { data, lastYear, perDecade, at2050, half, recent } = model;
  // Absolute lows (hist/proj/band, at2050, recent) via convTemp; the per-decade
  // slope and the ± half-band are differences (convTempDelta). Both identity in °F.
  const displayData = data.map((r) => ({
    year: r.year,
    hist: r.hist == null ? null : +convTemp(r.hist, units).toFixed(1),
    proj: r.proj == null ? null : +convTemp(r.proj, units).toFixed(1),
    band: r.band == null ? null : [+convTemp(r.band[0], units).toFixed(1), +convTemp(r.band[1], units).toFixed(1)],
  }));

  return (
    <Card>
      <CardHead
        kicker="If the trend simply continued"
        title="A line, not a forecast"
        sub={`Carrying ${city.shortName}'s measured overnight-low trend (+${convTempDelta(perDecade, units).toFixed(1)}${tempUnit(units)} per decade since ${windowStart}) forward in a straight line to ${HORIZON}. The shaded fan is only the statistical uncertainty in that historical slope — the same 95% moving-block bootstrap as the headline — and it widens the farther it reaches past the record.`}
      />
      <div role="img" style={{ width: "100%", height: 280 }}
        aria-label={`Chart of ${city.shortName}'s yearly average overnight low, with the measured trend extended as a dashed line to ${HORIZON} inside a widening uncertainty fan.`}>
        <ResponsiveContainer>
          <ComposedChart data={displayData} margin={{ top: 6, right: 10, left: -14, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} strokeDasharray="2 6" vertical={false} />
            <XAxis dataKey="year" type="number" domain={["dataMin", HORIZON]} tick={axisTick}
              tickLine={false} axisLine={{ stroke: C.line }} minTickGap={32} allowDecimals={false} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} domain={["auto", "auto"]} unit="°" />
            <Tooltip content={<DarkTooltip unit={tempUnit(units)} />} />
            <ReferenceLine x={lastYear} stroke={C.muted} strokeDasharray="3 5"
              label={{ value: "today", fill: C.muted, fontSize: 11, position: "insideTopLeft" }} />
            <Area isAnimationActive={false} type="monotone" dataKey="band" name="trend uncertainty"
              stroke="none" fill={C.ember} fillOpacity={0.15} connectNulls />
            <Line isAnimationActive={false} type="monotone" dataKey="hist" name="Overnight low (recorded)"
              stroke={C.ember} strokeWidth={2.5} dot={false} connectNulls={false} />
            <Line isAnimationActive={false} type="monotone" dataKey="proj" name="if the trend continued"
              stroke={C.emberSoft} strokeWidth={2} strokeDasharray="6 5" dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-sm mt-2 leading-relaxed" style={{ color: C.text }}>
        If nothing changed the slope, {city.shortName}'s average annual overnight low would reach about{" "}
        <span style={{ color: C.gold, fontFamily: DISPLAY }}>{convTemp(at2050, units).toFixed(0)}{tempUnit(units)} (±{convTempDelta(half, units).toFixed(0)}) by {HORIZON}</span>
        , up from ~{convTemp(recent, units).toFixed(0)}{tempUnit(units)} over the last decade.
      </p>
      <p className="text-xs mt-2 leading-relaxed" style={{ color: C.muted, fontFamily: BODY }}>
        <strong style={{ color: C.text }}>This is a straight-line extrapolation, not a climate projection.</strong>{" "}
        It carries the past trend forward with no emissions scenario and no physics — a “what if the line
        held” sketch, not a prediction. A real forecast (e.g. CMIP6 / LOCA2 downscaling) is a separate
        layer and could bend this up or down; the fan shows only the uncertainty in the fitted slope, not
        that deeper uncertainty.
      </p>
    </Card>
  );
}
