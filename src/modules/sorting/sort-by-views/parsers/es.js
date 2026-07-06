export class EsViewsParser {
  /**
   * @param {string} rawText. The views text fragment, located upstream
   *   by structural invariant. Migration 2026-07-05: input changed from
   *   an element to a raw string. Locale logic unchanged.
   */
  parse(rawText) {
    const [value, unit] = rawText
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
