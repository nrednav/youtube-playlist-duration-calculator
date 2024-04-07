export class PtUploadDateParser {
  /** @param {Element} videoInfo */
  parse(videoInfo) {
    const secondsByUnit = {
      minuto: 60,
      hora: 60 * 60,
      dia: 1 * 86400,
      semana: 7 * 86400,
      mês: 30 * 86400,
      meses: 30 * 86400,
      ano: 365 * 86400
    };

    const uploadDateElement = videoInfo.children[2];
    const uploadDateRegex =
      /(?:transmitido )?há (\d+) (minutos?|horas?|dias?|semanas?|mês|meses|anos?)/u;
    const [value, unit] = uploadDateElement.textContent
      .toLowerCase()
      .replaceAll(/\s/g, " ")
      .match(uploadDateRegex)
      .slice(1);

    const seconds =
      secondsByUnit[unit] ?? secondsByUnit[unit.slice(0, -1)] ?? 1;

    return parseFloat(value) * seconds;
  }
}
