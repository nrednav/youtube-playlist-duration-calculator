import { defineConfig, loadEnv } from "vite";
import webExtension, { readJsonFile } from "vite-plugin-web-extension";

function generateManifest() {
  const manifest = readJsonFile("src/manifest.json");
  const pkg = readJsonFile("package.json");
  return {
    version: pkg.version.split("-")[0],
    ...manifest
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".");
  return {
    plugins: [
      webExtension({
        manifest: generateManifest,
        watchFilePaths: ["package.json", "src/manifest.json"],
        browser: env.VITE_TARGET_BROWSER || "chrome",
        webExtConfig: {
          startUrl: [
            "https://www.youtube.com/playlist?list=PLAhTBeRe8IhMmRve_rSfAgL_dtEXkKh8Z",
            "https://www.youtube.com/playlist?list=PLrtg3MOb7tvG9h9rll5V9O96owfcBpROG",
            "https://www.youtube.com/playlist?list=PLBsP89CPrMePWBCMIp0naluIz67UwRX9B",
            "https://www.youtube.com/playlist?list=PLBsP89CPrMeM2MmF4suOeT0vsic9nEC2Y",
            "https://www.youtube.com/playlist?list=PL3HWFB6aFvWBXGsbVJhJJK1ykcqlVz5lI"
          ]
        }
      })
    ],
    build: {
      sourcemap: "inline",
      outDir: "dist",
      emptyOutDir: true
    }
  };
});
