export class EnUploadDateParser {
  /**
   * @param {string} rawText. The upload-date text fragment (e.g.
   *   "8 years ago"), located upstream by structural invariant.
   *   Migration 2026-07-05: input changed from an element (whose
   *   children[2] held the date span) to a raw string, deleting the
   *   renderer-territory assumption. Locale regex/unit logic unchanged.
   */
  parse(rawText) {
    const secondsByUnit = {
      minute: 60,
      hour: 60 * 60,
      day: 1 * 86400,
      week: 7 * 86400,
      month: 30 * 86400,
      year: 365 * 86400,
    };

    const uploadDateRegex = /(?:streamed )?(\d+) (\w+) ago/;
    const [value, unit] = rawText.toLowerCase().match(uploadDateRegex).slice(1);
    const normalizedUnit = unit.endsWith("s") ? unit.slice(0, -1) : unit;
    return Number.parseFloat(value) * secondsByUnit[normalizedUnit];
  }
}
