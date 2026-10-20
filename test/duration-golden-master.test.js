import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";

globalThis.chrome = {
  runtime: { getManifest: () => ({ version: "0.0.0" }) },
};

const { extractTimestamp } = await import(
  "../src/modules/extraction/orchestrator.js"
);

const FIXTURES_DIR = path.join(import.meta.dirname, "fixtures", "real");

// Every fixture in the corpus with the number of seconds the playlist total
// sums for that item. The total is the number users read, so these values are
// the contract that a refactor of the read path must not move.
const GOLDEN = {
  "renderer-video-item-live.html": null,
  "renderer-video-item-normal.html": 931,
  "renderer-video-item-unavailable-deleted.html": null,
  "renderer-video-item-unavailable-private.html": null,
  "renderer-video-item-upcoming.html": null,
  "viewmodel-video-item-live.html": null,
  "viewmodel-video-item-normal.html": 1760,
  "viewmodel-video-item-unavailable.html": null,
  "viewmodel-video-item-upcoming.html": null,
};

const VIDEO_SELECTOR = "ytd-playlist-video-renderer, yt-lockup-view-model";

const loadFixture = (file) => {
  const html = fs.readFileSync(path.join(FIXTURES_DIR, file), "utf-8");
  const dom = new JSDOM(html);

  Object.defineProperty(dom.window.HTMLElement.prototype, "innerText", {
    get() {
      return this.textContent;
    },
    configurable: true,
  });

  return dom.window.document;
};

describe("duration extraction golden master", () => {
  for (const [file, expectedSeconds] of Object.entries(GOLDEN)) {
    it(`${file} sums ${String(expectedSeconds)} seconds`, () => {
      const video = loadFixture(file).querySelector(VIDEO_SELECTOR);

      assert.strictEqual(extractTimestamp(video).seconds, expectedSeconds);
    });
  }

  it("sums the same total across the whole corpus", () => {
    const total = Object.keys(GOLDEN).reduce(
      (sum, file) =>
        sum +
        (extractTimestamp(loadFixture(file).querySelector(VIDEO_SELECTOR))
          .seconds ?? 0),
      0,
    );

    assert.strictEqual(total, 2691);
  });
});
