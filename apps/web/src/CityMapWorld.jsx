import { lazy, Suspense } from "react";
import { WORLD_MAP } from "./lib/worldMap.js";
import CityMapView from "./CityMapView.jsx";

// City Signals' map — the only file that imports worldMap.js. Before the "Build
// world map" Action has generated it, WORLD_MAP.cities is empty and City Signals
// falls back to the US map; that fallback is a LAZY import, not a static one, so
// the common (already-generated) case never fetches CityMapUS's chunk at all —
// that's what keeps this product-split's byte savings real. Never change this
// back to a top-level `import CityMapUS from "./CityMapUS.jsx"`.
const CityMapUS = lazy(() => import("./CityMapUS.jsx"));

export default function CityMapWorld(props) {
  if (!WORLD_MAP?.cities) {
    return (
      <Suspense fallback={null}>
        <CityMapUS {...props} />
      </Suspense>
    );
  }
  return <CityMapView {...props} MAP={WORLD_MAP} useWorld={true} />;
}
