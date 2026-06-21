import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// One index.html, two products. The shared template carries __META_*__ tokens; this
// plugin fills them at build time from the active product (VITE_PRODUCT) so the root
// (City Signals, the worldwide per-city explorer) and /desert/ (Desert Nights, the
// curated arid-West thesis) each ship correct title / description / social-card meta.
const SITE = "https://poetac.github.io/phoenix_nights";
const META = {
  explorer: {
    url: `${SITE}/`,
    title: "City Signals — every city's climate, in its own words",
    desc: "The official station record for each city, read for the one trend that stands out most — overnight lows racing ahead across the US, the day–night gap flipping the other way on Sydney Harbour, and more.",
    siteName: "City Signals",
    ogTitle: "City Signals — every city has its own climate signal",
    ogDesc: "Each city's distinctive climate trend, straight from the official station record — NOAA across the US, NCEI GSOY worldwide.",
    image: "og-citysignals.svg",
    imageType: "image/svg+xml",
    alt: "City Signals — every city has its own climate signal",
  },
  desert: {
    url: `${SITE}/desert/`,
    title: "Desert Nights — the desert still cools off at night. The city doesn't.",
    desc: "The official NOAA station record shows Phoenix's overnight lows abandoning their history faster than its highs. See the real trend, not the rolling 'normal'.",
    siteName: "Desert Nights",
    ogTitle: "The desert still cools off at night. The city doesn't.",
    ogDesc: "Phoenix's overnight lows are abandoning their history faster than its highs — measured against a fixed 1970s baseline, straight from the NOAA station record.",
    image: "og.png",
    imageType: "image/png",
    alt: "The desert still cools off at night. The city doesn't.",
  },
};
function productMeta() {
  const m = META[process.env.VITE_PRODUCT === "desert" ? "desert" : "explorer"];
  const tokens = {
    __META_URL__: m.url,
    __META_TITLE__: m.title,
    __META_DESC__: m.desc,
    __META_SITENAME__: m.siteName,
    __META_OGTITLE__: m.ogTitle,
    __META_OGDESC__: m.ogDesc,
    __META_OGIMAGE_URL__: `${SITE}/${m.image}`,
    __META_OGIMAGE_TYPE__: m.imageType,
    __META_OGALT__: m.alt,
  };
  return {
    name: "product-meta",
    transformIndexHtml(html) {
      return html.replace(/__META_[A-Z_]+__/g, (t) => tokens[t] ?? t);
    },
  };
}

export default defineConfig({
  plugins: [productMeta(), react(), tailwindcss()],
  build: {
    // recharts is the heavy dependency; keep it in its own chunk separate from
    // react so it is pulled only by the lazy DashboardBody, not the shell.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Pin react into an eager, rarely-changing chunk. recharts is left
          // unpinned so it auto-splits into the dynamically-imported
          // DashboardBody chunk — off the initial critical path.
          if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) {
            return "react";
          }
        },
      },
    },
  },
});
