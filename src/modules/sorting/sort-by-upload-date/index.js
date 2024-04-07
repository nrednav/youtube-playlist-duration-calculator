import { elementSelectors } from "src/shared/data/element-selectors";
import { getSupportedLocales, getUploadDateParser } from "./parsers";

export class SortByUploadDateStrategy {
  static supportedLocales = getSupportedLocales();

  /**
   * Sorts a list of videos by their upload date
   * @param {Array<Element>} videos
   * @param {"asc" | "desc"} sortOrder
   * @returns {Array<Element>}
   */
  sort(videos, sortOrder) {
    return [...videos].sort((videoA, videoB) => {
      const videoInfoA = videoA.querySelector(elementSelectors.videoInfo);
      const videoInfoB = videoB.querySelector(elementSelectors.videoInfo);

      const secondsA = this.parseUploadDate(videoInfoA);
      const secondsB = this.parseUploadDate(videoInfoB);

      if (sortOrder === "asc") {
        return secondsA - secondsB;
      }

      if (sortOrder === "desc") {
        return secondsB - secondsA;
      }
    });
  }

  /**
   * Extracts the upload date from the video info element & parses it as seconds
   * @param {Element} videoInfo
   * @returns {number}
   */
  parseUploadDate(videoInfo) {
    const context = new UploadDateParserContext(document.documentElement.lang);
    return context.parse(videoInfo);
  }
}

export class UploadDateParserContext {
  /** @param {string} locale */
  constructor(locale) {
    const Parser = getUploadDateParser(locale);
    this.parser = new Parser();
  }

  /**
   * Parses the upload date found within the video info element and returns its
   * numerical value as seconds
   * @param {Element} videoInfo
   */
  parse(videoInfo) {
    if (!this.parser) {
      throw new Error("No upload date parser defined");
    }
    return this.parser.parse(videoInfo);
  }
}
