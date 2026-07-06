export class FrUploadDateParser {
  /**
   * @param {string} rawText. The upload-date text fragment, located
   *   upstream by structural invariant. Migration 2026-07-05: input
   *   changed from an element to a raw string. Locale logic unchanged.
   */
  parse(rawText) {
    const secondsByUnit = {
      minute: 60,
      heure: 60 * 60,
      jour: 1 * 86400,
      semaine: 7 * 86400,
      mois: 30 * 86400,
      an: 365 * 86400,
    };

    const uploadDateRegex =
      /(?:Diffusé )?il y a (\d+) (minutes?|heures?|jours?|semaines?|mois|ans?)/u;

    const [value, unit] = rawText.toLowerCase().match(uploadDateRegex).slice(1);

    const seconds =
      secondsByUnit[unit] ?? secondsByUnit[unit.slice(0, -1)] ?? 1;

    return Number.parseFloat(value) * seconds;
  }
}
