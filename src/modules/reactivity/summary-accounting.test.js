import assert from "node:assert";
import { describe, it } from "node:test";
import { deriveSummaryCounts } from "./summary-accounting.js";

const timestampsOf = ({ valid, missing }) => [
  ...Array.from({ length: valid }, () => 60),
  ...Array.from({ length: missing }, () => null),
];

describe("deriveSummaryCounts()", () => {
  it("counts only the timestamps that were summed", () => {
    const result = deriveSummaryCounts({
      timestamps: timestampsOf({ valid: 25, missing: 65 }),
      nullTimestamps: 65,
      totalVideosInPlaylist: 90,
    });

    assert.strictEqual(result.counted, 25);
  });

  it("reports the remaining videos as not counted", () => {
    const result = deriveSummaryCounts({
      timestamps: timestampsOf({ valid: 25, missing: 65 }),
      nullTimestamps: 65,
      totalVideosInPlaylist: 90,
    });

    assert.strictEqual(result.notCounted, 65);
  });

  it("keeps counted and not counted summing to the playlist total", () => {
    for (const [valid, missing, total] of [
      [0, 0, 90],
      [25, 65, 90],
      [90, 0, 90],
      [3, 1, 10],
    ]) {
      const { counted, notCounted } = deriveSummaryCounts({
        timestamps: timestampsOf({ valid, missing }),
        nullTimestamps: missing,
        totalVideosInPlaylist: total,
      });

      assert.strictEqual(counted + notCounted, total);
    }
  });

  it("counts every video when no timestamp is missing", () => {
    const result = deriveSummaryCounts({
      timestamps: timestampsOf({ valid: 90, missing: 0 }),
      nullTimestamps: 0,
      totalVideosInPlaylist: 90,
    });

    assert.deepStrictEqual(result, { counted: 90, notCounted: 0 });
  });

  it("never reports a negative not-counted row", () => {
    const result = deriveSummaryCounts({
      timestamps: timestampsOf({ valid: 5, missing: 0 }),
      nullTimestamps: 0,
      totalVideosInPlaylist: 3,
    });

    assert.deepStrictEqual(result, { counted: 5, notCounted: 0 });
  });

  it("reports an unknown playlist total as null", () => {
    for (const total of [null, undefined, Number.NaN, 0]) {
      const result = deriveSummaryCounts({
        timestamps: timestampsOf({ valid: 3, missing: 0 }),
        nullTimestamps: 0,
        totalVideosInPlaylist: total,
      });

      assert.strictEqual(
        result.notCounted,
        null,
        `total ${String(total)} must be treated as unknown`,
      );
      assert.strictEqual(result.counted, 3);
    }
  });
});
