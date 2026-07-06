import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";

import { extractChannelName } from "./channel-name-extraction.js";

const FIXTURES_DIR = path.join(
  import.meta.dirname,
  "../../../test/fixtures/real",
);

/**
 * Load a real-world single-video-item fixture and return the video element.
 * @param {string} file
 * @param {string} selector
 * @returns {Element}
 */
const loadVideo = (file, selector) => {
  const html = fs.readFileSync(path.join(FIXTURES_DIR, file), "utf-8");
  return new JSDOM(html).window.document.querySelector(selector);
};

const RENDERER_SELECTOR = "ytd-playlist-video-renderer";
const VIEWMODEL_SELECTOR = "yt-lockup-view-model";

describe("extractChannelName, structural-invariant contract", () => {
  // The channel name is located by structural invariant, not by
  // element name. The invariant is: exactly one <a> inside the video item
  // has an href beginning "/@". That anchor's textContent is the channel
  // name. This holds on both the renderer and viewmodel architectures
  // because a channel link is forced by what a channel IS, not by what
  // YouTube calls its wrapper element this quarter.

  describe("renderer architecture", () => {
    it("extracts channel name from a normal video item", () => {
      const video = loadVideo(
        "renderer-video-item-normal.html",
        RENDERER_SELECTOR,
      );
      const result = extractChannelName(video);
      assert.strictEqual(result.value, "TEDx Talks");
      assert.ok(result.confidence > 0, "must report positive confidence");
    });

    it("returns null with zero confidence when no channel link exists (private)", () => {
      const video = loadVideo(
        "renderer-video-item-unavailable-private.html",
        RENDERER_SELECTOR,
      );
      const result = extractChannelName(video);
      assert.strictEqual(result.value, null);
      assert.strictEqual(result.confidence, 0);
    });

    it("returns null with zero confidence when no channel link exists (deleted)", () => {
      const video = loadVideo(
        "renderer-video-item-unavailable-deleted.html",
        RENDERER_SELECTOR,
      );
      const result = extractChannelName(video);
      assert.strictEqual(result.value, null);
      assert.strictEqual(result.confidence, 0);
    });
  });

  describe("viewmodel architecture", () => {
    it("extracts channel name from a normal video item", () => {
      const video = loadVideo(
        "viewmodel-video-item-normal.html",
        VIEWMODEL_SELECTOR,
      );
      const result = extractChannelName(video);
      assert.strictEqual(result.value, "T1");
      assert.ok(result.confidence > 0, "must report positive confidence");
    });

    it("returns null with zero confidence when no channel link exists (unavailable)", () => {
      const video = loadVideo(
        "viewmodel-video-item-unavailable.html",
        VIEWMODEL_SELECTOR,
      );
      const result = extractChannelName(video);
      assert.strictEqual(result.value, null);
      assert.strictEqual(result.confidence, 0);
    });

    it("extracts channel name from a live video item", () => {
      const video = loadVideo(
        "viewmodel-video-item-live.html",
        VIEWMODEL_SELECTOR,
      );
      const result = extractChannelName(video);
      assert.strictEqual(result.value, "Newsmax");
      assert.ok(result.confidence > 0);
    });

    it("extracts channel name from an upcoming video item", () => {
      const video = loadVideo(
        "viewmodel-video-item-upcoming.html",
        VIEWMODEL_SELECTOR,
      );
      const result = extractChannelName(video);
      assert.strictEqual(result.value, "Robcdee");
      assert.ok(result.confidence > 0);
    });
  });

  describe("graceful degradation", () => {
    it("returns null with zero confidence for null input", () => {
      const result = extractChannelName(null);
      assert.strictEqual(result.value, null);
      assert.strictEqual(result.confidence, 0);
    });
  });
});
