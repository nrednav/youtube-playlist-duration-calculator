import assert from "node:assert";
import { describe, it } from "node:test";

globalThis.chrome = {
  runtime: { getManifest: () => ({ version: "0.0.0" }) },
};

const { DurationReading, getTimestampFromVideo, readDuration } = await import(
  "./duration-reader.js"
);

const TIMESTAMP_SELECTOR = "ytd-thumbnail-overlay-time-status-renderer";

const video = ({ badgeText, timestampText, text = "" }) => ({
  ownerDocument: { querySelector: () => null },
  textContent: text,
  querySelector: (selector) => {
    if (selector === TIMESTAMP_SELECTOR && timestampText !== undefined) {
      return { textContent: timestampText };
    }

    return null;
  },
  querySelectorAll: (selector) => {
    if (selector === "badge-shape" && badgeText !== undefined) {
      return [{ textContent: badgeText }];
    }

    return [];
  },
});

describe("readDuration()", () => {
  it("reads a duration badge", () => {
    assert.deepStrictEqual(readDuration(video({ badgeText: "4:30" })), {
      kind: DurationReading.DURATION,
      seconds: 270,
      confidence: 0.9,
      strategyName: "content-pattern",
      segmentCount: 2,
    });
  });

  it("treats a zero-second duration as a duration", () => {
    const reading = readDuration(video({ badgeText: "0:00" }));

    assert.strictEqual(reading.kind, DurationReading.DURATION);
    assert.strictEqual(reading.seconds, 0);
  });

  it("treats a LIVE badge as a finished item without a duration", () => {
    assert.strictEqual(
      readDuration(video({ badgeText: "LIVE" })).kind,
      DurationReading.NO_DURATION,
    );
  });

  it("treats an Upcoming badge as a finished item without a duration", () => {
    assert.strictEqual(
      readDuration(video({ badgeText: "Upcoming" })).kind,
      DurationReading.NO_DURATION,
    );
  });

  it("treats a non-duration timestamp element as a finished item", () => {
    assert.strictEqual(
      readDuration(video({ timestampText: "LIVE" })).kind,
      DurationReading.NO_DURATION,
    );
  });

  it("treats an unpainted badge as pending", () => {
    assert.strictEqual(
      readDuration(video({ badgeText: "" })).kind,
      DurationReading.PENDING,
    );
  });

  it("treats a video with no duration structure as pending", () => {
    assert.strictEqual(readDuration(video({})).kind, DurationReading.PENDING);
  });

  it("treats a missing element as pending", () => {
    assert.strictEqual(readDuration(null).kind, DurationReading.PENDING);
  });
});

describe("getTimestampFromVideo()", () => {
  it("returns the seconds of a readable duration", () => {
    assert.strictEqual(
      getTimestampFromVideo(video({ badgeText: "2:05" })),
      125,
    );
  });

  it("returns null for a video that has no duration by nature", () => {
    assert.strictEqual(
      getTimestampFromVideo(video({ badgeText: "LIVE" })),
      null,
    );
  });

  it("returns null for a video that has not rendered its duration", () => {
    assert.strictEqual(getTimestampFromVideo(video({})), null);
  });
});
