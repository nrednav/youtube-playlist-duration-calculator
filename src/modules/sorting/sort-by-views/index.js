import { elementSelectors } from "src/shared/data/element-selectors";
import { getSupportedLocales, getViewsParser } from "./parsers";

export class SortByViewsStrategy {
  static supportedLocales = getSupportedLocales();

  /**
   * Sorts a list of videos by their view count
   * @param {Array<Element>} videos
   * @param {"asc" | "desc"} sortOrder
   * @returns {Array<Element>}
   */
  sort(videos, sortOrder) {
    return [...videos].sort((videoA, videoB) => {
      const videoInfoA = videoA.querySelector(elementSelectors.videoInfo);
      const videoInfoB = videoB.querySelector(elementSelectors.videoInfo);

      if (
        videoInfoA.children.length === 0 ||
        videoInfoB.children.length === 0
      ) {
        return 0;
      }

      const viewCountA = this.extractViews(videoInfoA);
      const viewCountB = this.extractViews(videoInfoB);

      if (sortOrder === "asc") {
        return viewCountA - viewCountB;
      }

      if (sortOrder === "desc") {
        return viewCountB - viewCountA;
      }
    });
  }

  /**
   * Extracts the view count as a number from a video info element
   * @param {Element} videoInfo
   * @returns {number}
   */
  extractViews(videoInfo) {
    const context = new ViewsParserContext(document.documentElement.lang);
    return context.parse(videoInfo);
  }
}

export class ViewsParserContext {
  /** @param {string} locale */
  constructor(locale) {
    const Parser = getViewsParser(locale);
    this.parser = new Parser();
  }

  /** @param {Element} videoInfo */
  parse(videoInfo) {
    if (!this.parser) {
      throw new Error("No views parser defined");
    }
    return this.parser.parse(videoInfo);
  }
}
