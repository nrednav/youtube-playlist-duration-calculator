/**
 * Discovery Strategy: Structural Invariant
 *
 * Finds the playlist by structural invariants (video-renderer children,
 * lockup elements with duration text) rather than by YouTube's chosen
 * element names. Works across renderer and viewmodel architectures.
 *
 * Strategy contract: { name, priority, designedFor, discover(doc) }
 */

import { desyncIndicators } from "../../shared/data/element-selectors";
import { discoverPlaylist as discoverByInvariants } from "./structural-invariant-search";

export const strategy = {
  name: "structural-invariant",
  priority: 2,
  designedFor: "any",

  /**
   * Find the playlist container or video elements using structural
   * invariants, detecting the architecture automatically.
   *
   * @param {Document} doc
   * @returns {{ element: Element|null, videos: Element[]|null, videoSelector: string|null, confidence: number, strategyName: string }}
   */
  discover(doc) {
    // Detect the actual rendering architecture from the live DOM.
    // Passing "unknown" would cause discoverByRendererInvariant to
    // run first and short-circuit if ANY -video-renderer elements exist
    // on the page (e.g. from stale sidebar content during SPA
    // transition), preventing discoverByViewModel from ever running.
    const variant = desyncIndicators.detectVariant(doc);

    const result = discoverByInvariants(doc, variant);

    return {
      element: result.container,
      videos: result.videos,
      videoSelector: result.videoSelector,
      confidence: result.confidence,
      strategyName: "structural-invariant",
    };
  },
};
