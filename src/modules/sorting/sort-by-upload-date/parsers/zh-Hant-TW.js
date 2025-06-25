export class ZhHantTwUploadDateParser {
  /** @param {Element} videoInfo */
  parse(videoInfo) {
    const secondsByUnit = {
      分鐘: 60, // minute
      小時: 60 * 60,
      天: 1 * 86400,
      週: 7 * 86400,
      個月: 30 * 86400,
      年: 365 * 86400, // year
    };

    const uploadDateElement = videoInfo.children[2];
    const uploadDateRegex = /(\d+)(.*)前/;
    const [value, unit] = uploadDateElement.textContent
      .toLowerCase()
      .replaceAll(/\s/g, " ")
      .match(uploadDateRegex)
      .slice(1)
      .map((x) => x.trim());
    return Number.parseFloat(value) * secondsByUnit[unit];
  }
}
