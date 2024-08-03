export class FrUploadDateParser {
  /** @param {Element} videoInfo */
  parse(videoInfo) {
    const secondsByUnit = {
      minute: 60,
      heure: 60 * 60,
      jour: 1 * 86400,
      semaine: 7 * 86400,
      mois: 30 * 86400,
      an: 365 * 86400
    };

    const uploadDateRegex =
      /(?:Diffusé )?il y a (\d+) (minutes?|heures?|jours?|semaines?|mois|ans?)/u;

    const uploadDateElement = videoInfo.children[2];

    const [value, unit] = uploadDateElement.textContent
      .toLowerCase()
      .match(uploadDateRegex)
      .slice(1);

    const seconds =
      secondsByUnit[unit] ?? secondsByUnit[unit.slice(0, -1)] ?? 1;

    return parseFloat(value) * seconds;
  }
}
