/**
 * Discovery Strategy: Selector Match
 *
 * Tries to find the playlist container using the known element selectors.
 * This is the original approach that works for the renderer DOM architecture.
 *
 * Strategy contract: { name, priority, designedFor, discover(doc) }
 */

import { elementSelectors } from "../../shared/data/element-selectors";

export const strategy = {
  name: "selector-match",
  priority: 1,
  designedFor: "renderer",

  /**
   * Find the playlist container using the known CSS selector.
   *
   * @param {Document} doc
   * @returns {{ element: Element|null, videos: null, confidence: number, strategyName: string }}
   */
  discover(doc) {
    const playlistEl = doc.querySelector(elementSelectors.playlist);

    if (playlistEl) {
      return {
        element: playlistEl,
        videos: null,
        // The renderer architecture identifies videos by tag name.
        // Downstream consumers use this to re-query the live DOM instead of
        // relying on a frozen snapshot.
        videoSelector: elementSelectors.video,
        confidence: 0.9,
        strategyName: "selector-match",
      };
    }

    return {
      element: null,
      videos: null,
      videoSelector: null,
      confidence: 0,
      strategyName: "selector-match",
    };
  },
};
