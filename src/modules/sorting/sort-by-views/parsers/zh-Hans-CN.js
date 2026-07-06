export class ZhHansCnViewsParser {
  /**
   * @param {string} rawText. The views text fragment, located upstream
   *   by structural invariant. Migration 2026-07-05: input changed from
   *   an element to a raw string. Locale logic unchanged.
   */
  parse(rawText) {
    const viewsRegex = /(\d+(\.\d+)?万?)/g;
    const [viewsString] = rawText.toLowerCase().match(viewsRegex);
    const suffix = viewsString.slice(-1);
    const baseViews = Number.parseFloat(viewsString);

    if (Number.isNaN(baseViews)) {
      return 0;
    }

    if (suffix === "万") {
      return Math.round(baseViews * 10_000);
    }

    return Math.round(baseViews);
  }
}
