import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import CityDashboard from "./CityDashboard.jsx";
import { PHOENIX } from "./lib/cities.js";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <CityDashboard city={PHOENIX} />
  </StrictMode>
);
