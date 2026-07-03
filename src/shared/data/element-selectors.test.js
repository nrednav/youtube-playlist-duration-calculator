import assert from "node:assert";
import { describe, it } from "node:test";
import { desyncIndicators } from "./element-selectors.js";

// Minimal DOM mock for testing element selectors
const createMockDoc = (elements = {}) => ({
  querySelector(selector) {
    return elements[selector] || null;
  },
});

describe("desyncIndicators", () => {
  it("detectVariant returns { known, variant } object with empty doc", () => {
    const doc = createMockDoc();
    const result = desyncIndicators.detectVariant(doc);
    assert.ok("known" in result);
    assert.ok("variant" in result);
    assert.strictEqual(typeof result.known, "boolean");
    assert.strictEqual(typeof result.variant, "string");
  });

  it("returns unknown when no YouTube elements exist", () => {
    const doc = createMockDoc();
    const result = desyncIndicators.detectVariant(doc);
    assert.strictEqual(result.variant, "unknown");
    assert.strictEqual(result.known, false);
  });

  it("returns renderer variant when ytd-playlist-video-list-renderer exists", () => {
    const doc = createMockDoc({
      "ytd-playlist-video-list-renderer": {},
    });
    const result = desyncIndicators.detectVariant(doc);
    assert.strictEqual(result.variant, "renderer");
    assert.strictEqual(result.known, true);
  });

  it("returns viewmodel variant when lockup exists but renderer does not", () => {
    const doc = createMockDoc({
      "yt-lockup-view-model": {},
    });
    const result = desyncIndicators.detectVariant(doc);
    assert.strictEqual(result.variant, "viewmodel");
    assert.strictEqual(result.known, true);
  });
});
