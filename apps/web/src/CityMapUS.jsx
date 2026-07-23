import { US_MAP } from "./lib/usMap.js";
import CityMapView from "./CityMapView.jsx";

// Desert Nights' map, and City Signals' fallback before the world map is
// generated (see CityMapWorld.jsx). The only file that imports usMap.js.
export default function CityMapUS(props) {
  return <CityMapView {...props} MAP={US_MAP} useWorld={false} />;
}
