export class ZhHansCnViewsParser {
  /** @param {Element} videoInfo */
  parse(videoInfo) {
    const viewsElement = videoInfo.firstElementChild;
    const viewsRegex = /(\d+(\.\d+)?万?)/g;
    const [viewsString] = viewsElement.textContent
      .toLowerCase()
      .match(viewsRegex);
    const suffix = viewsString.slice(-1);
    const baseViews = parseFloat(viewsString);

    if (isNaN(baseViews)) {
      return 0;
    }

    if (suffix === "万") {
      return Math.round(baseViews * 10_000);
    }

    return Math.round(baseViews);
  }
}
