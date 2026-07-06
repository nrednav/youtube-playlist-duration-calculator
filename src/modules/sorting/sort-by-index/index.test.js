import assert from "node:assert";
import { describe, it } from "node:test";

globalThis.chrome = {
  runtime: { getManifest: () => ({ version: "0.0.0" }) },
};

const { SortByIndexStrategy } = await import("./index.js");

/**
 * Minimal Element stub implementing only the surface area the strategy
 * touches: querySelector, getAttribute, setAttribute.
 *
 * The strategy only ever queries for the videoIndex selector inside the
 * video element and reads or sets the `data-ytpdc-original-index` attribute.
 */
const mkVideo = ({ indexText = null, tag = "video" } = {}) => {
  const attrs = new Map();
  const children = [];
  if (indexText !== null) {
    children.push({
      tagName: "YT-FORMATTED-STRING",
      innerText: indexText,
    });
  }
  return {
    tagName: tag.toUpperCase(),
    dataset: {},
    _children: children,
    _attrs: attrs,
    querySelector(selector) {
      if (selector.includes("yt-formatted-string") && children.length > 0) {
        return children[0];
      }
      return null;
    },
    getAttribute(name) {
      return attrs.has(name) ? attrs.get(name) : null;
    },
    setAttribute(name, value) {
      attrs.set(name, String(value));
    },
  };
};

const indices = (videos) =>
  videos.map((v) => v.querySelector("yt-formatted-string#index")?.innerText);

describe("SortByIndexStrategy", () => {
  describe("renderer architecture (DOM index element present)", () => {
    it("sorts ascending by index text", () => {
      const videos = [
        mkVideo({ indexText: "3" }),
        mkVideo({ indexText: "1" }),
        mkVideo({ indexText: "2" }),
      ];
      const sorted = new SortByIndexStrategy().sort(videos, "asc");

      assert.deepStrictEqual(indices(sorted), ["1", "2", "3"]);
    });

    it("sorts descending by index text", () => {
      const videos = [
        mkVideo({ indexText: "1" }),
        mkVideo({ indexText: "3" }),
        mkVideo({ indexText: "2" }),
      ];
      const sorted = new SortByIndexStrategy().sort(videos, "desc");

      assert.deepStrictEqual(indices(sorted), ["3", "2", "1"]);
    });

    // DOM index remains the single source of truth on the renderer path.
    it("does not tag videos with the original-index attribute", () => {
      const videos = [mkVideo({ indexText: "1" }), mkVideo({ indexText: "2" })];
      new SortByIndexStrategy().sort(videos, "asc");

      assert.strictEqual(
        videos[0].getAttribute("data-ytpdc-original-index"),
        null,
      );
      assert.strictEqual(
        videos[1].getAttribute("data-ytpdc-original-index"),
        null,
      );
    });
  });

  describe("viewmodel architecture (no DOM index element, fallback)", () => {
    it("sorts ascending by array position on first call", () => {
      const a = mkVideo();
      const b = mkVideo();
      const c = mkVideo();
      const sorted = new SortByIndexStrategy().sort([a, b, c], "asc");

      assert.deepStrictEqual(sorted, [a, b, c]);
    });

    it("sorts descending by array position on first call", () => {
      const a = mkVideo();
      const b = mkVideo();
      const c = mkVideo();
      const sorted = new SortByIndexStrategy().sort([a, b, c], "desc");

      assert.deepStrictEqual(sorted, [c, b, a]);
    });

    it("tags each video with its original index on first sort", () => {
      const a = mkVideo();
      const b = mkVideo();
      const c = mkVideo();
      new SortByIndexStrategy().sort([a, b, c], "asc");

      assert.strictEqual(a.getAttribute("data-ytpdc-original-index"), "0");
      assert.strictEqual(b.getAttribute("data-ytpdc-original-index"), "1");
      assert.strictEqual(c.getAttribute("data-ytpdc-original-index"), "2");
    });

    // Regression: the bugreport's exact symptom. Pre-fix, repeated desc
    // clicks alternated between asc and desc because num was re-derived
    // from the (already-reordered) input array on every call.
    it("is idempotent across repeated descending calls (regression)", () => {
      const videos = [mkVideo(), mkVideo(), mkVideo(), mkVideo(), mkVideo()];
      const strategy = new SortByIndexStrategy();

      const first = strategy.sort([...videos], "desc");
      const second = strategy.sort([...first], "desc");
      const third = strategy.sort([...second], "desc");

      assert.deepStrictEqual(second, first);
      assert.deepStrictEqual(third, first);
    });

    // Regression: pre-fix, ascending was a visual no-op against an already
    // ascending page. The fix must still produce a stable ascending order
    // even when the input is already ascending AND was previously sorted
    // descending. That is, the input arrives in reversed order.
    it("ascending converges to the natural order regardless of input order (regression)", () => {
      const a = mkVideo(); // original index 0
      const b = mkVideo(); // original index 1
      const c = mkVideo(); // original index 2

      const strategy = new SortByIndexStrategy();
      // Prime: record original indices against the natural order.
      strategy.sort([a, b, c], "asc");

      // Now feed a reversed input, as would happen after a desc sort
      // reordered the DOM.
      const fromReversed = strategy.sort([c, b, a], "asc");

      assert.deepStrictEqual(fromReversed, [a, b, c]);
    });

    it("ascending and descending are stable inverses across mixed clicks", () => {
      const a = mkVideo();
      const b = mkVideo();
      const c = mkVideo();
      const d = mkVideo();
      const e = mkVideo();

      const strategy = new SortByIndexStrategy();
      // Prime original indices from natural order.
      strategy.sort([a, b, c, d, e], "asc");

      const descThenAscThenDesc = strategy.sort(
        strategy.sort(strategy.sort([a, b, c, d, e], "desc"), "asc"),
        "desc",
      );

      assert.deepStrictEqual(descThenAscThenDesc, [e, d, c, b, a]);
    });
  });

  describe("unknown sort order", () => {
    it("leaves the input order unchanged and returns all videos", () => {
      const a = mkVideo({ indexText: "2" });
      const b = mkVideo({ indexText: "1" });

      const result = new SortByIndexStrategy().sort([a, b], "sideways");

      assert.deepStrictEqual(result, [a, b]);
    });

    it("returns an empty array for empty input", () => {
      const result = new SortByIndexStrategy().sort([], "asc");
      assert.deepStrictEqual(result, []);
    });
  });
});
