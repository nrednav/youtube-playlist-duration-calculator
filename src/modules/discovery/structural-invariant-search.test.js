import assert from "node:assert";
import { describe, it } from "node:test";

// chrome.runtime is used by the logger module during import.
// Mock it before loading the module under test.
globalThis.chrome = {
  runtime: {
    getManifest: () => ({ version: "0.0.0" }),
  },
};

const { discoverPlaylist } = await import("./structural-invariant-search.js");

// Minimal DOM mock for testing
const createMockDoc = ({ querySelectorAll = () => [] } = {}) => ({
  querySelector() {
    return null;
  },
  querySelectorAll,
});

const createMockElement = (tagName, opts = {}) => ({
  tagName: tagName.toUpperCase(),
  childElementCount: opts.childCount || 0,
  children: opts.children || [],
  textContent: opts.textContent || "",
  closest() {
    return opts.closest || null;
  },
  parentElement: opts.parentElement || null,
});

describe("discoverPlaylist", () => {
  it("returns zero confidence on empty document", () => {
    const doc = createMockDoc();
    const result = discoverPlaylist(doc, {
      known: false,
      variant: "unknown",
    });
    assert.strictEqual(result.confidence, 0);
    assert.strictEqual(result.container, null);
    assert.strictEqual(result.videos, null);
    assert.strictEqual(result.strategy, "none");
  });

  it("finds renderer container by video-renderer children", () => {
    const videoChildren = Array.from({ length: 10 }, (_, i) =>
      createMockElement("ytd-playlist-video-renderer", {
        childCount: 1,
        textContent: i % 2 === 0 ? "12:34" : "5:00",
        children: [],
      }),
    );

    const container = createMockElement("ytd-playlist-video-list-renderer", {
      childCount: 10,
      children: videoChildren,
    });

    const doc = createMockDoc({
      querySelectorAll: (sel) => {
        if (sel === "*") return [container];
        return [];
      },
    });

    const result = discoverPlaylist(doc, {
      known: true,
      variant: "renderer",
    });

    assert.ok(result.confidence > 0, "Expected confidence > 0");
    assert.strictEqual(result.container, container);
    assert.strictEqual(result.videos, null);
    assert.strictEqual(result.strategy, "renderer-invariant");
  });

  it("finds viewmodel lockups by yt-lockup-view-model presence", () => {
    const lockups = Array.from({ length: 8 }, (_, i) =>
      createMockElement("yt-lockup-view-model", {
        childCount: 1,
        textContent: i % 2 === 0 ? "12:34" : "5:00",
        children: [],
        closest: createMockElement("yt-section-list-renderer", {}),
      }),
    );

    const doc = createMockDoc({
      querySelectorAll: (sel) => {
        if (sel === "yt-lockup-view-model") return lockups;
        return [];
      },
    });

    const result = discoverPlaylist(doc, {
      known: true,
      variant: "viewmodel",
    });

    assert.ok(result.confidence > 0, "Expected confidence > 0");
    assert.strictEqual(result.videos.length, 8);
    assert.strictEqual(result.strategy, "viewmodel");
  });

  it("returns low confidence with few lockups and no timestamps", () => {
    const lockups = Array.from({ length: 2 }, () =>
      createMockElement("yt-lockup-view-model", {
        textContent: "No timestamps here",
        children: [],
      }),
    );

    const doc = createMockDoc({
      querySelectorAll: (sel) => {
        if (sel === "yt-lockup-view-model") return lockups;
        return [];
      },
    });

    const result = discoverPlaylist(doc, {
      known: true,
      variant: "viewmodel",
    });

    assert.ok(result.confidence > 0, "Expected some confidence for 2 lockups");
    assert.strictEqual(result.videos.length, 2);
  });
});
