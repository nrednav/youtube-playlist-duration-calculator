import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";

import { extractUploadDate } from "./upload-date-extraction.js";

const FIXTURES_DIR = path.join(
  import.meta.dirname,
  "../../../test/fixtures/real",
);

const loadVideo = (file, selector, lang = "en") => {
  const html = fs.readFileSync(path.join(FIXTURES_DIR, file), "utf-8");
  const dom = new JSDOM(html);
  dom.window.document.documentElement.lang = lang;
  return dom.window.document.querySelector(selector);
};

const RENDERER_SELECTOR = "ytd-playlist-video-renderer";
const VIEWMODEL_SELECTOR = "yt-lockup-view-model";

describe("extractUploadDate, structural-invariant contract (en)", () => {
  // The upload-date datum is located by structural invariant.
  // the metadata-row text fragment IMMEDIATELY AFTER the "•" delimiter.
  // On renderer: [#video-info children] = [views, "•", date]. On
  // viewmodel: [metadata-row spans] = [..., views, "•", date]. In both,
  // "date" follows "•". YouTube cannot render a relative upload date
  // without a digit and a locale time-unit word. Locale regex/unit logic
  // is delegated to the existing parsers, migrated 2026-07-05 to accept
  // a raw string instead of an element's children[2].

  const SECONDS_PER_YEAR = 365 * 86400;

  it("extracts upload date from a renderer normal video item (en)", () => {
    const video = loadVideo(
      "renderer-video-item-normal.html",
      RENDERER_SELECTOR,
    );
    const result = extractUploadDate(video);
    assert.ok(result.value !== null, "must extract a number");
    // "8 years ago" → 8 * 365 * 86400
    assert.strictEqual(result.value, 8 * SECONDS_PER_YEAR);
    assert.ok(result.confidence > 0);
  });

  it("extracts upload date from a viewmodel normal video item (en)", () => {
    const video = loadVideo(
      "viewmodel-video-item-normal.html",
      VIEWMODEL_SELECTOR,
    );
    const result = extractUploadDate(video);
    assert.ok(result.value !== null, "must extract a number");
    // "2 years ago" → 2 * 365 * 86400
    assert.strictEqual(result.value, 2 * SECONDS_PER_YEAR);
    assert.ok(result.confidence > 0);
  });

  it("returns null with zero confidence for an unavailable video (no date)", () => {
    const video = loadVideo(
      "viewmodel-video-item-unavailable.html",
      VIEWMODEL_SELECTOR,
    );
    const result = extractUploadDate(video);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.confidence, 0);
  });

  it("returns null with zero confidence for a private video (renderer)", () => {
    const video = loadVideo(
      "renderer-video-item-unavailable-private.html",
      RENDERER_SELECTOR,
    );
    const result = extractUploadDate(video);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.confidence, 0);
  });

  it("returns null with zero confidence for a live video (no upload date)", () => {
    const video = loadVideo(
      "viewmodel-video-item-live.html",
      VIEWMODEL_SELECTOR,
    );
    const result = extractUploadDate(video);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.confidence, 0);
  });

  it("returns null with zero confidence for null input", () => {
    const result = extractUploadDate(null);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.confidence, 0);
  });
});
