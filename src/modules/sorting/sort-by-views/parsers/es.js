export class EsViewsParser {
  /** @param {Element} videoInfo */
  parse(videoInfo) {
    const viewsElement = videoInfo.firstElementChild;
    const [value, unit] = viewsElement.textContent
      .trim()
      .toLowerCase()
      .replaceAll(/\s/g, " ")
      .split(" ");

    const baseViews = Number.parseFloat(value.replace(",", "."));

    if (Number.isNaN(baseViews)) {
      return 0;
    }

    if (unit === "k") {
      return Math.round(baseViews * 1000);
    }
    if (unit === "m") {
      return Math.round(baseViews * 1_000_000);
    }
    return Math.round(baseViews);
  }
}
