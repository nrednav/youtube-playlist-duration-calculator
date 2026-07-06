/**
 * Discovery Orchestrator
 *
 * Runs all discovery strategies in priority order based on the detected
 * YouTube layout variant. Strategies designed for the detected variant
 * run first. Variant-agnostic strategies run second. Strategies designed
 * for other variants run last. This avoids wasting cycles on strategies
 * that cannot succeed in the current architecture.
 *
 * Adding a new strategy means creating one file and registering it
 * in the DISCOVERY_STRATEGIES array.
 */

import { desyncIndicators } from "../../shared/data/element-selectors";
import { logger } from "../../shared/modules/logger";
import { strategy as selectorMatch } from "./strategy-selector-match";
import { strategy as structuralInvariant } from "./strategy-structural-invariant";

const DISCOVERY_STRATEGIES = [selectorMatch, structuralInvariant];

/**
 * Sort strategies by how well they match the current layout variant.
 * Variant-specific strategies get highest priority. Variant-agnostic
 * strategies get medium priority. Strategies for other variants get
 * lowest priority (tried only when nothing else works).
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
 * Run all discovery strategies in priority order and return the best result.
 * Strategies are sorted based on the detected YouTube layout variant.
 *
 * The result includes a `videoSelector` string so downstream consumers
 * (notably `getVideos()` in main.js) can re-query the live DOM for
 * currently-present video elements without relying on the frozen
 * `videos` snapshot captured at discovery time.
 *
 * @param {Document} doc
 * @returns {{ container: Element|null, videos: Element[]|null, videoSelector: string|null, confidence: number, strategyName: string }}
 */
export const discoverPlaylist = (doc) => {
  const variant = desyncIndicators.detectVariant(doc);
  const sorted = sortStrategiesByPriority(DISCOVERY_STRATEGIES, variant);

  logger.debug("discovery_strategy_order", () => ({
    variant: variant.variant,
    strategyOrder: sorted.map((s) => `${s.name}(p${s.effectivePriority})`),
  }));

  let bestResult = {
    container: null,
    videos: null,
    videoSelector: null,
    confidence: 0,
    strategyName: "none",
  };

  for (const strategy of sorted) {
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
        videoSelector: result.videoSelector ?? null,
        confidence: result.confidence,
        strategyName: result.strategyName || strategy.name,
      };
    }

    if (result.confidence >= 0.95) {
      break;
    }
  }

  return bestResult;
};
