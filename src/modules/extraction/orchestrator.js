/**
 * Extraction Orchestrator
 *
 * Adapts the canonical duration reading to the shape the aggregation
 * layer consumes. The reading itself lives in `duration-reader.js`; this
 * module exists so callers that only need the summed seconds do not have
 * to know about the reading states.
 *
 * Adding a new strategy means creating one file and registering it in the
 * reader's STRATEGIES array.
 */

import { DurationReading, readDuration } from "./duration-reader";

/**
 * Extract a timestamp from a video element.
 *
 * @param {Element} videoElement
 * @returns {{ seconds: number|null, confidence: number, strategyName: string }}
 */
export const extractTimestamp = (videoElement) => {
  const reading = readDuration(videoElement);

  return {
    seconds: reading.kind === DurationReading.DURATION ? reading.seconds : null,
    confidence: reading.confidence,
    strategyName: reading.strategyName,
    segmentCount: reading.segmentCount,
  };
};
