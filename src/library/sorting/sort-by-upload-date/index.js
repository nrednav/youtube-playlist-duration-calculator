export class SortByUploadDateStrategy {
  static supportedLocales = ["en", "en-AU", "en-GB", "en-US"];
  /**
   * Sorts a list of videos by their upload date
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

        const secondsA = this.extractUploadDateAsSeconds(videoInfoA);
        const secondsB = this.extractUploadDateAsSeconds(videoInfoB);

        if (sortOrder === "asc") {
          return secondsA - secondsB;
        }

        if (sortOrder === "desc") {
          return secondsB - secondsA;
        }
      });
  }

  /**
   * Extracts the upload date as seconds from a video info element
   * @param {Element} videoInfo
   * @returns {number}
   */
  extractUploadDateAsSeconds(videoInfo) {
    const secondsByUnit = {
      day: 1 * 86400,
      week: 7 * 86400,
      month: 30 * 86400,
      year: 365 * 86400
    };

    const uploadDateElement = videoInfo.children[2];
    const uploadDateRegex = /(\d+) (\w+) ago/;
    const [value, unit] = uploadDateElement.textContent
      .toLowerCase()
      .match(uploadDateRegex)
      .slice(1);
    const normalizedUnit = unit.endsWith("s") ? unit.slice(0, -1) : unit;
    return parseFloat(value) * secondsByUnit[normalizedUnit];
  }
}
