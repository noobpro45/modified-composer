import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import "vite-react-ssg";
import ortPkg from "./node_modules/onnxruntime-web/package.json";
import { writeSeoAssets } from "./scripts/build-seo-assets";
import pkg from "./package.json";

const SITE_ORIGIN = "https://composer.betterlyrics.org";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __ORT_VERSION__: JSON.stringify(ortPkg.version),
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
    conditions: ["onnxruntime-web-use-extern-wasm", "import", "module", "browser", "default"],
  },
  server: {
    proxy: {
      "/audio": "http://localhost:7777",
      "/thumb": "http://localhost:7777",
      "/health": "http://localhost:7777",
      "/boidu-lyrics": {
        target: "https://lyrics-api.boidu.dev",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/boidu-lyrics/, ""),
        headers: {
          Origin: "https://composer.betterlyrics.org",
          Referer: "https://composer.betterlyrics.org/",
        },
      },
      "/composer-models": {
        target: "https://models.composer.dacubeking.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/composer-models/, ""),
        headers: {
          Origin: "https://composer.betterlyrics.org",
          Referer: "https://composer.betterlyrics.org/",
        },
      },
    },
  },
  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: ["onnxruntime-web"],
  },
  ssgOptions: {
    formatting: "none",
    crittersOptions: false,
    async onFinished(outDir) {
      await writeSeoAssets(outDir, SITE_ORIGIN);
    },
  },
});
