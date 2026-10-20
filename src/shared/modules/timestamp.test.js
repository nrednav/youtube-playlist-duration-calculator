import assert from "node:assert";
import { describe, it } from "node:test";
import {
  convertSecondsToTimestamp,
  convertTimestampToSeconds,
} from "./timestamp.js";

describe("timestamp module", () => {
  describe("convertSecondsToTimestamp()", () => {
    it("should convert total seconds into hh:mm:ss format", () => {
      assert.strictEqual(convertSecondsToTimestamp(7322), "02:02:02");
    });

    it("should handle values less than a minute", () => {
      assert.strictEqual(convertSecondsToTimestamp(45), "00:00:45");
    });

    it("should handle values less than an hour", () => {
      assert.strictEqual(convertSecondsToTimestamp(1337), "00:22:17");
    });

    it("should handle exactly zero seconds", () => {
      assert.strictEqual(convertSecondsToTimestamp(0), "00:00:00");
    });

    it("should handle exactly one hour", () => {
      assert.strictEqual(convertSecondsToTimestamp(3600), "01:00:00");
    });

    it("should handle large values correctly", () => {
      assert.strictEqual(convertSecondsToTimestamp(86399), "23:59:59"); // 24 hours - 1 second
    });

    it("should guard against negative input", () => {
      assert.strictEqual(convertSecondsToTimestamp(-100), "00:00:00");
    });

    it("should guard against non-finite input", () => {
      assert.strictEqual(convertSecondsToTimestamp(Number.NaN), "00:00:00");
      assert.strictEqual(
        convertSecondsToTimestamp(Number.POSITIVE_INFINITY),
        "00:00:00",
      );
    });
  });

  describe("convertTimestampToSeconds()", () => {
    it("should convert a full hh:mm:ss timestamp to seconds", () => {
      assert.strictEqual(convertTimestampToSeconds("02:02:02"), 7322);
    });

    it("should convert a mm:ss timestamp to seconds", () => {
      assert.strictEqual(convertTimestampToSeconds("22:17"), 1337);
    });

    it("should convert a ss timestamp to seconds", () => {
      assert.strictEqual(convertTimestampToSeconds("45"), 45);
    });

    it("should handle single-digit components", () => {
      assert.strictEqual(convertTimestampToSeconds("1:2:3"), 3723);
    });

    it("should return 0 for malformed or non-numeric timestamps", () => {
      assert.strictEqual(convertTimestampToSeconds("a:b:c"), 0);
      assert.strictEqual(convertTimestampToSeconds("hello world"), 0);
    });

    it("should throw an error if the input is null or undefined", () => {
      assert.throws(() => convertTimestampToSeconds(null), TypeError);
      assert.throws(() => convertTimestampToSeconds(undefined), TypeError);
    });
  });
});
