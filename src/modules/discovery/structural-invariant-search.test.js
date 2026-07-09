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
  querySelectorAll(sel) {
    return opts.querySelectorAll?.(sel) || [];
  },
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
    const lockups = Array.from({ length: 8 }, (_, i) => {
      const duration = i % 2 === 0 ? "12:34" : "5:00";
      const badge = createMockElement("badge-shape", {
        textContent: duration,
      });

      return createMockElement("yt-lockup-view-model", {
        childCount: 1,
        textContent: duration,
        children: [],
        closest: createMockElement("yt-section-list-renderer", {}),
        querySelectorAll: (sel) => (sel === "badge-shape" ? [badge] : []),
      });
    });

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

  it("rejects stale-card-only pages with low confidence", () => {
    // Two lockups whose badge-shape textContent is NOT a duration
    // ("20 videos", "1.2M views"), but whose whole textContent contains
    // a duration pattern ("1:28:08") as a stale recommendation-card
    // rendering. Without the fix, the withTimestamps filter (which matched
    // whole textContent) would elevate confidence to 0.6 against a stale
    // container. After the fix, confidence keys off videoLockups (badge
    // matches) only, so an all-stale-card page falls to 0.3.
    const lockups = [
      createMockElement("yt-lockup-view-model", {
        textContent: "Playlist X 1:28:08",
        children: [],
        closest: createMockElement("yt-section-list-renderer", {}),
        querySelectorAll: (sel) =>
          sel === "badge-shape"
            ? [createMockElement("badge-shape", { textContent: "20 videos" })]
            : [],
      }),
      createMockElement("yt-lockup-view-model", {
        textContent: "Other card 1:28:08 asdf",
        children: [],
        closest: createMockElement("yt-section-list-renderer", {}),
        querySelectorAll: (sel) =>
          sel === "badge-shape"
            ? [
                createMockElement("badge-shape", {
                  textContent: "1.2M views",
                }),
              ]
            : [],
      }),
    ];

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

    assert.ok(
      result.confidence <= 0.3,
      `Expected confidence <= 0.3 for stale-card-only page, got ${result.confidence}`,
    );
  });

  it("real viewmodel playlist regression", () => {
    // Three lockups each with a clean duration badge.
    const lockups = ["4:30", "10:00", "2:15"].map((duration) => {
      const badge = createMockElement("badge-shape", {
        textContent: duration,
      });
      const sectionList = createMockElement("yt-section-list-renderer", {});
      return createMockElement("yt-lockup-view-model", {
        textContent: `Title ${duration} Channel 1.2M views`,
        children: [],
        closest: sectionList,
        querySelectorAll: (sel) => (sel === "badge-shape" ? [badge] : []),
      });
    });

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

    assert.ok(result.confidence >= 0.6, "Expected confidence >= 0.6");
    assert.ok(result.videos.length > 0, "Expected non-empty videos");
    assert.strictEqual(result.container, lockups[0].closest());
  });
});
