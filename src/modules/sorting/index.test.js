import assert from "node:assert";
import { describe, it } from "node:test";
import { isDurationText } from "../../shared/modules/duration-pattern";

describe("sorting index uses the shared duration validator (smoke)", () => {
  it("rejects invalid seconds", () => {
    assert.strictEqual(isDurationText("9:99"), false);
  });
});
