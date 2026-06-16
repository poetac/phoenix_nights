import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { C, DISPLAY, Card, CardHead, axisTick } from "../ui.jsx";

const MIN_OBS_PER_HOUR = 500; // same density gate the diurnal card uses
const RELIEF = 85;   // hours below this are usable overnight relief
const RECOVERY = 77; // the cited sleep-recovery line (see the sleep card)

export default function CoolWindowCard({ city, diurnal }) {
  const model = useMemo(() => {
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

    return { data, base, now, lastRecovery };
  }, [diurnal, city]);

  if (!model) return null;
  const { data, base, now, lastRecovery } = model;

  return (
    <Card>
      <CardHead kicker="Hours of relief"
        title="The night stopped giving you a break"
        sub={`How many hours a typical ${city.shortName} summer night spends cool enough to shed the day's heat — below ${RELIEF}°F — by decade, and how many reach the deeper ${RECOVERY}°F line where sleep can recover. A warmer minimum is only half the story; this is the relief that vanished with it.`} />
      <div role="img" style={{ width: "100%", height: 280 }}
        aria-label="Stacked bar chart of hours per night below 85°F and below 77°F by decade, shrinking toward zero.">

        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} strokeDasharray="2 6" vertical={false} />
            <XAxis dataKey="decade" tick={axisTick} tickLine={false} axisLine={{ stroke: C.line }} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false}
              domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} allowDecimals={false} />
            <Tooltip cursor={{ fill: "rgba(255,255,255,.04)" }} content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload;
              return (
                <div className="rounded-lg px-3 py-2 text-sm"
                  style={{ background: "#0e0a1a", border: `1px solid ${C.line}`, color: C.text }}>
                  <div style={{ color: C.muted }} className="text-xs mb-1">{p.decade}</div>
                  <div>{p.total} h below {RELIEF}°F</div>
                  <div style={{ color: C.muted }}>{p.recovery} h below {RECOVERY}°F</div>
                </div>
              );
            }} />
            <Bar isAnimationActive={false} dataKey="recovery" stackId="r" name={`below ${RECOVERY}°F`} fill={C.day} />
            <Bar isAnimationActive={false} dataKey="some" stackId="r" name={`${RECOVERY}–${RELIEF}°F`} fill={C.gold} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-2 text-xs" style={{ color: C.muted }}>
        <span><span className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: C.day }} />below {RECOVERY}°F (sleep can recover)</span>
        <span><span className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: C.gold }} />{RECOVERY}–{RELIEF}°F (some relief)</span>
      </div>
      <p className="mt-4 text-base leading-relaxed">
        In the {base.decade}, a typical {city.shortName} summer night still spent about{" "}
        <span style={{ color: C.gold, fontFamily: DISPLAY }}>{base.total} hours below {RELIEF}°F</span>
        {base.recovery > 0
          ? <>, {base.recovery} of them below the {RECOVERY}°F line where the body can actually recover</>
          : <> — but already none below the {RECOVERY}°F line where the body can actually recover</>}.
        By the {now.decade} that window has closed to{" "}
        <span style={{ color: C.ember, fontFamily: DISPLAY }}>{now.total} hour{now.total === 1 ? "" : "s"}</span>.
        {lastRecovery && <> The deep-recovery window below {RECOVERY}°F vanished after the {lastRecovery.decade}.</>}{" "}
        The desert didn't just raise the low — it took away the hours of relief that used to come with the dark.
      </p>
      <p className="text-xs mt-3" style={{ color: C.muted }}>
        Counted from each decade's average June–August night — the mean temperature at every local hour in NOAA's hourly
        archive (NCEI ISD) — so it describes a typical night, not any single one; real nights run cooler and warmer.
        {RELIEF}°F marks where overnight cooling becomes usable relief; {RECOVERY}°F is the cited sleep-recovery
        threshold from the sleep card. Same source as the diurnal curve above; rebuild with <code>analysis/build_diurnal.py</code>.
      </p>
    </Card>
  );
}
