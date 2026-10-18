import assert from "node:assert";
import { describe, it } from "node:test";
import {
  countAvailableDurations,
  decideLateDurationWatch,
  LateDurationWatch,
} from "./late-duration-watch.js";

const timestampFor = (videos, values) => {
  const map = new Map(videos.map((video, index) => [video, values[index]]));

  return { getTimestampFromVideo: (video) => map.get(video) };
};

describe("countAvailableDurations", () => {
  it("counts only videos with a readable duration", () => {
    const videos = ["video-a", "video-b", "video-c"];
    const { getTimestampFromVideo } = timestampFor(videos, [
      "1:00",
      null,
      "3:00",
    ]);

    assert.strictEqual(
      countAvailableDurations(videos, { getTimestampFromVideo }),
      2,
    );
  });

  it("counts nothing when no duration renders", () => {
    const videos = ["video-a", "video-b"];
    const { getTimestampFromVideo } = timestampFor(videos, [null, null]);

    assert.strictEqual(
      countAvailableDurations(videos, { getTimestampFromVideo }),
      0,
    );
  });
});

describe("decideLateDurationWatch", () => {
  it("recomputes when a duration became readable", () => {
    assert.strictEqual(
      decideLateDurationWatch({
        watchTicks: 0,
        availableCount: 26,
        lastComputedCount: 25,
        maxWatchTicks: 30,
      }),
      LateDurationWatch.RECOMPUTE,
    );
  });

  it("recomputes on the last tick of the window", () => {
    assert.strictEqual(
      decideLateDurationWatch({
        watchTicks: 30,
        availableCount: 26,
        lastComputedCount: 25,
        maxWatchTicks: 30,
      }),
      LateDurationWatch.RECOMPUTE,
    );
  });

  it("keeps watching while nothing changes inside the window", () => {
    assert.strictEqual(
      decideLateDurationWatch({
        watchTicks: 29,
        availableCount: 25,
        lastComputedCount: 25,
        maxWatchTicks: 30,
      }),
      LateDurationWatch.CONTINUE,
    );
  });

  it("stops when nothing changes and the window closes", () => {
    assert.strictEqual(
      decideLateDurationWatch({
        watchTicks: 30,
        availableCount: 25,
        lastComputedCount: 25,
        maxWatchTicks: 30,
      }),
      LateDurationWatch.STOP,
    );
  });
});
