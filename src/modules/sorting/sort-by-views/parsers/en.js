export class EnViewsParser {
  /**
   * @param {string} rawText. The views text fragment (e.g. "5.7M views"),
   *   located upstream by structural invariant. Migration 2026-07-05:
   *   input changed from an element (whose firstElementChild held the
   *   views span) to a raw string, deleting the renderer-territory
   *   assumption from the parser contract. The locale suffix logic is
   *   preserved bit-for-bit.
   */
  parse(rawText) {
    const viewsRegex = /(\d+(\.\d+)?[km]?)/g;
    const [viewsString] = rawText.toLowerCase().match(viewsRegex);
    const suffix = viewsString.slice(-1);
    const baseViews = Number.parseFloat(viewsString);

    if (Number.isNaN(baseViews)) {
      return 0;
    }

    if (suffix === "k") {
      return Math.round(baseViews * 1000);
    }
    if (suffix === "m") {
      return Math.round(baseViews * 1_000_000);
    }
    return Math.round(baseViews);
  }
}
