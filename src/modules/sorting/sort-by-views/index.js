import { elementSelectors } from "src/shared/data/element-selectors";
import { EnViewsParser } from "./parsers/en";
import { ZhCnViewsParser } from "./parsers/zh_CN";

const PARSERS_BY_LOCALE = {
  "en": EnViewsParser,
  "en-GB": EnViewsParser,
  "en-IN": EnViewsParser,
  "en-US": EnViewsParser,
  "zh-Hans-CN": ZhCnViewsParser
};

export class SortByViewsStrategy {
  static supportedLocales = Object.keys(PARSERS_BY_LOCALE);

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
    const context = new ViewsParserContext();
    context.setParser(document.documentElement.lang);
    return context.parse(videoInfo);
  }
}

export class ViewsParserContext {
  constructor() {
    this.parser = null;
  }

  /** @param {string} locale */
  setParser(locale) {
    const Parser = PARSERS_BY_LOCALE[locale] ?? EnViewsParser;
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
