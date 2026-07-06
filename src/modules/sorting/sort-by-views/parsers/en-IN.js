export class EnInViewsParser {
  /**
   * @param {string} rawText. The views text fragment, located upstream
   *   by structural invariant. Migration 2026-07-05: input changed from
   *   an element to a raw string. Locale logic unchanged.
   */
  parse(rawText) {
    const parts = rawText.toLowerCase().replaceAll(/\s/g, " ").split(" ");
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
