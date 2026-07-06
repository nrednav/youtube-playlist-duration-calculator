import { extractViews } from "src/modules/extraction/views-extraction";
import { getSupportedLocales } from "./parsers";

export class SortByViewsStrategy {
  static supportedLocales = getSupportedLocales();

  /**
   * Sorts a list of videos by their view count.
   *
   * Previously called
   * `video.querySelector(elementSelectors.videoInfo)` and read
   * `firstElementChild`, a renderer-territory assumption. On viewmodel
   * it returned null and crashed. The strategy now consumes the
   * architecture-agnostic `extractViews` extractor, which locates the
   * views fragment by structural invariant (the metadata-row fragment
   * before the delimiter, excluding "watching").
   *
   * Videos with no extractable views (live, unavailable) sort as 0 and
   * hold their relative order via the comparator's stability.
   *
   * @param {Array<Element>} videos
   * @param {"asc" | "desc"} sortOrder
   * @returns {Array<Element>}
   */
  sort(videos, sortOrder) {
    return [...videos].sort((videoA, videoB) => {
      const countA = extractViews(videoA).value ?? 0;
      const countB = extractViews(videoB).value ?? 0;

      if (sortOrder === "asc") {
        return countA - countB;
      }

      if (sortOrder === "desc") {
        return countB - countA;
      }

      return 0;
    });
  }
}
