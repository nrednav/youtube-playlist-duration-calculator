export class ZhCnUploadDateParser {
  /** @param {Element} videoInfo */
  parse(videoInfo) {
    const secondsByUnit = {
      "分钟": 60, // minute
      "小时": 60 * 60,
      "天": 1 * 86400,
      "周": 7 * 86400,
      "个月": 30 * 86400,
      "年": 365 * 86400 // year
    };

    const uploadDateElement = videoInfo.children[2];
    const uploadDateRegex = /(\d+)([\u4e00-\u9fa5]+)前/;
    const [value, unit] = uploadDateElement.textContent
      .toLowerCase()
      .match(uploadDateRegex)
      .slice(1); // This removes the 3rd match 前
    return parseFloat(value) * secondsByUnit[unit];
  }
}
