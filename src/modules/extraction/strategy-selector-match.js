/**
 * Extraction Strategy: Selector Match
 *
 * Extracts a duration timestamp from a video element by querying the
 * known timestamp element selector. Returns high-confidence results
 * when the selector hits.
 *
 * Strategy contract: { name, priority, designedFor, extract(videoElement) }
 */

import { elementSelectors } from "../../shared/data/element-selectors";

const DURATION_REGEX = /((?:(?:([01]?\d|2[0-3]):)?([0-5]?\d):)?([0-5]?\d))/;

export const strategy = {
  name: "selector-match",
  priority: 1,
  designedFor: "renderer",

  /**
   * Extract a timestamp by finding the known timestamp element inside
   * the video element and parsing its text.
   *
   * @param {Element} videoElement
   * @returns {{ value: string|null, confidence: number, strategyName: string }}
   */
  extract(videoElement) {
    const timestampElement = videoElement.querySelector(
      elementSelectors.timestamp,
    );

    if (!timestampElement) {
      return { value: null, confidence: 0, strategyName: "selector-match" };
    }

    const text = timestampElement.textContent;

    if (!text) {
      return { value: null, confidence: 0, strategyName: "selector-match" };
    }

    const sanitized = text.trim().replace(/\n/g, "");
    const matches = sanitized.match(DURATION_REGEX);

    if (matches) {
      return {
        value: matches[0],
        confidence: 1.0,
        strategyName: "selector-match",
      };
    }

    // Text exists but doesn't match expected format (e.g., "Live")
    return {
      value: "0",
      confidence: 0.5,
      strategyName: "selector-match",
    };
  },
};
