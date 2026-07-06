export class ZhHantTwViewsParser {
  /**
   * @param {string} rawText. The views text fragment, located upstream
   *   by structural invariant. Migration 2026-07-05: input changed from
   *   an element to a raw string. Locale logic unchanged.
   */
  parse(rawText) {
    const parts = rawText.trim().toLowerCase().split("："); // Note: This is not an ordinary colon character
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
