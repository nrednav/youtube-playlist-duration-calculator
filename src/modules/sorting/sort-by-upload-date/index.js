import { extractUploadDate } from "src/modules/extraction/upload-date-extraction";
import { getSupportedLocales } from "./parsers";

export class SortByUploadDateStrategy {
  static supportedLocales = getSupportedLocales();

  /**
   * Sorts a list of videos by their upload date.
   *
   * Previously called
   * `video.querySelector(elementSelectors.videoInfo)` and read
   * `children[2]`, a renderer-territory assumption. On viewmodel it
   * returned null and crashed. The strategy now consumes the
   * architecture-agnostic `extractUploadDate` extractor, which locates
   * the date fragment by structural invariant (the metadata-row fragment
   * after the delimiter).
   *
   * @param {Array<Element>} videos
   * @param {"asc" | "desc"} sortOrder
   * @returns {Array<Element>}
   */
  sort(videos, sortOrder) {
    return [...videos].sort((videoA, videoB) => {
      const secondsA = extractUploadDate(videoA).value ?? 0;
      const secondsB = extractUploadDate(videoB).value ?? 0;

      if (sortOrder === "asc") {
        return secondsA - secondsB;
      }

      if (sortOrder === "desc") {
        return secondsB - secondsA;
      }

      return 0;
    });
  }
}
