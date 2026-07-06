import { elementSelectors } from "src/shared/data/element-selectors";

const ORIGINAL_INDEX_ATTR = "data-ytpdc-original-index";

/**
 * Sort strategy that orders playlist videos by their position in the list.
 *
 * Exported because `PlaylistSorter` instantiates it by reference from
 * `src/modules/sorting/index.js`. The class is part of the public sort
 * contract and may be referenced by name in other sort orchestrators.
 */
export class SortByIndexStrategy {
  /**
   * Sorts a list of videos by their index.
   *
   * Source of `num`, in priority order:
   *   1. The DOM index element's text (renderer architecture).
   *   2. A stable attribute recorded on the first sort (see below).
   *   3. Current array position (only for videos never seen by a sort,
   *      e.g. lazy-loaded after the first sort).
   *
   * Why a stable attribute: on architectures with no DOM index element
   * (viewmodel pages), the previous implementation derived `num` from the
   * video's position in the input array. Because `sort()` reorders the live
   * DOM via `replaceChildren()`, the next sort's input array was already
   * reordered by the previous sort. This made the strategy a function of
   * its own output: ascending became a visual no-op against an already
   * ascending page, and descending alternated between asc and desc on
   * repeated clicks. Recording each video's original position once, on the
   * first sort, breaks the feedback loop and makes the sort idempotent.
   *
   * Side effects: when a video has no DOM index element, this method sets a
   * `data-ytpdc-original-index` attribute on that video element (the input
   * DOM node) recording its position at first sort. Consumers that re-sort
   * the same nodes across multiple calls rely on this mutation for stable
   * ordering. Treat the input array as owned by the strategy for the
   * attribute's lifetime.
   *
   * @param {Array<Element>} videos
   * @param {"asc" | "desc"} sortOrder
   * @returns {Array<Element>}
   */
  sort(videos, sortOrder) {
    const withIndices = videos.map((video, index) => {
      const indexElement = video.querySelector(elementSelectors.videoIndex);
      let num;

      if (indexElement) {
        num = Number(indexElement.innerText);
      } else {
        const recorded = video.getAttribute(ORIGINAL_INDEX_ATTR);
        if (recorded !== null) {
          num = Number(recorded);
        } else {
          // First time this video has been sorted: freeze its position so
          // future sorts are not influenced by prior reorderings.
          num = index;
          video.setAttribute(ORIGINAL_INDEX_ATTR, String(num));
        }
      }

      return { video, num };
    });

    withIndices.sort((a, b) => {
      if (sortOrder === "asc") {
        return a.num - b.num;
      }

      if (sortOrder === "desc") {
        return b.num - a.num;
      }

      return 0;
    });

    return withIndices.map(({ video }) => video);
  }
}
