import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  define: {
    global: "globalThis",
  },
  plugins: [react()],
  server: {
    proxy: {
      "/auth": "http://localhost:4000",
      "/internal": "http://localhost:4000",
      "/campaigns": "http://localhost:4000",
      "/donations": "http://localhost:4000",
      "/milestones": "http://localhost:4000",
      "/ledger": "http://localhost:4000",
      "/stats": "http://localhost:4000",
      "/health": "http://localhost:4000",
    },
  },
});
