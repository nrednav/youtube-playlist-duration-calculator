import { DurationReading } from "../extraction/duration-reading";

/**
 * Late-Duration Watch
 *
 * After the readiness budget runs out, the extension computes once from the
 * durations that rendered. That total goes stale if YouTube paints the
 * remaining durations afterwards, which a slow browser or a backgrounded tab
 * produces. Nothing else recomputes it: the playlist observer watches direct
 * children only, so a duration badge changing text deep inside a video
 * renderer is invisible to it.
 *
 * This module decides what the polling loop does on each tick of the bounded
 * watch that follows the fallback computation.
 */

/**
 * Outcomes of a single watch tick.
 */
export const LateDurationWatch = Object.freeze({
  /** More durations are readable than the number that was summed. */
  RECOMPUTE: "recompute",
  /** Nothing changed yet and the watch window is still open. */
  CONTINUE: "continue",
  /** Nothing changed and the watch window is closed. */
  STOP: "stop",
});

/**
 * Count the videos whose duration can be read right now.
 *
 * @param {Element[]} videos
 * @param {{ readDuration: (video: Element) => { kind: string } }} dependencies
 * @returns {number}
 */
export const countAvailableDurations = (videos, { readDuration }) =>
  videos.reduce(
    (count, video) =>
      count + (readDuration(video).kind === DurationReading.DURATION ? 1 : 0),
    0,
  );

/**
 * Decide what to do on one watch tick.
 *
 * A changed count wins over the window, so the last tick still picks up a
 * duration that arrived just before the window closed. The window is a total
 * budget, not a since-last-change timer, so a page that keeps rewriting its
 * badges cannot keep the watch alive indefinitely.
 *
 * @param {{ watchTicks: number, availableCount: number, lastComputedCount: number, maxWatchTicks: number }} state
 * @returns {string} one of the `LateDurationWatch` outcomes
 */
export const decideLateDurationWatch = ({
  watchTicks,
  availableCount,
  lastComputedCount,
  maxWatchTicks,
}) => {
  if (availableCount !== lastComputedCount) {
    return LateDurationWatch.RECOMPUTE;
  }

  if (watchTicks >= maxWatchTicks) {
    return LateDurationWatch.STOP;
  }

  return LateDurationWatch.CONTINUE;
};
