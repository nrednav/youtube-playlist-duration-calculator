export class EnInViewsParser {
  /** @param {Element} videoInfo */
  parse(videoInfo) {
    const viewsElement = videoInfo.firstElementChild;
    const parts = viewsElement.textContent
      .toLowerCase()
      .replaceAll(/\s/g, " ")
      .split(" ");
    const baseViews = Number.parseFloat(parts[0]);

    if (parts.length === 3 && parts[1] === "lakh") {
      return Math.round(baseViews * 100_000);
    }

    if (parts.length === 2 && parts[0].endsWith("k")) {
      return Math.round(baseViews * 1000);
    }

    return Math.round(baseViews);
  }
}
