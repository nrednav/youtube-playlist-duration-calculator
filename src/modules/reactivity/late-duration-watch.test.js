import assert from "node:assert";
import { describe, it } from "node:test";
import {
  countAvailableDurations,
  decideLateDurationWatch,
  LateDurationWatch,
  selectPendingVideos,
} from "./late-duration-watch.js";

const DURATION = "duration";
const NO_DURATION = "no-duration";
const PENDING = "pending";

const readingsFor = (videos, values) => {
  const map = new Map(videos.map((video, index) => [video, values[index]]));

  return { readDuration: (video) => ({ kind: map.get(video) }) };
};

describe("countAvailableDurations", () => {
  it("counts only videos with a readable duration", () => {
    const videos = ["video-a", "video-b", "video-c"];
    const { readDuration } = readingsFor(videos, [DURATION, PENDING, DURATION]);

    assert.strictEqual(countAvailableDurations(videos, { readDuration }), 2);
  });

  it("counts nothing when no duration renders", () => {
    const videos = ["video-a", "video-b"];
    const { readDuration } = readingsFor(videos, [PENDING, PENDING]);

    assert.strictEqual(countAvailableDurations(videos, { readDuration }), 0);
  });

  it("does not count a video that will never carry a duration", () => {
    const videos = ["video-a", "video-b"];
    const { readDuration } = readingsFor(videos, [NO_DURATION, DURATION]);

    assert.strictEqual(countAvailableDurations(videos, { readDuration }), 1);
  });
});

describe("selectPendingVideos", () => {
  it("keeps only the videos that are still waiting", () => {
    const videos = ["video-a", "video-b", "video-c"];
    const { readDuration } = readingsFor(videos, [
      DURATION,
      PENDING,
      NO_DURATION,
    ]);

    assert.deepStrictEqual(selectPendingVideos(videos, { readDuration }), [
      "video-b",
    ]);
  });

  it("is empty when every video has reported a state", () => {
    const videos = ["video-a", "video-b"];
    const { readDuration } = readingsFor(videos, [DURATION, NO_DURATION]);

    assert.deepStrictEqual(selectPendingVideos(videos, { readDuration }), []);
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
