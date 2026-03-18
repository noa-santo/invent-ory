import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Tauri expects a fixed port; fail if port is not available
  server: {
    port: 1420,
    strictPort: true,
    clearScreen: false,
  },
  // Provide env variables explicitly to avoid issues
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    // Tauri supports es2021
    target: ["es2021", "chrome100", "safari13"],
    // Minify in production
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    // Produce sourcemaps in debug mode
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
