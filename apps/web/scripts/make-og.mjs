// Rasterize the social card SVG to PNG. Facebook and Twitter/X ignore SVG
// og:images, so we ship a committed PNG; Slack/Discord/LinkedIn use either.
//
// One-off (the dep is intentionally not in package.json — the PNG is committed):
//   npm i --no-save @resvg/resvg-js && node scripts/make-og.mjs
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";

const svg = readFileSync(new URL("../public/og.svg", import.meta.url));
const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  font: { loadSystemFonts: true, defaultFontFamily: "DejaVu Serif" },
});
const png = resvg.render().asPng();
const out = new URL("../public/og.png", import.meta.url);
writeFileSync(out, png);
console.log("wrote public/og.png —", png.length, "bytes");
