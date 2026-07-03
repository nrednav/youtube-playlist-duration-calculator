/**
 * Extraction Strategy: Content Pattern
 *
 * Extracts a duration timestamp by matching text patterns (MM:SS, HH:MM:SS)
 * anywhere in the video element's content. Layout-agnostic: works regardless
 * of what element name holds the duration.
 *
 * Strategy contract: { name, priority, designedFor, extract(videoElement) }
 */

import { extractTimestampByPattern } from "./content-pattern-extraction";

export const strategy = {
  name: "content-pattern",
  priority: 2,
  designedFor: "any",

  /**
   * Extract a timestamp by scanning the video element's text content for
   * duration-like patterns.
   *
   * @param {Element} videoElement
   * @returns {{ value: string|null, confidence: number, strategyName: string }}
   */
  extract(videoElement) {
    const result = extractTimestampByPattern(videoElement);

    return {
      value: result.value,
      confidence: result.confidence,
      strategyName: "content-pattern",
    };
  },
};
