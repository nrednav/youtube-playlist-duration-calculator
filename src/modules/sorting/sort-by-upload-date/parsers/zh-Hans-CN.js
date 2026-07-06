export class ZhHansCnUploadDateParser {
  /**
   * @param {string} rawText. The upload-date text fragment, located
   *   upstream by structural invariant. Migration 2026-07-05: input
   *   changed from an element to a raw string. Locale logic unchanged.
   */
  parse(rawText) {
    const secondsByUnit = {
      分钟: 60, // minute
      小时: 60 * 60,
      天: 1 * 86400,
      周: 7 * 86400,
      个月: 30 * 86400,
      年: 365 * 86400, // year
    };

    const uploadDateRegex = /(\d+)([\u4e00-\u9fa5]+)前/;
    const [value, unit] = rawText.toLowerCase().match(uploadDateRegex).slice(1); // This removes the 3rd match 前
    return Number.parseFloat(value) * secondsByUnit[unit];
  }
}
