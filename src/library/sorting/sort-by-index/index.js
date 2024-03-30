export class SortByIndexStrategy {
  /**
   * Sorts a list of videos by their index
   * @param {Array<Element>} videos
   * @param {"asc" | "desc"} sortOrder
   * @returns {Array<Element>}
   */
  sort(videos, sortOrder) {
    return Array.from(videos).sort((videoA, videoB) => {
      const indexA = videoA.querySelector(
        "yt-formatted-string#index"
      ).innerText;
      const indexB = videoB.querySelector(
        "yt-formatted-string#index"
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
