import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Unlike client/vite.config.js (the desktop app), there's no /api proxy
// here — the Android build talks to Gemini directly from the WebView via
// src/lib/llm.js, since there's no separate server process on the phone.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
  },
  build: {
    outDir: "dist",
  },
});
