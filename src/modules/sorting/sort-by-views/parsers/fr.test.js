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
      const mockElement = {
        firstElementChild: {
          textContent: testCase.input,
        },
      };

      const result = parser.parse(mockElement);

      assert.equal(result, testCase.expected);
    });
  }
});
