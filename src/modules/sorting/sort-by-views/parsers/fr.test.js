import assert from "node:assert";
import test from "node:test";
import { FrViewsParser } from "./fr.js";

test.describe("views-parser/fr", () => {
  const testCases = [
    { input: "1 vue", expected: 1 },
    { input: "420 vues", expected: 420 },
    { input: "2,4 k vues", expected: 2.4 * 1000 },
    { input: "870 k vues", expected: 870 * 1000 },
    { input: "1,4 M de vues", expected: 1.4 * 1_000_000 },
  ];

  const parser = new FrViewsParser();

  for (const testCase of testCases) {
    test(testCase.input, () => {
      // Migration 2026-07-05: parser now takes the raw views string, not
      // a mock element with firstElementChild.textContent. The locale
      // suffix and word logic is unchanged.
      const result = parser.parse(testCase.input);

      assert.equal(result, testCase.expected);
    });
  }
});
