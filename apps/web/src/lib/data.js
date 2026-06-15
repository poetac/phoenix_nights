import { num } from "./stats.js";

const ACIS_URL = "https://data.rcc-acis.org/StnData";

// A year counts as complete when no element is missing more than ~10% of days;
// a month when it is missing no more than 6.
const MAX_MISSING_DAYS = 36;
const MAX_MISSING_MONTH = 6;

export function lastCompleteYear() {
  return new Date().getFullYear() - 1;
}

const yly = (name, reduce) => ({ name, interval: "yly", duration: "yly", reduce });
const mly = (name) => ({ name, interval: "mly", duration: "mly", reduce: { reduce: "mean", add: "mcnt" } });

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

export async function fetchCityYearly(city) {
  const endYear = lastCompleteYear();
  const j = await acis({
    sid: city.threadSid,
    sdate: city.recordStart,
    edate: `${endYear}-12-31`,
    elems: [
      yly("maxt", { reduce: "mean", add: "mcnt" }),
      yly("mint", { reduce: "mean", add: "mcnt" }),
      yly("mint", "cnt_ge_80"),
      yly("mint", "cnt_ge_90"),
      yly("maxt", "cnt_ge_110"),
      yly("cdd", "sum"),
      yly("mint", "max"),
      yly("mint", "min"),
    ],
    meta: ["name"],
  });
  const rows = j.data
    .map((d) => ({
      year: parseInt(d[0], 10),
      high: num(d[1][0]), highMiss: num(d[1][1]) ?? 366,
      low: num(d[2][0]), lowMiss: num(d[2][1]) ?? 366,
      hotNights: num(d[3]), nights90: num(d[4]), days110: num(d[5]), cdd: num(d[6]),
      // the year's single warmest and coldest overnight lows — the ceiling and
      // floor of nighttime relief
      warmLow: num(d[7]), coldLow: num(d[8]),
    }))
    .filter((r2) => r2.year <= endYear && r2.high != null && r2.low != null
      && r2.highMiss <= MAX_MISSING_DAYS && r2.lowMiss <= MAX_MISSING_DAYS);
  if (rows.length < 30) throw new Error("ACIS record too short");
  return { rows, source: "acis" };
}

export async function fetchRural(city) {
  const endYear = lastCompleteYear();
  const j = await acis({
    sid: city.rural.sid,
    sdate: `${city.rural.firstYear}-01-01`,
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

// Meteorological seasons; December belongs to the following year's winter.
const SEASON_OF_MONTH = {
  12: "DJF", 1: "DJF", 2: "DJF", 3: "MAM", 4: "MAM", 5: "MAM",
  6: "JJA", 7: "JJA", 8: "JJA", 9: "SON", 10: "SON", 11: "SON",
};
export const SEASONS = [
  { key: "DJF", label: "Winter", months: "Dec–Feb" },
  { key: "MAM", label: "Spring", months: "Mar–May" },
  { key: "JJA", label: "Summer", months: "Jun–Aug" },
  { key: "SON", label: "Fall", months: "Sep–Nov" },
];

export async function fetchSeasonal(city) {
  const endYear = lastCompleteYear();
  const j = await acis({
    sid: city.threadSid,
    sdate: city.recordStart.slice(0, 7),
    edate: `${endYear}-12`,
    elems: [mly("mint"), mly("maxt")],
  });
  // (seasonYear, season) -> {month: {low, high}}
  const grouped = new Map();
  for (const row of j.data) {
    const [lo, loMiss] = row[1];
    const [hi, hiMiss] = row[2];
    if (lo === "M" || hi === "M" || num(loMiss) > MAX_MISSING_MONTH || num(hiMiss) > MAX_MISSING_MONTH) continue;
    const y = parseInt(row[0].slice(0, 4), 10);
    const m = parseInt(row[0].slice(5, 7), 10);
    const seasonYear = m === 12 ? y + 1 : y;
    if (seasonYear > endYear) continue;
    const key = seasonYear + SEASON_OF_MONTH[m];
    if (!grouped.has(key)) grouped.set(key, { year: seasonYear, season: SEASON_OF_MONTH[m], months: [] });
    grouped.get(key).months.push({ low: num(lo), high: num(hi) });
  }
  const out = { DJF: [], MAM: [], JJA: [], SON: [] };
  for (const g of grouped.values()) {
    if (g.months.length !== 3) continue;
    out[g.season].push({
      year: g.year,
      low: g.months.reduce((s, m) => s + m.low, 0) / 3,
      high: g.months.reduce((s, m) => s + m.high, 0) / 3,
    });
  }
  for (const k of Object.keys(out)) out[k].sort((a, b) => a.year - b.year);
  if (out.JJA.length < 30) throw new Error("seasonal record too short");
  return out;
}

async function fetchAsset(path) {
  const r = await fetch(import.meta.env.BASE_URL + path);
  if (!r.ok) throw new Error("asset " + path + " " + r.status);
  return r.json();
}

export async function fetchDiurnal(city) {
  if (!city.diurnalAsset) return null;
  const j = await fetchAsset(city.diurnalAsset);
  if (!j.decades || Object.keys(j.decades).length < 2) throw new Error("diurnal asset too thin");
  return j;
}

export async function fetchHeatSeason(city) {
  if (!city.heatSeasonAsset) return null;
  const j = await fetchAsset(city.heatSeasonAsset);
  if (!j.years || j.years.length < 30) throw new Error("heat-season asset too thin");
  return j;
}

export async function fetchHeatDeaths(city) {
  if (!city.heatDeathsAsset) return null;
  const j = await fetchAsset(city.heatDeathsAsset);
  if (!j.series || j.series.length < 5) throw new Error("heat-deaths asset too thin");
  return j;
}

export async function fetchStreaks(city) {
  if (!city.streaksAsset) return null;
  const j = await fetchAsset(city.streaksAsset);
  if (!j.years || j.years.length < 30) throw new Error("streaks asset too thin");
  return j;
}

export async function fetchGrid(city) {
  if (!city.gridAsset) return null;
  const j = await fetchAsset(city.gridAsset);
  if (!j.years || Object.keys(j.years).length < 4) throw new Error("grid asset too thin");
  return j;
}

export async function fetchOpenMeteo(city) {
  const endYear = lastCompleteYear();
  const [lat, lon] = city.latLon;
  const u =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
    `&start_date=1948-01-01&end_date=${endYear}-12-31` +
    "&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto";
  const r = await fetch(u);
  if (!r.ok) throw new Error("Open-Meteo " + r.status);
  const j = await r.json();
  const t = j.daily.time, mx = j.daily.temperature_2m_max, mn = j.daily.temperature_2m_min;
  const by = {};
  for (let i = 0; i < t.length; i++) {
    if (mx[i] == null || mn[i] == null) continue;
    const y = +t[i].slice(0, 4);
    if (!by[y]) by[y] = { hs: 0, ls: 0, n: 0, hot: 0, hot90: 0, d110: 0, cdd: 0, warm: -Infinity, cold: Infinity };
    const b = by[y];
    b.hs += mx[i]; b.ls += mn[i]; b.n++;
    if (mn[i] >= 80) b.hot++;
    if (mn[i] >= 90) b.hot90++;
    if (mx[i] >= 110) b.d110++;
    if (mn[i] > b.warm) b.warm = mn[i];
    if (mn[i] < b.cold) b.cold = mn[i];
    const m = (mx[i] + mn[i]) / 2;
    if (m > 65) b.cdd += m - 65;
  }
  const rows = Object.keys(by).map((y) => {
    const b = by[y];
    return {
      year: +y, high: b.hs / b.n, low: b.ls / b.n,
      hotNights: b.hot, nights90: b.hot90, days110: b.d110, cdd: Math.round(b.cdd),
      warmLow: b.warm, coldLow: b.cold,
    };
  }).filter((r2) => r2.year <= endYear).sort((a, b) => a.year - b.year);
  return { rows, source: "openmeteo" };
}
