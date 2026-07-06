import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";

// Mock chrome.runtime before importing strategies
globalThis.chrome = {
  runtime: {
    getManifest: () => ({ version: "0.0.0" }),
  },
};

const { extractTimestamp } = await import(
  "../src/modules/extraction/orchestrator.js"
);

const FIXTURES_DIR = path.join(import.meta.dirname, "fixtures");

/**
 * Load an HTML fixture file and return a list of video elements.
 * Video renderers for the renderer fixture, lockups for the viewmodel fixture.
 *
 * @param {string} name - Filename in test/fixtures/
 * @param {string} selector - CSS selector for video elements
 * @returns {Element[]}
 */
const getVideosFromFixture = (name, selector) => {
  const html = fs.readFileSync(path.join(FIXTURES_DIR, name), "utf-8");
  const doc = new JSDOM(html).window.document;
  return [...doc.querySelectorAll(selector)];
};

describe("Extraction, All Strategies × All Fixtures", () => {
  it("extracts all timestamps from renderer fixture via selector-match", () => {
    const videos = getVideosFromFixture(
      "playlist-renderer.html",
      "ytd-playlist-video-renderer",
    );

    assert.ok(videos.length >= 3);

    for (const video of videos) {
      const result = extractTimestamp(video);

      assert.ok(
        result.seconds !== null,
        `Expected timestamp for ${video.textContent?.slice(0, 30)}`,
      );
      assert.ok(
        result.confidence > 0,
        "Expected confidence > 0 for renderer video",
      );
      assert.strictEqual(result.strategyName, "selector-match");
    }
  });

  it("extracts all timestamps from viewmodel fixture via content-pattern", () => {
    const videos = getVideosFromFixture(
      "playlist-viewmodel.html",
      "yt-lockup-view-model",
    );

    assert.ok(videos.length >= 3);

    for (const video of videos) {
      const result = extractTimestamp(video);

      assert.ok(
        result.seconds !== null,
        `Expected timestamp for ${video.textContent?.slice(0, 30)}`,
      );
      assert.ok(
        result.confidence > 0,
        "Expected confidence > 0 for viewmodel lockup",
      );
      assert.strictEqual(result.strategyName, "content-pattern");
    }
  });

  it("returns correct seconds values for known timestamps (renderer)", () => {
    const videos = getVideosFromFixture(
      "playlist-renderer.html",
      "ytd-playlist-video-renderer",
    );

    // 12:34 = 754 seconds
    const result0 = extractTimestamp(videos[0]);
    assert.strictEqual(result0.seconds, 754);
    assert.strictEqual(result0.confidence, 1.0);

    // 1:23:45 = 5025 seconds
    const result2 = extractTimestamp(videos[2]);
    assert.strictEqual(result2.seconds, 5025);
  });

  it("returns correct seconds values for known timestamps (viewmodel)", () => {
    const videos = getVideosFromFixture(
      "playlist-viewmodel.html",
      "yt-lockup-view-model",
    );

    // 12:34 = 754 seconds
    const result0 = extractTimestamp(videos[0]);
    assert.strictEqual(result0.seconds, 754);

    // 1:15:30 = 4530 seconds
    const result2 = extractTimestamp(videos[2]);
    assert.strictEqual(result2.seconds, 4530);
  });

  it("returns null for element with no timestamp", () => {
    const doc = new JSDOM("<div>No timestamp here</div>").window.document;
    const el = doc.querySelector("div");

    const result = extractTimestamp(el);
    assert.strictEqual(result.seconds, null);
    assert.strictEqual(result.confidence, 0);
    assert.strictEqual(result.strategyName, "none");
  });

  it("returns null for a Live stream (non-duration timestamp text)", () => {
    // The timestamp element exists but its text is not a duration (e.g.
    // "Live"). Previously this returned value:"0", confidence:0.5, which
    // polluted the total (adding 0) and the error bound (adding a full
    // worst-case per-video error). It must now return null so the video
    // is excluded from both.
    const html = `
      <ytd-playlist-video-renderer>
        <ytd-thumbnail-overlay-time-status-renderer>Live</ytd-thumbnail-overlay-time-status-renderer>
      </ytd-playlist-video-renderer>
    `;
    const doc = new JSDOM(html).window.document;
    const el = doc.querySelector("ytd-playlist-video-renderer");

    const result = extractTimestamp(el);
    assert.strictEqual(result.seconds, null);
    assert.strictEqual(result.confidence, 0);
  });
});
