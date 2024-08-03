export class FrViewsParser {
  /** @param {Element} videoInfo */
  parse(videoInfo) {
    const viewsElement = videoInfo.firstElementChild;
    const [value, unit] = viewsElement.textContent
      .trim()
      .toLowerCase()
      .replaceAll(/\s/g, " ")
      .split(" ");

    const baseViews = parseFloat(value.replace(",", "."));

    if (isNaN(baseViews)) {
      return 0;
    }

    if (unit === "k") {
      return Math.round(baseViews * 1000);
    } else if (unit === "m") {
      return Math.round(baseViews * 1_000_000);
    } else {
      return Math.round(baseViews);
    }
  }
}
