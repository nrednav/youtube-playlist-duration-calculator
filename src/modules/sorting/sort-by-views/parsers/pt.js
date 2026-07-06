export class PtViewsParser {
  /**
   * @param {string} rawText. The views text fragment, located upstream
   *   by structural invariant. Migration 2026-07-05: input changed from
   *   an element to a raw string. Locale logic unchanged.
   */
  parse(rawText) {
    const parts = rawText.toLowerCase().replaceAll(/\s/g, " ").split(" ");
    const baseViews = Number.parseFloat(parts[0].replace(",", "."));

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
