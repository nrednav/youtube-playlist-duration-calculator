/**
 * Discovery Orchestrator
 *
 * Runs all discovery strategies and returns the best result.
 * Adding a new strategy means creating one file and registering it
 * in the DISCOVERY_STRATEGIES array.
 */

import { logger } from "../../shared/modules/logger";
import { strategy as selectorMatch } from "./strategy-selector-match";
import { strategy as structuralInvariant } from "./strategy-structural-invariant";

const DISCOVERY_STRATEGIES = [selectorMatch, structuralInvariant];

/**
 * Run all discovery strategies and return the best result.
 *
 * @param {Document} doc
 * @returns {{ container: Element|null, videos: Element[]|null, confidence: number, strategyName: string }}
 */
export const discoverPlaylist = (doc) => {
  let bestResult = {
    container: null,
    videos: null,
    confidence: 0,
    strategyName: "none",
  };

  for (const strategy of DISCOVERY_STRATEGIES) {
    const result = strategy.discover(doc);

    logger.debug("discovery_strategy_result", () => ({
      strategy: strategy.name,
      found: !!(result.element || result.videos?.length),
      confidence: result.confidence,
    }));

    if (result.confidence > bestResult.confidence) {
      bestResult = {
        container: result.element,
        videos: result.videos,
        confidence: result.confidence,
        strategyName: result.strategyName || strategy.name,
      };
    }

    // Short-circuit: very high confidence means we found the playlist
    // with the best strategy for this variant, no need to try more.
    if (result.confidence >= 0.95) {
      break;
    }
  }

  return bestResult;
};
