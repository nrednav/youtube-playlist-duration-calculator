import assert from "node:assert";
import { describe, it } from "node:test";
import { hasLoadingVideo } from "./readiness.js";

const DURATION = "duration";
const NO_DURATION = "no-duration";
const PENDING = "pending";

const video = ({ unavailable = false, kind = DURATION } = {}) => ({
  unavailable,
  kind,
});

const dependencies = {
  readDuration: (item) => ({ kind: item.kind }),
  isVideoUnavailable: (item) => item.unavailable,
};

describe("hasLoadingVideo()", () => {
  it("is true when a normal video has no duration yet", () => {
    assert.strictEqual(
      hasLoadingVideo([video(), video({ kind: PENDING })], dependencies),
      true,
    );
  });

  it("is false once every normal video has a duration", () => {
    assert.strictEqual(
      hasLoadingVideo([video(), video({ kind: DURATION })], dependencies),
      false,
    );
  });

  it("is false when the only missing durations belong to unavailable videos", () => {
    assert.strictEqual(
      hasLoadingVideo(
        [
          video(),
          video({ unavailable: true, kind: PENDING }),
          video({ unavailable: true, kind: PENDING }),
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
          video({ unavailable: true, kind: PENDING }),
          video({ kind: PENDING }),
          video({ unavailable: true, kind: PENDING }),
        ],
        dependencies,
      ),
      true,
    );
  });

  it("is false for an empty playlist", () => {
    assert.strictEqual(hasLoadingVideo([], dependencies), false);
  });

  it("is false for a video that carries a non-duration marker", () => {
    assert.strictEqual(
      hasLoadingVideo([video({ kind: NO_DURATION })], dependencies),
      false,
    );
  });
});
