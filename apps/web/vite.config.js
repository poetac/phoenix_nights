import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
