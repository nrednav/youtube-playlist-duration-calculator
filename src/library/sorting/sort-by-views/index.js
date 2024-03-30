import { EnViewsParser } from "./parsers/en";
import { ZhCnViewsParser } from "./parsers/zh_CN";

export class SortByViewsStrategy {
  static supportedLocales = ["en", "en-AU", "en-GB", "en-US", "zh-CN"];

  /**
   * Sorts a list of videos by their view count
   * @param {Array<Element>} videos
   * @param {"asc" | "desc"} sortOrder
   * @returns {Array<Element>}
   */
  sort(videos, sortOrder) {
    return Array.from(videos)
      .slice(0, 100)
      .sort((videoA, videoB) => {
        const videoInfoA = videoA.querySelector(
          "yt-formatted-string#video-info"
        );
        const videoInfoB = videoB.querySelector(
          "yt-formatted-string#video-info"
        );

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
    context.setParser(chrome.i18n.getUILanguage());
    return context.parse(videoInfo);
  }
}

export class ViewsParserContext {
  constructor() {
    this.parser = null;
  }

  /** @param {string} locale */
  setParser(locale) {
    switch (locale) {
      case "en":
      case "en-AU":
      case "en-GB":
      case "en-US":
        this.parser = new EnViewsParser();
        break;
      case "zh-CN":
        this.parser = new ZhCnViewsParser();
        break;
      default:
        throw new Error("Unsupported locale for parsing views");
    }
  }

  /** @param {Element} videoInfo */
  parse(videoInfo) {
    if (!this.parser) {
      throw new Error("No views parser defined");
    }
    return this.parser.parse(videoInfo);
  }
}
