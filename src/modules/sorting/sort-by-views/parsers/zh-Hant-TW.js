export class ZhHantTwViewsParser {
  /** @param {Element} videoInfo */
  parse(videoInfo) {
    const viewsElement = videoInfo.firstElementChild;
    const parts = viewsElement.textContent.trim().toLowerCase().split("："); // Note: This is not an ordinary colon character
    const baseViews = Number.parseFloat(parts[1]);

    if (Number.isNaN(baseViews)) {
      return 0;
    }

    if (parts[1].endsWith("萬次")) {
      return Math.round(baseViews * 10_000);
    }

    if (parts[1].endsWith("次")) {
      return Math.round(baseViews);
    }

    return Math.round(baseViews);
  }
}
