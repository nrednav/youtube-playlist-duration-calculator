/**
 * Error Bound Computation
 *
 * Derives a deterministic worst-case error bound for estimated (low
 * confidence) timestamp extractions, grounded in duration semantics
 * rather than a flat per-video constant.
 *
 * The bound is the sum of per-video worst-case errors. For each estimated
 * video, the parsed token's shape (MM:SS vs HH:MM:SS) bounds both the
 * parsed value and any true value the strategy might have misidentified.
 * The maximum distance between two values in [0, shapeMax] given a parsed
 * value V is max(V, shapeMax - V).
 */

/**
 * Maximum seconds representable by each parsed token shape.
 * Shape 2 = MM:SS, shape 3 = HH:MM:SS.
 */
const SHAPE_MAX_SECONDS = {
  2: 59 * 60 + 59, // 59:59
  3: 23 * 3600 + 59 * 60 + 59, // 23:59:59
};

/**
 * Compute the worst-case error (in seconds) for a single estimated
 * timestamp, given its parsed seconds value and token segment count.
 *
 * Verified videos (confidence >= 0.8) should not call this. They
 * contribute zero error by definition.
 *
 * @param {number} seconds - Parsed duration in seconds
 * @param {number} segmentCount - Token shape (2 for MM:SS, 3 for HH:MM:SS)
 * @returns {number} Worst-case error in seconds for this video
 */
export const computePerVideoError = (seconds, segmentCount) => {
  const shapeMax = SHAPE_MAX_SECONDS[segmentCount] ?? 0;
  return Math.max(seconds, shapeMax - seconds);
};

/**
 * Compute the total worst-case error bound across a set of extraction
 * results. Each result is { seconds, confidence, segmentCount }.
 *
 * Verified results (confidence >= 0.8) and unparseable results
 * (seconds === null) contribute zero. Only estimated results
 * contribute their per-video bound.
 *
 * @param {Array<{seconds: number|null, confidence: number, segmentCount: number}>} results
 * @returns {number} Total worst-case error in seconds
 */
export const computeMaxError = (results) => {
  let maxError = 0;

  for (const result of results) {
    if (result.seconds === null) {
      continue;
    }

    if (result.confidence >= 0.8) {
      continue;
    }

    maxError += computePerVideoError(result.seconds, result.segmentCount);
  }

  return maxError;
};
