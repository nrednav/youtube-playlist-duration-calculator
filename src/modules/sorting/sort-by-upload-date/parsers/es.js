export class EsUploadDateParser {
  /**
   * @param {string} rawText. The upload-date text fragment, located
   *   upstream by structural invariant. Migration 2026-07-05: input
   *   changed from an element to a raw string. Locale logic unchanged.
   */
  parse(rawText) {
    const secondsByUnit = {
      minuto: 60,
      hora: 60 * 60,
      día: 1 * 86400,
      semana: 7 * 86400,
      mes: 30 * 86400,
      meses: 30 * 86400,
      año: 365 * 86400,
    };

    const uploadDateRegex =
      /(?:emitido )?hace (\d+) (minutos?|horas?|días?|semanas?|mes|meses|años?)/u;
    const [value, unit] = rawText.toLowerCase().match(uploadDateRegex).slice(1);

    const seconds =
      secondsByUnit[unit] ?? secondsByUnit[unit.slice(0, -1)] ?? 1;

    return Number.parseFloat(value) * seconds;
  }
}
