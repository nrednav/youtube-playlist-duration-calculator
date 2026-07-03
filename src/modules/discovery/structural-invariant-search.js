import { logger } from "../../shared/modules/logger";

const DURATION_PATTERN = /\d+:\d{2}(:\d{2})?/;

/**
 * Result of a discovery attempt.
 *
 * @typedef {Object} DiscoveryResult
 * @property {Element|null} container - The playlist container element (renderer arch) or null
 * @property {Element[]|null} videos - Individual video elements (viewmodel arch) or null
 * @property {number} confidence - 0 to 1
 * @property {string} strategy - Name of the strategy that produced this result
 */

/**
 * Strategy A: Renderer Architecture
 * Find the playlist container by looking for any element whose direct children
 * include multiple CustomElements with "video-renderer" in their tag name.
 *
 * @param {Document} doc
 * @returns {DiscoveryResult}
 */
const discoverByRendererInvariant = (doc) => {
  // Find all elements with 3+ children that could be video renderers
  const candidates = [];

  const allElements = doc.querySelectorAll("*");

  for (const element of allElements) {
    if (element.childElementCount < 3) {
      continue;
    }

    const children = [...element.children];
    const videoRenderers = children.filter((child) =>
      child.tagName.toLowerCase().includes("video-renderer"),
    );

    if (videoRenderers.length >= 3) {
      // Secondary signal: at least some video renderers have duration text
      const withTimestamps = videoRenderers.filter((videoRenderer) =>
        DURATION_PATTERN.test(videoRenderer.textContent || ""),
      );

      candidates.push({
        container: element,
        totalChildren: children.length,
        videoCount: videoRenderers.length,
        timestampRatio: withTimestamps.length / videoRenderers.length,
      });
    }
  }

  if (candidates.length === 0) {
    return {
      container: null,
      videos: null,
      confidence: 0,
      strategy: "renderer-invariant",
    };
  }

  // Pick the candidate with the most video-renderer children
  const best = candidates.reduce((a, b) =>
    a.videoCount > b.videoCount ? a : b,
  );

  logger.debug("discovery_renderer_invariant", () => ({
    totalCandidates: candidates.length,
    bestVideoCount: best.videoCount,
    bestTimestampRatio: best.timestampRatio,
  }));

  // High confidence if we found lots of video renderers with timestamps
  const confidence =
    best.videoCount >= 10 ? 0.9 : best.videoCount >= 5 ? 0.7 : 0.5;

  return {
    container: best.container,
    videos: null,
    confidence,
    strategy: "renderer-invariant",
  };
};

/**
 * Strategy B: ViewModel Architecture
 * Find the video lockup elements (yt-lockup-view-model) and the parent
 * section container, using the presence of duration text as the invariant.
 *
 * On ViewModel pages, each video IS a yt-lockup-view-model element.
 * The playlist container is a section-list-renderer that wraps them.
 *
 * @param {Document} doc
 * @returns {DiscoveryResult}
 */
const discoverByViewModel = (doc) => {
  const lockups = doc.querySelectorAll("yt-lockup-view-model");

  if (lockups.length === 0) {
    return {
      container: null,
      videos: null,
      confidence: 0,
      strategy: "viewmodel",
    };
  }

  // Filter lockups to those containing duration text as a secondary check
  const withTimestamps = [...lockups].filter((lockup) =>
    DURATION_PATTERN.test(lockup.textContent || ""),
  );

  // Find the parent container for section-level operations
  const container =
    lockups[0].closest("yt-section-list-renderer") ||
    lockups[0].closest("[id*='contents']") ||
    lockups[0].parentElement;

  const usableVideos =
    withTimestamps.length > 0 ? withTimestamps : [...lockups];

  logger.debug("discovery_viewmodel", () => ({
    totalLockups: lockups.length,
    withTimestamps: withTimestamps.length,
    containerTag: container?.tagName || "none",
  }));

  // High confidence if we found lockups with duration text
  const confidence =
    usableVideos.length >= 10 ? 0.9 : usableVideos.length >= 3 ? 0.7 : 0.4;

  return {
    container,
    videos: usableVideos,
    confidence,
    strategy: "viewmodel",
  };
};

/**
 * Discover the playlist container and/or video elements using structural
 * invariants, based on the detected rendering architecture.
 *
 * @param {Document} doc
 * @param {{ known: boolean, variant: string }} variant - from desyncIndicators.detectVariant()
 * @returns {DiscoveryResult}
 */
export const discoverPlaylist = (doc, variant) => {
  if (variant.variant === "renderer" || variant.variant === "unknown") {
    const result = discoverByRendererInvariant(doc);

    if (result.confidence > 0) {
      return result;
    }
  }

  if (variant.variant === "viewmodel" || variant.variant === "unknown") {
    const result = discoverByViewModel(doc);

    if (result.confidence > 0) {
      return result;
    }
  }

  return {
    container: null,
    videos: null,
    confidence: 0,
    strategy: "none",
  };
};
