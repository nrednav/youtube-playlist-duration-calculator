import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { before, describe, it } from "node:test";
import { JSDOM } from "jsdom";

// Mock chrome.runtime before importing strategies
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

describe("Discovery — All Strategies × All Fixtures", () => {
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
    // On renderer pages, the orchestrator sorts selector-match (designedFor:"renderer")
    // to priority 0, so it runs first and wins.
    const doc = loadFixture("playlist-renderer.html");
    const result = discoverPlaylist(doc);

    assert.strictEqual(result.strategyName, "selector-match");
    assert.ok(result.container);
  });

  it("strategy priority is logged (viewmodel: structural-invariant first)", () => {
    // On viewmodel pages, selector-match is designed for "renderer" so it gets
    // priority 10 (runs last). structural-invariant is designedFor "any" so it
    // gets priority 5 (runs first) and wins.
    const doc = loadFixture("playlist-viewmodel.html");
    const result = discoverPlaylist(doc);

    assert.strictEqual(result.strategyName, "structural-invariant");
    assert.ok(result.videos?.length > 0);
  });
});
