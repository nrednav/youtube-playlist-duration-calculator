import { elementSelectors } from "../..";
import { EnUploadDateParser } from "./parsers/en";
import { ZhCnUploadDateParser } from "./parsers/zh_CN";

export class SortByUploadDateStrategy {
  static supportedLocales = ["en", "en-AU", "en-GB", "en-US", "zh-CN"];
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
    const context = new UploadDateParserContext();
    context.setParser(chrome.i18n.getUILanguage());
    return context.parse(videoInfo);
  }
}

export class UploadDateParserContext {
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
        this.parser = new EnUploadDateParser();
        break;
      case "zh-CN":
        this.parser = new ZhCnUploadDateParser();
        break;
      default:
        throw new Error("Unsupported locale for parsing upload dates");
    }
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
