import { elementSelectors } from "../..";

export class SortByIndexStrategy {
  /**
   * Sorts a list of videos by their index
   * @param {Array<Element>} videos
   * @param {"asc" | "desc"} sortOrder
   * @returns {Array<Element>}
   */
  sort(videos, sortOrder) {
    return [...videos].sort((videoA, videoB) => {
      const indexA = videoA.querySelector(
        elementSelectors.videoIndex
      ).innerText;
      const indexB = videoB.querySelector(
        elementSelectors.videoIndex
      ).innerText;

      if (sortOrder === "asc") {
        return Number(indexA) - Number(indexB);
      }

      if (sortOrder === "desc") {
        return Number(indexB) - Number(indexA);
      }
    });
  }
}
