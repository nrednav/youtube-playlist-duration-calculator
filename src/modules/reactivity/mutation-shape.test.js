import assert from "node:assert";
import { describe, it } from "node:test";

// Mock chrome.runtime before importing the module under test, since
// mutation-shape.js imports element-selectors transitively-free but logger
// is pulled in by sibling orchestrators. The classifier itself has no
// chrome dependency. This mock guards the import graph.
globalThis.chrome = {
  runtime: { getManifest: () => ({ version: "0.0.0" }) },
};

const { isRemovalMutation, isAppendMutation } = await import(
  "./mutation-shape.js"
);

const VIDEO_TAG = "ytd-playlist-video-renderer";

/**
 * Minimal MutationRecord-shaped object. The classifier reads only
 * `type`, `addedNodes.length`, `removedNodes.length`, and `removedNodes[0]`.
 */
const mutation = ({ added = [], removed = [], type = "childList" }) => ({
  type,
  addedNodes: { length: added.length, 0: added[0] },
  removedNodes: { length: removed.length, 0: removed[0] },
  previousSibling: null,
  nextSibling: null,
});

const mkVideo = (tag = VIDEO_TAG) => {
  const el = globalThis.document
    ? document.createElement(tag)
    : { tagName: tag.toUpperCase() };
  return el;
};

describe("isRemovalMutation", () => {
  it("matches a single removed video renderer with no added nodes and a recorded last-interaction", () => {
    const m = mutation({ added: [], removed: [mkVideo()] });

    assert.strictEqual(
      isRemovalMutation(m, { videoTag: VIDEO_TAG, lastInteracted: mkVideo() }),
      true,
    );
  });

  it("does NOT match a lazy-load append (added nodes, no removed, no interaction)", () => {
    // This is the historical misclassification that caused the regression.
    const m = mutation({ added: [mkVideo(), mkVideo()], removed: [] });

    assert.strictEqual(
      isRemovalMutation(m, { videoTag: VIDEO_TAG, lastInteracted: null }),
      false,
    );
  });

  it("does NOT match an append even when lastInteracted is set", () => {
    const m = mutation({ added: [mkVideo()], removed: [] });

    assert.strictEqual(
      isRemovalMutation(m, {
        videoTag: VIDEO_TAG,
        lastInteracted: mkVideo(),
      }),
      false,
    );
  });

  it("does NOT match when nothing was removed (zero added and zero removed)", () => {
    const m = mutation({ added: [], removed: [] });

    assert.strictEqual(
      isRemovalMutation(m, { videoTag: VIDEO_TAG, lastInteracted: mkVideo() }),
      false,
    );
  });

  it("does NOT match when the removed node is not a video tag", () => {
    const m = mutation({
      added: [],
      removed: [mkVideo("ytd-some-other-renderer")],
    });

    assert.strictEqual(
      isRemovalMutation(m, { videoTag: VIDEO_TAG, lastInteracted: mkVideo() }),
      false,
    );
  });

  it("does NOT match a removal when lastInteracted is null", () => {
    // Pre-interaction state on a long playlist. A stray single removal here
    // must not be treated as the sort or remove fixup.
    const m = mutation({ added: [], removed: [mkVideo()] });

    assert.strictEqual(
      isRemovalMutation(m, { videoTag: VIDEO_TAG, lastInteracted: null }),
      false,
    );
  });

  it("does NOT match when more than one node was removed", () => {
    const m = mutation({ added: [], removed: [mkVideo(), mkVideo()] });

    assert.strictEqual(
      isRemovalMutation(m, { videoTag: VIDEO_TAG, lastInteracted: mkVideo() }),
      false,
    );
  });
});

describe("isAppendMutation", () => {
  it("matches a mutation with added nodes and no removed nodes", () => {
    const m = mutation({ added: [mkVideo(), mkVideo()], removed: [] });

    assert.strictEqual(isAppendMutation(m), true);
  });

  it("does NOT match a removal mutation", () => {
    const m = mutation({ added: [], removed: [mkVideo()] });

    assert.strictEqual(isAppendMutation(m), false);
  });

  it("does NOT match an empty mutation", () => {
    const m = mutation({ added: [], removed: [] });

    assert.strictEqual(isAppendMutation(m), false);
  });
});
