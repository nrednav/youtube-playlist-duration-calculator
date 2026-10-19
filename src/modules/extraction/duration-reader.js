/**
 * Duration Reader
 *
 * The single place that decides whether a video has a duration. Every
 * consumer asks this module, because the extraction strategies were
 * previously consulted through two different entry points that disagreed:
 * one reported a non-duration marker as zero seconds, the other as null.
 * The total, the readiness gate, and the late-duration watch must agree on
 * what a missing duration means, so they all read this.
 *
 * The reading is a discriminated result rather than a number, because
 * "no duration" is not one state. A badge that says LIVE or Upcoming is
 * finished and will never carry a duration. A badge that has not painted
 * is still loading. Treating the second as the first reports a loading
 * video as counted; treating the first as the second holds readiness open
 * until the poll budget runs out.
 */

import { desyncIndicators } from "../../shared/data/element-selectors";
import { logger } from "../../shared/modules/logger";
import { convertTimestampToSeconds } from "../../shared/modules/timestamp";
import { DurationReading } from "./duration-reading";
import { strategy as contentPattern } from "./strategy-content-pattern";
import { strategy as selectorMatch } from "./strategy-selector-match";

const STRATEGIES = [selectorMatch, contentPattern];
const CONFIDENCE_FLOOR = 0.5;

export { DurationReading };

const sortStrategiesByPriority = (strategies, variant) => {
  const prioritized = strategies.map((strategy) => {
    let effectivePriority;

    if (strategy.designedFor === variant.variant) {
      effectivePriority = 0;
    } else if (strategy.designedFor === "any") {
      effectivePriority = 5;
    } else {
      effectivePriority = 10;
    }

    return { ...strategy, effectivePriority };
  });

  return prioritized.sort((a, b) => a.effectivePriority - b.effectivePriority);
};

const absent = () => ({
  kind: DurationReading.NO_DURATION,
  seconds: null,
  confidence: 0,
  strategyName: "none",
  segmentCount: 0,
});

const pending = () => ({
  kind: DurationReading.PENDING,
  seconds: null,
  confidence: 0,
  strategyName: "none",
  segmentCount: 0,
});

/**
 * Read a video's duration state.
 *
 * @param {Element} videoElement
 * @returns {{ kind: string, seconds: number|null, confidence: number, strategyName: string, segmentCount: number }}
 */
export const readDuration = (videoElement) => {
  if (!videoElement) {
    return pending();
  }

  const doc = videoElement.ownerDocument || document;
  const variant = desyncIndicators.detectVariant(doc);
  const sorted = sortStrategiesByPriority(STRATEGIES, variant);

  let sawMarker = false;

  for (const strategy of sorted) {
    const result = strategy.extract(videoElement);

    logger.debug("extraction_strategy_result", () => ({
      strategy: strategy.name,
      found: !!result.value,
      confidence: result.confidence,
    }));

    if (result.presence === "absent") {
      sawMarker = true;
    }

    if (!result.value || result.confidence < CONFIDENCE_FLOOR) {
      continue;
    }

    const rawToken = result.value;

    return {
      kind: DurationReading.DURATION,
      seconds: convertTimestampToSeconds(rawToken),
      confidence: result.confidence,
      strategyName: result.strategyName || strategy.name,
      // Shape of the parsed token (2 = MM:SS, 3 = HH:MM:SS). The
      // aggregation layer uses this to derive a per-video worst-case
      // error bound grounded in duration semantics, rather than a flat
      // constant. See main.js processPlaylist.
      segmentCount: rawToken.split(":").filter(Boolean).length,
    };
  }

  return sawMarker ? absent() : pending();
};

/**
 * The duration in seconds, or null when the video carries no duration.
 *
 * @param {Element} video
 * @returns {number|null}
 */
export const getTimestampFromVideo = (video) => {
  const reading = readDuration(video);

  return reading.kind === DurationReading.DURATION ? reading.seconds : null;
};
