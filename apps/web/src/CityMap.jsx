import { lazy, Suspense } from "react";

// Picks ONE of the two map geometries by product, so only the active product's
// map data ever hits the network — City Signals never fetches usMap.js (~42 KB
// gz), Desert Nights never fetches worldMap.js (~54 KB gz). Both stay reachable
// dynamic-import targets in the built dist/ (the ?product= override still works),
// only the actual fetch is product-conditional — the same pattern CityDashboard.jsx
// uses for DashboardBody vs SignalsBody.
const CityMapWorld = lazy(() => import("./CityMapWorld.jsx"));
const CityMapUS = lazy(() => import("./CityMapUS.jsx"));

export default function CityMap(props) {
  const useWorld = props.product?.id === "explorer";
  return (
    <Suspense fallback={null}>
      {useWorld ? <CityMapWorld {...props} /> : <CityMapUS {...props} />}
    </Suspense>
  );
}
