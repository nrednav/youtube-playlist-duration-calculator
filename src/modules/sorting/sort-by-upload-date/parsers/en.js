export class EnUploadDateParser {
  /** @param {Element} videoInfo */
  parse(videoInfo) {
    const secondsByUnit = {
      minute: 60,
      hour: 60 * 60,
      day: 1 * 86400,
      week: 7 * 86400,
      month: 30 * 86400,
      year: 365 * 86400
    };

    const uploadDateElement = videoInfo.children[2];
    const uploadDateRegex = /(\d+) (\w+) ago/;
    const [value, unit] = uploadDateElement.textContent
      .toLowerCase()
      .match(uploadDateRegex)
      .slice(1);
    const normalizedUnit = unit.endsWith("s") ? unit.slice(0, -1) : unit;
    return parseFloat(value) * secondsByUnit[normalizedUnit];
  }
}
