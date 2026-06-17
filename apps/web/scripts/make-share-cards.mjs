// Per-card social share images (1200x630 PNG), one per flagship card per city.
// Mirrors make-og.mjs: hand-built SVG -> resvg PNG, deps installed --no-save, the
// PNGs are committed. Headline numbers are read live from the committed data
// assets so a rebuild can never drift from what the cards show.
//
//   npm i --no-save @resvg/resvg-js && node scripts/make-share-cards.mjs
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";

const DATA = new URL("../public/data/", import.meta.url);
const OUT = new URL("../public/share/", import.meta.url);
const SITE = "https://poetac.github.io/phoenix_nights";
// mirrors slugify() in src/ui.jsx so a landing page redirects to the card's heading anchor
const slugify = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
const load = (f) => JSON.parse(readFileSync(new URL(f, DATA)));
const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const round = (x, d = 0) => Number(x.toFixed(d));
const inDecade = (r, a, b) => r.filter((x) => x.year >= a && x.year <= b);

// palette (matches src/ui.jsx)
const C = { bg: "#141021", text: "#f2ecdf", muted: "#9b93ae", ember: "#ff6b3d",
  emberSoft: "#ffb15c", gold: "#ffd9a0", sage: "#9fd8b4", line: "#2f2750" };

const CITIES = {
  phx: { name: "Phoenix", kicker: "PHOENIX · LIVE NOAA STATION RECORD" },
  tus: { name: "Tucson", kicker: "TUCSON · LIVE NOAA STATION RECORD" },
};

// Each flagship card: pull (1970s, recent) from a committed asset. Only counts and
// shares are used — quantities a zero-baseline bar represents honestly. Temperature
// deltas (e.g. the coolest-hour rise) are deliberately excluded: bars from 0°F would
// make a real +5°F shift look negligible. Add them only with a non-zero-baseline viz.
function metrics(city) {
  const streaks = load(`${city}-streaks.json`).years;
  const cdd = load(`${city}-cdd-split.json`).years;
  const heat = load(`${city}-heat-season.json`).years;
  const share = (L) =>
    100 * L.reduce((s, x) => s + x.nightCdd, 0) /
    L.reduce((s, x) => s + x.dayCdd + x.nightCdd, 0);
  return [
    { slug: "hot-nights", unit: " nights", accent: C.ember,
      appHeading: "Nights that never dropped below 80°F",
      kicker: "Nights ≥ 80°F", title: ["Nights that never", "drop below 80°F"],
      caption: "Count of summer nights staying at or above 80°F — no overnight recovery.",
      v70: round(avg(inDecade(streaks, 1970, 1979).map((x) => x.count80))),
      now: round(avg(inDecade(streaks, 2016, 2025).map((x) => x.count80))) },
    { slug: "night-cooling", unit: "%", accent: C.emberSoft,
      appHeading: "The thermostat that never turns off",
      kicker: "Cooling demand after dark", title: ["The thermostat that", "never turns off"],
      caption: "Share of the metro's cooling-degree load that now falls overnight.",
      v70: round(share(inDecade(cdd, 1970, 1979)), 1),
      now: round(share(inDecade(cdd, 2016, 2025)), 1) },
    { slug: "hundred-days", unit: " days", accent: C.gold,
      appHeading: "Summer is annexing spring and fall",
      kicker: "Days ≥ 100°F per year", title: ["The 100°F season", "keeps stretching"],
      caption: "Days a year reaching 100°F or hotter, first-to-last.",
      v70: round(avg(inDecade(heat, 1970, 1979).map((x) => x.count))),
      now: round(avg(inDecade(heat, 2016, 2025).map((x) => x.count))) },
  ];
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function svg(city, m) {
  const { name, kicker } = CITIES[city];
  const [t1, t2] = m.title;
  // two-bar mini chart, right column, scaled to the larger value
  const max = Math.max(m.v70, m.now);
  const bx = 760, bw = 132, gap = 92, baseY = 452, maxH = 168;
  const h70 = (m.v70 / max) * maxH, hn = (m.now / max) * maxH;
  const bar = (x, h, color, val, label) => `
    <rect x="${x}" y="${baseY - h}" width="${bw}" height="${h}" rx="6" fill="${color}"/>
    <text x="${x + bw / 2}" y="${baseY - h - 16}" fill="${color}" font-size="36"
          font-weight="600" text-anchor="middle" font-variant-numeric="tabular-nums">${val}${m.unit}</text>
    <text x="${x + bw / 2}" y="${baseY + 32}" fill="${C.muted}" text-anchor="middle"
          font-family="ui-sans-serif, sans-serif" font-size="22">${label}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"
       font-family="Fraunces, Georgia, 'Times New Roman', serif">
  <defs>
    <radialGradient id="g1" cx="18%" cy="-12%" r="85%">
      <stop offset="0%" stop-color="${m.accent}" stop-opacity="0.22"/>
      <stop offset="60%" stop-color="${m.accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="${C.bg}"/>
  <rect width="1200" height="630" fill="url(#g1)"/>
  <text x="80" y="92" fill="${C.emberSoft}" font-family="ui-sans-serif, sans-serif"
        font-size="21" letter-spacing="5" font-weight="600">${esc(kicker)}</text>
  <text x="1120" y="92" fill="${C.gold}" text-anchor="end"
        font-family="ui-sans-serif, sans-serif" font-size="18" letter-spacing="1">poetac.github.io/phoenix_nights</text>
  <line x1="80" y1="116" x2="1120" y2="116" stroke="${C.line}"/>

  <text x="80" y="194" fill="${C.text}" font-size="46" font-weight="600">${esc(t1)}</text>
  <text x="80" y="248" fill="${C.text}" font-size="46" font-weight="600">${esc(t2)}</text>

  <text x="78" y="406" fill="${m.accent}" font-size="140" font-weight="600"
        font-variant-numeric="tabular-nums">${m.now}<tspan font-size="52">${m.unit}</tspan></text>
  <text x="82" y="452" fill="${C.muted}" font-family="ui-sans-serif, sans-serif"
        font-size="25">${name} now · up from ${m.v70}${m.unit} in the 1970s</text>

  ${bar(bx, h70, C.muted, m.v70, "1970s")}
  ${bar(bx + bw + gap, hn, m.accent, m.now, "now")}

  <text x="80" y="566" fill="${C.muted}" font-family="ui-sans-serif, sans-serif"
        font-size="22">${esc(m.caption)}</text>
</svg>`;
}

function landingHtml(city, m) {
  const { name } = CITIES[city];
  const img = `${SITE}/share/${city}-${m.slug}.png`;
  const page = `${SITE}/share/${city}-${m.slug}.html`;
  const target = `../?city=${city}#${slugify(m.appHeading)}`;
  const title = `${name}: ${m.appHeading}`;
  const desc = m.caption;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(title)} — Phoenix Nights</title>
<link rel="canonical" href="${page}"/>
<meta name="description" content="${esc(desc)}"/>
<meta property="og:type" content="article"/>
<meta property="og:site_name" content="Phoenix Nights"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:url" content="${page}"/>
<meta property="og:image" content="${img}"/>
<meta property="og:image:type" content="image/png"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:image:alt" content="${esc(title)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(desc)}"/>
<meta name="twitter:image" content="${img}"/>
<!-- humans are redirected into the app; crawlers read the meta above -->
<meta http-equiv="refresh" content="0; url=${target}"/>
<script>location.replace(${JSON.stringify(target)});</script>
<style>body{background:#141021;color:#9b93ae;font-family:ui-sans-serif,system-ui,sans-serif;margin:0;display:grid;place-items:center;height:100vh}a{color:#ffb15c}</style>
</head>
<body><p>Opening <a href="${target}">${esc(title)}</a>\u2026</p></body>
</html>`;
}

let n = 0;
for (const city of Object.keys(CITIES)) {
  for (const m of metrics(city)) {
    const s = svg(city, m);
    const png = new Resvg(s, { fitTo: { mode: "width", value: 1200 },
      font: { loadSystemFonts: true, defaultFontFamily: "DejaVu Serif" } }).render().asPng();
    writeFileSync(new URL(`${city}-${m.slug}.png`, OUT), png);
    writeFileSync(new URL(`${city}-${m.slug}.html`, OUT), landingHtml(city, m));
    n++;
  }
}
console.log(`wrote ${n} share cards (+ landing pages) to public/share/`);
