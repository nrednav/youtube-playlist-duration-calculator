import { elementSelectors } from "src/shared/data/element-selectors";

export class SortByIndexStrategy {
  /**
   * Sorts a list of videos by their index.
   * Falls back to array position when DOM index elements don't exist
   * (e.g., on viewmodel architecture pages).
   * @param {Array<Element>} videos
   * @param {"asc" | "desc"} sortOrder
   * @returns {Array<Element>}
   */
  sort(videos, sortOrder) {
    // Track original positions for fallback
    const withIndices = videos.map((video, index) => {
      const indexElement = video.querySelector(elementSelectors.videoIndex);
      const num = indexElement ? Number(indexElement.innerText) : index;
      return { video, num };
    });

    withIndices.sort((a, b) => {
      if (sortOrder === "asc") {
        return a.num - b.num;
      }

      if (sortOrder === "desc") {
        return b.num - a.num;
      }
    });

    return withIndices.map(({ video }) => video);
  }
}
