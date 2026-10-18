import assert from "node:assert";
import { describe, it } from "node:test";
import { hasLoadingVideo } from "./readiness.js";

const video = ({ unavailable = false, seconds = 60 } = {}) => ({
  unavailable,
  seconds,
});

const dependencies = {
  getTimestampFromVideo: (item) => item.seconds,
  isVideoUnavailable: (item) => item.unavailable,
};

describe("hasLoadingVideo()", () => {
  it("is true when a normal video has no duration yet", () => {
    assert.strictEqual(
      hasLoadingVideo([video(), video({ seconds: null })], dependencies),
      true,
    );
  });

  it("is false once every normal video has a duration", () => {
    assert.strictEqual(
      hasLoadingVideo([video(), video({ seconds: 0 })], dependencies),
      false,
    );
  });

  it("is false when the only missing durations belong to unavailable videos", () => {
    assert.strictEqual(
      hasLoadingVideo(
        [
          video(),
          video({ unavailable: true, seconds: null }),
          video({ unavailable: true, seconds: null }),
        ],
        dependencies,
      ),
      false,
    );
  });

  it("is true when a loading video sits between unavailable videos", () => {
    assert.strictEqual(
      hasLoadingVideo(
        [
          video({ unavailable: true, seconds: null }),
          video({ seconds: null }),
          video({ unavailable: true, seconds: null }),
        ],
        dependencies,
      ),
      true,
    );
  });

  it("is false for an empty playlist", () => {
    assert.strictEqual(hasLoadingVideo([], dependencies), false);
  });

  it("treats a zero-second duration as loaded", () => {
    assert.strictEqual(
      hasLoadingVideo([video({ seconds: 0 })], dependencies),
      false,
    );
  });
});
