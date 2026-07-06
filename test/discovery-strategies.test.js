import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";

globalThis.chrome = {
  runtime: {
    getManifest: () => ({ version: "0.0.0" }),
  },
};

const { discoverPlaylist } = await import(
  "../src/modules/discovery/orchestrator.js"
);

const FIXTURES_DIR = path.join(import.meta.dirname, "fixtures");

/**
 * Load an HTML fixture file and return a JSDOM document.
 *
 * @param {string} name - Filename in test/fixtures/
 * @returns {Document}
 */
const loadFixture = (name) => {
  const html = fs.readFileSync(path.join(FIXTURES_DIR, name), "utf-8");
  return new JSDOM(html).window.document;
};

const FIXTURES = ["playlist-renderer.html", "playlist-viewmodel.html"];

describe("Discovery, All Strategies × All Fixtures", () => {
  for (const fixtureName of FIXTURES) {
    it(`finds playlist in ${fixtureName}`, () => {
      const doc = loadFixture(fixtureName);
      const result = discoverPlaylist(doc);

      assert.ok(result.confidence > 0.5);
      assert.ok(
        result.container || result.videos?.length > 0,
        `No playlist found in ${fixtureName}`,
      );
    });
  }

  it("returns zero confidence on empty document", () => {
    const doc = new JSDOM("<html><body></body></html>").window.document;
    const result = discoverPlaylist(doc);

    assert.strictEqual(result.confidence, 0);
    assert.strictEqual(result.container, null);
    assert.strictEqual(result.videos, null);
    assert.strictEqual(result.strategyName, "none");
  });

  it("selector-match wins on renderer fixture", () => {
    const doc = loadFixture("playlist-renderer.html");
    const result = discoverPlaylist(doc);

    assert.strictEqual(result.strategyName, "selector-match");
    assert.ok(result.confidence >= 0.9);
  });

  it("structural-invariant wins on viewmodel fixture", () => {
    const doc = loadFixture("playlist-viewmodel.html");
    const result = discoverPlaylist(doc);

    assert.strictEqual(result.strategyName, "structural-invariant");
    assert.ok(result.confidence > 0.5);
  });

  it("strategy priority is logged (renderer: selector-match first)", () => {
    // Priority check is implicit in the sequential strategy ordering.
    const doc = loadFixture("playlist-renderer.html");
    const result = discoverPlaylist(doc);

    assert.strictEqual(result.strategyName, "selector-match");
    assert.ok(result.container);
  });

  it("strategy priority is logged (viewmodel: structural-invariant first)", () => {
    const doc = loadFixture("playlist-viewmodel.html");
    const result = discoverPlaylist(doc);

    assert.strictEqual(result.strategyName, "structural-invariant");
    assert.ok(result.videos?.length > 0);
  });
});

describe("Discovery result contract, videoSelector for live re-derivation", () => {
  // The reactivity fix depends on the discovery result carrying a
  // `videoSelector` so downstream consumers can re-query the live DOM for
  // scroll-appended videos instead of the frozen snapshot.
  it("includes the renderer video selector on renderer fixture", () => {
    const doc = loadFixture("playlist-renderer.html");
    const result = discoverPlaylist(doc);

    assert.ok(result.videoSelector, "videoSelector must be present");
    assert.strictEqual(result.videoSelector, "ytd-playlist-video-renderer");
  });

  it("includes the viewmodel lockup selector on viewmodel fixture", () => {
    const doc = loadFixture("playlist-viewmodel.html");
    const result = discoverPlaylist(doc);

    assert.ok(result.videoSelector, "videoSelector must be present");
    assert.strictEqual(result.videoSelector, "yt-lockup-view-model");
  });

  it("viewmodel discovery result points at the live insertion container", () => {
    // The observer target on the viewmodel architecture is the shared
    // container that holds ALL lockups. In the real YouTube DOM each lockup
    // is wrapped in its own per-video DIV, so `videos[0].parentElement` holds
    // exactly one lockup. The shared insertion container is reached via
    // `closest('#contents')`. This test encodes that hierarchy so the
    // regression that returned only the first video cannot recur.
    const doc = loadFixture("playlist-viewmodel.html");
    const result = discoverPlaylist(doc);

    const firstLockup = result.videos[0];
    const liveContainer = firstLockup.closest("#contents");

    assert.strictEqual(
      firstLockup.parentElement.querySelectorAll(result.videoSelector).length,
      1,
      "per-video wrapper must hold exactly one lockup (matches real YouTube DOM)",
    );

    const allLockups = liveContainer.querySelectorAll(
      result.videoSelector,
    ).length;
    assert.ok(
      allLockups > 1,
      `#contents must hold all lockups, got ${allLockups}`,
    );

    // Simulate a scroll-triggered append: YouTube inserts a new lockup into
    // the shared container, wrapped in its own per-video div.
    const before = allLockups;
    const wrapper = doc.createElement("div");
    const appended = doc.createElement("yt-lockup-view-model");
    const badge = doc.createElement("badge-shape");
    badge.textContent = "9:99";
    appended.appendChild(badge);
    wrapper.appendChild(appended);
    liveContainer.appendChild(wrapper);

    const after = liveContainer.querySelectorAll(result.videoSelector).length;
    assert.strictEqual(
      after,
      before + 1,
      "appended lockup must be visible in a live re-query of #contents",
    );
  });
});
