import assert from "node:assert";
import { describe, it } from "node:test";
import { isSortingEnabledForCount, SORT_VIDEO_CAP } from "./sort-cap.js";

describe("sort-cap module", () => {
  describe("isSortingEnabledForCount()", () => {
    it("enables sorting for a small known count", () => {
      assert.strictEqual(isSortingEnabledForCount(0), true);
      assert.strictEqual(isSortingEnabledForCount(1), true);
      assert.strictEqual(isSortingEnabledForCount(50), true);
    });

    it("enables sorting strictly below the cap, not at the cap", () => {
      assert.strictEqual(
        isSortingEnabledForCount(SORT_VIDEO_CAP - 1),
        true,
        "just under the cap must be enabled",
      );
      assert.strictEqual(
        isSortingEnabledForCount(SORT_VIDEO_CAP),
        false,
        "at the cap must be disabled",
      );
    });

    it("disables sorting at and above the cap", () => {
      assert.strictEqual(isSortingEnabledForCount(SORT_VIDEO_CAP), false);
      assert.strictEqual(isSortingEnabledForCount(SORT_VIDEO_CAP + 1), false);
      assert.strictEqual(isSortingEnabledForCount(10_000), false);
    });

    it("disables sorting when the count is unknown", () => {
      assert.strictEqual(isSortingEnabledForCount(null), false);
      assert.strictEqual(isSortingEnabledForCount(undefined), false);
    });

    it("disables sorting when the count is not a valid number", () => {
      assert.strictEqual(isSortingEnabledForCount(Number.NaN), false);
    });

    it("does NOT rely on JS null-coercion (the prior bug)", () => {
      // Regression lock: `null <= 100` would have been `true` and enabled
      // the dropdown. The predicate must explicitly refuse null.
      assert.notStrictEqual(isSortingEnabledForCount(null), true);
    });
  });
});
