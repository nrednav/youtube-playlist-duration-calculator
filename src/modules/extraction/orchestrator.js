/**
 * Extraction Orchestrator
 *
 * Runs all extraction strategies in priority order based on the detected
 * YouTube layout variant. Strategies designed for the detected variant
 * run first, ensuring fast and accurate extraction. Falls back to
 * variant-agnostic strategies when the primary ones fail.
 *
 * Adding a new strategy means creating one file and registering it
 * in the EXTRACTION_STRATEGIES array.
 */

import { desyncIndicators } from "../../shared/data/element-selectors";
import { logger } from "../../shared/modules/logger";
import { convertTimestampToSeconds } from "../../shared/modules/timestamp";
import { strategy as contentPattern } from "./strategy-content-pattern";
import { strategy as selectorMatch } from "./strategy-selector-match";

const EXTRACTION_STRATEGIES = [selectorMatch, contentPattern];

/**
 * Sort strategies by how well they match the current layout variant.
 *
 * @param {Array} strategies
 * @param {{ variant: string }} variant - Result from desyncIndicators.detectVariant()
 * @returns {Array} Sorted copy of the strategies array
 */
const sortStrategiesByPriority = (strategies, variant) => {
  const prioritized = strategies.map((s) => {
    let effectivePriority;

    if (s.designedFor === variant.variant) {
      effectivePriority = 0;
    } else if (s.designedFor === "any") {
      effectivePriority = 5;
    } else {
      effectivePriority = 10;
    }

    return { ...s, effectivePriority };
  });

  return prioritized.sort((a, b) => a.effectivePriority - b.effectivePriority);
};

/**
 * Extract a timestamp from a video element by running strategies
 * in priority order based on the detected layout variant.
 *
 * @param {Element} videoElement
 * @returns {{ seconds: number|null, confidence: number, strategyName: string }}
 */
export const extractTimestamp = (videoElement) => {
  if (!videoElement) {
    return { seconds: null, confidence: 0, strategyName: "none" };
  }

  // Use the video element's document for variant detection.
  // Falls back to global document when called in browser context.
  const doc = videoElement.ownerDocument || document;
  const variant = desyncIndicators.detectVariant(doc);
  const sorted = sortStrategiesByPriority(EXTRACTION_STRATEGIES, variant);

  for (const strategy of sorted) {
    const result = strategy.extract(videoElement);

    logger.debug("extraction_strategy_result", () => ({
      strategy: strategy.name,
      found: !!result.value,
      confidence: result.confidence,
    }));

    if (result.value && result.confidence >= 0.5) {
      const rawToken = result.value;
      const segmentCount = rawToken.split(":").filter(Boolean).length;

      return {
        seconds: convertTimestampToSeconds(rawToken),
        confidence: result.confidence,
        strategyName: result.strategyName || strategy.name,
        // Shape of the parsed token (2 = MM:SS, 3 = HH:MM:SS). The
        // aggregation layer uses this to derive a per-video worst-case
        // error bound grounded in duration semantics, rather than a flat
        // constant. See main.js processPlaylist.
        segmentCount,
      };
    }
  }

  return {
    seconds: null,
    confidence: 0,
    strategyName: "none",
    segmentCount: 0,
  };
};
