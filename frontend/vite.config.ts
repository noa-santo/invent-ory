import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Prevent Vite from printing the URL since Tauri does that
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    // Use the Tauri dev host for HMR when building for mobile/remote targets
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : undefined,
    watch: {
      // Tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  // Pass VITE_ and TAURI_ENV_ prefixed env vars to the frontend
  envPrefix: ["VITE_", "TAURI_ENV_"],
  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS/Linux
    target:
      process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    // Minify in production; keep readable in debug
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    // Produce sourcemaps in debug mode
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
