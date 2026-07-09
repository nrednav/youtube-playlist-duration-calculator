import assert from "node:assert";
import { describe, it } from "node:test";

// chrome.runtime is used by the logger module during import.
// Mock it before loading the module under test.
globalThis.chrome = {
  runtime: {
    getManifest: () => ({ version: "0.0.0" }),
  },
};

const { resolveFirstVideo } = await import("./index.js");
const { isDurationText } = await import(
  "../../shared/modules/duration-pattern.js"
);

describe("sorting index uses the shared duration validator (smoke)", () => {
  it("rejects invalid seconds", () => {
    assert.strictEqual(isDurationText("9:99"), false);
  });
});

const mockDoc = ({ video = null, lockups = [] }) => ({
  querySelector: (sel) =>
    sel === "ytd-playlist-video-renderer" ? video : null,
  querySelectorAll: (sel) => (sel === "yt-lockup-view-model" ? lockups : []),
});

const lockup = (badges) => ({
  querySelectorAll: (sel) => (sel === "badge-shape" ? badges : []),
});

describe("resolveFirstVideo", () => {
  it("returns null when no lockup has a duration badge", () => {
    const doc = mockDoc({
      lockups: [
        lockup([{ textContent: "20 videos" }]),
        lockup([{ textContent: "3" }]),
      ],
    });
    assert.strictEqual(resolveFirstVideo(doc), null);
  });

  it("returns the first lockup with a duration badge", () => {
    const target = lockup([{ textContent: "4:30" }]);
    const doc = mockDoc({
      lockups: [lockup([{ textContent: "20 videos" }]), target],
    });
    assert.strictEqual(resolveFirstVideo(doc), target);
  });

  it("returns the renderer video when present", () => {
    const rendererVideo = { tagName: "YTD-PLAYLIST-VIDEO-RENDERER" };
    const doc = mockDoc({
      video: rendererVideo,
      lockups: [lockup([{ textContent: "4:30" }])],
    });
    assert.strictEqual(resolveFirstVideo(doc), rendererVideo);
  });

  it("returns null when there are no lockups at all", () => {
    const doc = mockDoc({ lockups: [] });
    assert.strictEqual(resolveFirstVideo(doc), null);
  });
});
