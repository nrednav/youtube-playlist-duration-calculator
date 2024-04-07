export class PtViewsParser {
  /** @param {Element} videoInfo */
  parse(videoInfo) {
    const viewsElement = videoInfo.firstElementChild;
    const parts = viewsElement.textContent
      .toLowerCase()
      .replaceAll(/\s/g, " ")
      .split(" ");
    const baseViews = parseFloat(parts[0].replace(",", "."));

    if (parts.length === 3 && parts[1] === "mil") {
      return Math.round(baseViews * 1000);
    }

    if (
      parts.length === 4 &&
      ["m", "mi"].includes(parts[1]) &&
      parts[2] === "de"
    ) {
      return Math.round(baseViews * 1_000_000);
    }

    return Math.round(baseViews);
  }
}
