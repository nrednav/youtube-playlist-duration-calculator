/**
 * Extraction Orchestrator
 *
 * Runs all extraction strategies in priority order and returns the
 * best result. Adding a new strategy means creating one file and
 * registering it in the EXTRACTION_STRATEGIES array.
 */

import { logger } from "../../shared/modules/logger";
import { convertTimestampToSeconds } from "../../shared/modules/timestamp";
import { strategy as contentPattern } from "./strategy-content-pattern";
import { strategy as selectorMatch } from "./strategy-selector-match";

const EXTRACTION_STRATEGIES = [selectorMatch, contentPattern];

/**
 * Extract a timestamp from a video element by running all strategies
 * in priority order. Returns the first result with usable confidence.
 *
 * @param {Element} videoElement
 * @returns {{ seconds: number|null, confidence: number, strategyName: string }}
 */
export const extractTimestamp = (videoElement) => {
  for (const strategy of EXTRACTION_STRATEGIES) {
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
