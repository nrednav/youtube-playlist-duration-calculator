import { defineConfig, loadEnv } from "vite";
import webExtension, { readJsonFile } from "vite-plugin-web-extension";

function generateManifest() {
  const manifest = readJsonFile("src/manifest.json");
  const pkg = readJsonFile("package.json");
  return {
    version: pkg.version,
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
            "https://www.youtube.com/playlist?list=PLAhTBeRe8IhMmRve_rSfAgL_dtEXkKh8Z"
          ]
        }
      })
    ],
    build: {
      sourcemap: "inline"
    }
  };
});
