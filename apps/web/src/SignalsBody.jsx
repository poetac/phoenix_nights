import { useMemo } from "react";
import { C, DISPLAY, Card } from "./ui.jsx";
import { blockBootstrapCI } from "./lib/stats.js";
import ExtrapolationCard from "./cards/ExtrapolationCard.jsx";
import GlobalContextCard from "./cards/GlobalContextCard.jsx";
import UhiCard from "./cards/UhiCard.jsx";
import GapCard from "./cards/GapCard.jsx";
import DiurnalCard from "./cards/DiurnalCard.jsx";
import ExtremesCard from "./cards/ExtremesCard.jsx";
import WinterCard from "./cards/WinterCard.jsx";
import HotNightSeasonCard from "./cards/HotNightSeasonCard.jsx";
import SleepCard from "./cards/SleepCard.jsx";
import CoolWindowCard from "./cards/CoolWindowCard.jsx";
import SeasonLengthCard from "./cards/SeasonLengthCard.jsx";
import NightCoolingCard from "./cards/NightCoolingCard.jsx";
import MethodologyCard from "./cards/MethodologyCard.jsx";
import SourcesCard from "./cards/SourcesCard.jsx";

// City Signals — the salience-driven body. Unlike the curated Desert Nights
// stack (DashboardBody, every applicable card in a fixed order), this renders
// ONLY the cards matching THIS city's top-ranked salience facts, in salience
// order. Because every city's fact ranking differs, every city's page is laid
// out differently — the whole point of the explorer.
//
// night_warming / lows_outpace_highs are the universal warming backbone (the
// verdict + extrapolation), shown once up front. Each remaining fact key maps to
// its full CARD FAMILY — the cards that show that signal in depth — so a city's
// top fact is emphasized completely, not as a single number. Every card in a
// family self-omits when its data/asset is missing (e.g. no diurnal for the humid
// set), so the page stays as deep as the city's record allows.
const FACT_CARD = {
  urban_excess: (p) => (p.rural ? <UhiCard city={p.city} cityRows={p.rows} ruralRows={p.rural} /> : null),
  diurnal_compression: (p) => (
    <>
      <GapCard city={p.city} rows={p.rows} />
      {p.diurnal && <DiurnalCard city={p.city} diurnal={p.diurnal} />}
    </>
  ),
  coldest_night: (p) => (
    <>
      <ExtremesCard city={p.city} rows={p.rows} windowStart={p.windowStart} />
      {p.streaks && <WinterCard city={p.city} streaks={p.streaks} />}
    </>
  ),
  tropical_nights: (p) => (
    <>
      {p.streaks && <HotNightSeasonCard city={p.city} streaks={p.streaks} />}
      <SleepCard city={p.city} rows={p.rows} windowStart={p.windowStart} />
      {p.diurnal && <CoolWindowCard city={p.city} diurnal={p.diurnal} />}
    </>
  ),
  hot_day_season: (p) => (p.heatSeason ? <SeasonLengthCard city={p.city} heatSeason={p.heatSeason} /> : null),
  night_cooling_share: (p) => (p.cddSplit ? <NightCoolingCard city={p.city} cddSplit={p.cddSplit} /> : null),
};

export default function SignalsBody({ city, rows, source, rural, diurnal, heatSeason, streaks, cddSplit, facts }) {
  const windowStart = city.baseline.start;
  const vis = useMemo(() => rows.filter((r) => r.year >= windowStart), [rows, windowStart]);
  const fitLow = useMemo(() => blockBootstrapCI(vis.map((r) => ({ x: r.year, y: r.low }))), [vis]);
  const fitHigh = useMemo(() => blockBootstrapCI(vis.map((r) => ({ x: r.year, y: r.high }))), [vis]);
  const lowDec = fitLow ? fitLow.slope * 10 : null;
  const highDec = fitHigh ? fitHigh.slope * 10 : null;
  const ratio = lowDec != null && highDec != null && Math.abs(highDec) > 0.05 ? lowDec / highDec : null;

  // The city's top fact keys, in salience order, deduped to those that map to a
  // distinct card (the trend backbone covers night_warming / lows_outpace_highs).
  const distinct = useMemo(() => {
    const seen = new Set();
    return (facts || [])
      .map((f) => f.key)
      .filter((k) => FACT_CARD[k] && !seen.has(k) && seen.add(k));
  }, [facts]);

  const ctx = { city, rows, rural, diurnal, heatSeason, streaks, cddSplit, windowStart };

  return (
    <div className="space-y-6">
      {/* Universal warming backbone */}
      <Card style={{ background: C.panel2 }}>
        <div className="text-xs tracking-widest uppercase mb-3" style={{ color: C.muted }}>
          The warming signal · since {windowStart}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-4xl sm:text-5xl" style={{ fontFamily: DISPLAY, color: C.ember, fontVariantNumeric: "tabular-nums" }}>
              {lowDec != null ? `+${lowDec.toFixed(1)}°` : "—"}
            </div>
            <div className="text-sm mt-1" style={{ color: C.emberSoft }}>overnight lows, per decade</div>
          </div>
          <div>
            <div className="text-4xl sm:text-5xl" style={{ fontFamily: DISPLAY, color: C.day, fontVariantNumeric: "tabular-nums" }}>
              {highDec != null ? `${highDec >= 0 ? "+" : ""}${highDec.toFixed(1)}°` : "—"}
            </div>
            <div className="text-sm mt-1" style={{ color: C.day }}>daytime highs, per decade</div>
          </div>
        </div>
        {ratio != null && ratio > 0 && (
          <p className="mt-4 text-base leading-relaxed">
            {city.shortName}'s nights are warming{" "}
            <span style={{ color: C.gold, fontFamily: DISPLAY }}>{ratio.toFixed(1)}× as fast</span>{" "}
            as its days.
          </p>
        )}
      </Card>

      <ExtrapolationCard city={city} rows={vis} fit={fitLow} windowStart={windowStart} />
      {source === "acis" && rural && <GlobalContextCard city={city} cityRows={rows} ruralRows={rural} />}

      {/* This city's distinctive cards, in salience order */}
      {distinct.map((key) => <div key={key}>{FACT_CARD[key](ctx)}</div>)}

      <MethodologyCard city={city} />
      <SourcesCard city={city} />
    </div>
  );
}
