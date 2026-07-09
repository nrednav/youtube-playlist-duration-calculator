import { elementSelectors } from "../../shared/data/element-selectors";
import { isDurationText } from "../../shared/modules/duration-pattern";
import { logger } from "../../shared/modules/logger";

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
      const withTimestamps = videoRenderers.filter((videoRenderer) =>
        isDurationText(videoRenderer.textContent || ""),
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
      videoSelector: null,
      confidence: 0,
      strategy: "renderer-invariant",
    };
  }

  const best = candidates.reduce((a, b) =>
    a.videoCount > b.videoCount ? a : b,
  );

  logger.debug("discovery_renderer_invariant", () => ({
    totalCandidates: candidates.length,
    bestVideoCount: best.videoCount,
    bestTimestampRatio: best.timestampRatio,
  }));

  const confidence =
    best.videoCount >= 10 ? 0.9 : best.videoCount >= 5 ? 0.7 : 0.5;

  return {
    container: best.container,
    videos: null,
    // Renderer-invariant discovery identifies videos by tag-name pattern.
    // Downstream consumers re-query the live container for these tags instead
    // of relying on a frozen snapshot.
    videoSelector: elementSelectors.video,
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
      videoSelector: null,
      confidence: 0,
      strategy: "viewmodel",
    };
  }

  // Separate lockups into actual video items (have a badge-shape whose
  // text matches a duration pattern) and other cards (e.g., stale playlist
  // recommendation cards from a previous SPA navigation page, which have
  // count text like "20 videos" instead of a duration).
  //
  // On SPA navigation to a playlist, YouTube does not always remove all
  // lockup elements from the previous page. The first lockups in DOM order
  // may be stale recommendation cards whose badge-shape shows a video count
  // rather than a duration. These must be excluded from both the container
  // derivation and the readiness sampling.
  const videoLockups = [...lockups].filter((lockup) => {
    const badges = lockup.querySelectorAll("badge-shape");
    return [...badges].some((b) =>
      isDurationText((b.textContent || "").trim()),
    );
  });

  // Use the first VIDEO lockup to derive the insertion container (the
  // section-list-renderer that wraps the actual playlist video items).
  // Using a stale card's container would point to the wrong page section,
  // causing getVideos() to re-derive from stale DOM.
  const firstVideo = videoLockups.length > 0 ? videoLockups[0] : lockups[0];

  const container =
    firstVideo?.closest("yt-section-list-renderer") ||
    firstVideo?.closest("[id*='contents']") ||
    firstVideo?.parentElement ||
    null;

  // Confidence is gated by badge-bearing video lockups, NOT by whole-textContent
  // pattern matches, so a stale card whose textContent contains a duration
  // pattern cannot elevate confidence when videoLockups is empty.
  const usableVideos = videoLockups.length > 0 ? videoLockups : [...lockups];
  const hasVideo = videoLockups.length >= 1;

  logger.debug("discovery_viewmodel", () => ({
    totalLockups: lockups.length,
    videoLockups: videoLockups.length,
    containerTag: container?.tagName || "none",
  }));

  // Even 1-2 lockups with timestamps is a strong signal on small playlists.
  const confidence =
    usableVideos.length >= 10
      ? 0.95
      : usableVideos.length >= 5
        ? 0.85
        : usableVideos.length >= 3
          ? 0.7
          : hasVideo
            ? 0.6
            : 0.3;

  return {
    container,
    videos: usableVideos,
    // ViewModel videos are yt-lockup-view-model elements. Downstream
    // consumers use this to re-query the live insertion parent for
    // scroll-appended lockups instead of the frozen snapshot.
    videoSelector: "yt-lockup-view-model",
    confidence,
    strategy: "viewmodel",
  };
};

/**
 * Discover the playlist container or video elements using structural
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
    videoSelector: null,
    confidence: 0,
    strategy: "none",
  };
};
