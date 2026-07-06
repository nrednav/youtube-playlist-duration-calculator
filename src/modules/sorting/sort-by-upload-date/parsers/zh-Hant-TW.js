export class ZhHantTwUploadDateParser {
  /**
   * @param {string} rawText. The upload-date text fragment, located
   *   upstream by structural invariant. Migration 2026-07-05: input
   *   changed from an element to a raw string. Locale logic unchanged.
   */
  parse(rawText) {
    const secondsByUnit = {
      分鐘: 60, // minute
      小時: 60 * 60,
      天: 1 * 86400,
      週: 7 * 86400,
      個月: 30 * 86400,
      年: 365 * 86400, // year
    };

    const uploadDateRegex = /(\d+)(.*)前/;
    const [value, unit] = rawText
      .toLowerCase()
      .replaceAll(/\s/g, " ")
      .match(uploadDateRegex)
      .slice(1)
      .map((x) => x.trim());
    return Number.parseFloat(value) * secondsByUnit[unit];
  }
}
