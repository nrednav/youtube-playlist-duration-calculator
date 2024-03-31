export class EnViewsParser {
  /** @param {Element} videoInfo */
  parse(videoInfo) {
    const viewsElement = videoInfo.firstElementChild;
    const viewsRegex = /(\d+(\.\d+)?[km]?)/g;
    const [viewsString] = viewsElement.textContent
      .toLowerCase()
      .match(viewsRegex);
    const suffix = viewsString.slice(-1);
    const baseViews = parseFloat(viewsString);

    if (isNaN(baseViews)) {
      return 0;
    }

    if (suffix === "k") {
      return Math.round(baseViews * 1000);
    } else if (suffix === "m") {
      return Math.round(baseViews * 1_000_000);
    } else {
      return Math.round(baseViews);
    }
  }
}
