import { getTimestampFromVideo } from "src/shared/modules/timestamp";

export class SortByDurationStrategy {
  /**
   * Sorts a list of videos by their duration
   * @param {Array<Element>} videos
   * @param {"asc" | "desc"} sortOrder
   * @returns {Array<Element>}
   */
  sort(videos, sortOrder) {
    return [...videos].sort((videoA, videoB) => {
      const timestampA = getTimestampFromVideo(videoA);
      const timestampB = getTimestampFromVideo(videoB);

      if (sortOrder === "asc") {
        return timestampA - timestampB;
      }

      if (sortOrder === "desc") {
        return timestampB - timestampA;
      }
    });
  }
}
