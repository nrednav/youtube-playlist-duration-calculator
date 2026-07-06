import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";

// Mock chrome before importing any module that may touch chrome.i18n.
// The views extractor delegates to locale parsers. On a non-en locale
// chrome.i18n is not consulted by the parser itself, but importing
// sort-by-views/parsers/index.js does not require it. Set lang on the
// fixture document to drive locale selection.
import { extractViews } from "./views-extraction.js";

const FIXTURES_DIR = path.join(
  import.meta.dirname,
  "../../../test/fixtures/real",
);

/**
 * Load a real-world single-video-item fixture and return the video element
 * with the document lang set, so locale dispatch resolves correctly.
 */
const loadVideo = (file, selector, lang = "en") => {
  const html = fs.readFileSync(path.join(FIXTURES_DIR, file), "utf-8");
  const dom = new JSDOM(html);
  dom.window.document.documentElement.lang = lang;
  return dom.window.document.querySelector(selector);
};

const RENDERER_SELECTOR = "ytd-playlist-video-renderer";
const VIEWMODEL_SELECTOR = "yt-lockup-view-model";

describe("extractViews, structural-invariant contract (en)", () => {
  // The views datum is located by structural invariant. The
  // metadata text fragment containing the substring "views" (and NOT
  // "watching"). YouTube cannot render a view count without a digit
  // sequence and the locale-specific word for "views". The locale
  // parsers already encode the suffix and word logic. The migration changes
  // only the input shape (element -> string), preserving the locale
  // contract that the existing renderer-only code relied on.

  it("extracts views from a renderer normal video item (en)", () => {
    const video = loadVideo(
      "renderer-video-item-normal.html",
      RENDERER_SELECTOR,
    );
    const result = extractViews(video);
    assert.ok(result.value !== null, "must extract a number");
    assert.strictEqual(result.value, 5_700_000);
    assert.ok(result.confidence > 0);
  });

  it("extracts views from a viewmodel normal video item (en)", () => {
    const video = loadVideo(
      "viewmodel-video-item-normal.html",
      VIEWMODEL_SELECTOR,
    );
    const result = extractViews(video);
    assert.strictEqual(result.value, 1_700_000);
    assert.ok(result.confidence > 0);
  });

  it("returns null with zero confidence for a live video (watching, not views)", () => {
    const video = loadVideo(
      "viewmodel-video-item-live.html",
      VIEWMODEL_SELECTOR,
    );
    const result = extractViews(video);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.confidence, 0);
  });

  it("returns null with zero confidence for an unavailable video (no views text)", () => {
    const video = loadVideo(
      "viewmodel-video-item-unavailable.html",
      VIEWMODEL_SELECTOR,
    );
    const result = extractViews(video);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.confidence, 0);
  });

  it("returns null with zero confidence for a private video (renderer)", () => {
    const video = loadVideo(
      "renderer-video-item-unavailable-private.html",
      RENDERER_SELECTOR,
    );
    const result = extractViews(video);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.confidence, 0);
  });

  it("returns null with zero confidence for null input", () => {
    const result = extractViews(null);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.confidence, 0);
  });
});
