import test from "node:test";
import assert from "node:assert";
import { FrUploadDateParser } from "./fr.js";

test.describe("upload-date-parser/fr", () => {
  const testCases = [
    { input: "il y a 1 minute", expected: 1 * 60 },
    { input: "il y a 2 minutes", expected: 2 * 60 },
    { input: "il y a 1 heure", expected: 1 * 3600 },
    { input: "il y a 2 heures", expected: 2 * 3600 },
    { input: "il y a 1 jour", expected: 1 * 86400 },
    { input: "il y a 2 jours", expected: 2 * 86400 },
    { input: "il y a 1 semaine", expected: 1 * 7 * 86400 },
    { input: "il y a 2 semaines", expected: 2 * 7 * 86400 },
    { input: "il y a 1 mois", expected: 1 * 30 * 86400 },
    { input: "il y a 2 mois", expected: 2 * 30 * 86400 },
    { input: "il y a 1 an", expected: 1 * 365 * 86400 },
    { input: "il y a 2 ans", expected: 2 * 365 * 86400 }
  ];

  const parser = new FrUploadDateParser();

  for (const testCase of testCases) {
    test(testCase.input, () => {
      const variants = [testCase.input, `Diffusé ${testCase.input}`];

      for (const variant of variants) {
        const mockElement = {
          children: ["", "", { textContent: variant }]
        };

        const result = parser.parse(mockElement);

        assert.equal(result, testCase.expected);
      }
    });
  }
});
