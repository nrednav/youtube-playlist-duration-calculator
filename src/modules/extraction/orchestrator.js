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
  const variant = desyncIndicators.detectVariant();
  const sorted = sortStrategiesByPriority(EXTRACTION_STRATEGIES, variant);

  for (const strategy of sorted) {
    const result = strategy.extract(videoElement);

    logger.debug("extraction_strategy_result", () => ({
      strategy: strategy.name,
      found: !!result.value,
      confidence: result.confidence,
    }));

    if (result.value && result.confidence >= 0.5) {
      return {
        seconds: convertTimestampToSeconds(result.value),
        confidence: result.confidence,
        strategyName: result.strategyName || strategy.name,
      };
    }
  }

  return { seconds: null, confidence: 0, strategyName: "none" };
};
