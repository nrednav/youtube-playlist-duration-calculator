import { defineConfig } from "vite";
import webExtension, { readJsonFile } from "vite-plugin-web-extension";

function generateManifest() {
  const manifest = readJsonFile("src/manifest.json");
  const pkg = readJsonFile("package.json");
  return {
    version: pkg.version,
    ...manifest,
  };
}

export default defineConfig({
  plugins: [
    webExtension({
      manifest: generateManifest,
      watchFilePaths: ["package.json", "src/manifest.json"],
      browser: process.env.TARGET_BROWSER || "chrome",
      webExtConfig: {
        startUrl: [
          "https://www.youtube.com/playlist?list=PLaAVDbMg_XArcet5lwcRo12Fh9JrGKydh",
        ],
      },
    }),
  ],
  build: {
    sourcemap: true,
  },
});
