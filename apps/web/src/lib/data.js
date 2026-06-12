import { num } from "./stats.js";

const ACIS_URL = "https://data.rcc-acis.org/StnData";

// A year counts as complete when no element is missing more than ~10% of days.
const MAX_MISSING_DAYS = 36;

export const RURAL = {
  sid: "USC00021314",
  name: "Casa Grande National Monument",
  short: "Casa Grande NM",
  firstYear: 1948,
};

export function lastCompleteYear() {
  return new Date().getFullYear() - 1;
}

const yly = (name, reduce) => ({ name, interval: "yly", duration: "yly", reduce });

async function acis(body) {
  const r = await fetch(ACIS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("ACIS " + r.status);
  const j = await r.json();
  if (!j.data || !j.data.length) throw new Error("ACIS returned no data");
  return j;
}

export async function fetchPhoenix() {
  const endYear = lastCompleteYear();
  const j = await acis({
    sid: "PHXthr 9",
    sdate: "1896-01-01",
    edate: `${endYear}-12-31`,
    elems: [
      yly("maxt", { reduce: "mean", add: "mcnt" }),
      yly("mint", { reduce: "mean", add: "mcnt" }),
      yly("mint", "cnt_ge_80"),
      yly("cdd", "sum"),
    ],
    meta: ["name"],
  });
  const rows = j.data
    .map((d) => ({
      year: parseInt(d[0], 10),
      high: num(d[1][0]), highMiss: num(d[1][1]) ?? 366,
      low: num(d[2][0]), lowMiss: num(d[2][1]) ?? 366,
      hotNights: num(d[3]), cdd: num(d[4]),
    }))
    .filter((r2) => r2.year <= endYear && r2.high != null && r2.low != null
      && r2.highMiss <= MAX_MISSING_DAYS && r2.lowMiss <= MAX_MISSING_DAYS);
  if (rows.length < 30) throw new Error("ACIS record too short");
  return { rows, source: "acis" };
}

export async function fetchRural() {
  const endYear = lastCompleteYear();
  const j = await acis({
    sid: RURAL.sid,
    sdate: `${RURAL.firstYear}-01-01`,
    edate: `${endYear}-12-31`,
    elems: [yly("mint", { reduce: "mean", add: "mcnt" })],
    meta: ["name"],
  });
  const rows = j.data
    .map((d) => ({ year: parseInt(d[0], 10), low: num(d[1][0]), lowMiss: num(d[1][1]) ?? 366 }))
    .filter((r2) => r2.year <= endYear && r2.low != null && r2.lowMiss <= MAX_MISSING_DAYS);
  if (rows.length < 30) throw new Error("rural record too short");
  return rows;
}

export async function fetchOpenMeteo() {
  const endYear = lastCompleteYear();
  const u =
    "https://archive-api.open-meteo.com/v1/archive?latitude=33.4278&longitude=-112.0037" +
    `&start_date=1948-01-01&end_date=${endYear}-12-31` +
    "&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=America%2FPhoenix";
  const r = await fetch(u);
  if (!r.ok) throw new Error("Open-Meteo " + r.status);
  const j = await r.json();
  const t = j.daily.time, mx = j.daily.temperature_2m_max, mn = j.daily.temperature_2m_min;
  const by = {};
  for (let i = 0; i < t.length; i++) {
    if (mx[i] == null || mn[i] == null) continue;
    const y = +t[i].slice(0, 4);
    if (!by[y]) by[y] = { hs: 0, ls: 0, n: 0, hot: 0, cdd: 0 };
    const b = by[y];
    b.hs += mx[i]; b.ls += mn[i]; b.n++;
    if (mn[i] >= 80) b.hot++;
    const m = (mx[i] + mn[i]) / 2;
    if (m > 65) b.cdd += m - 65;
  }
  const rows = Object.keys(by).map((y) => {
    const b = by[y];
    return { year: +y, high: b.hs / b.n, low: b.ls / b.n, hotNights: b.hot, cdd: Math.round(b.cdd) };
  }).filter((r2) => r2.year <= endYear).sort((a, b) => a.year - b.year);
  return { rows, source: "openmeteo" };
}
