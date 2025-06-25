import { describe, it } from "node:test";
import assert from "node:assert";
import {
  convertSecondsToTimestamp,
  convertTimestampToSeconds,
  getTimestampFromVideo,
} from "./timestamp.js";

import { elementSelectors } from "src/shared/data/element-selectors.js";

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

  describe("getTimestampFromVideo()", () => {
    const createMockElement = (innerText) => ({
      querySelector: (selector) => {
        if (selector === elementSelectors.timestamp) {
          return { innerText };
        }

        return null;
      },
    });

    it("should return null if no video element is provided", () => {
      assert.strictEqual(getTimestampFromVideo(null), null);
    });

    it("should return null if the timestamp element is not found", () => {
      const mockVideo = { querySelector: () => null };
      assert.strictEqual(getTimestampFromVideo(mockVideo), null);
    });

    it("should return null if the timestamp element has no innerText", () => {
      const mockVideo = createMockElement(null);
      assert.strictEqual(getTimestampFromVideo(mockVideo), null);
    });

    it("should extract and convert a valid timestamp", () => {
      const mockVideo = createMockElement("1:23:45");
      assert.strictEqual(getTimestampFromVideo(mockVideo), 5025);
    });

    it("should handle timestamps with extra whitespace and newlines", () => {
      const mockVideo = createMockElement("  \n2:05 \n ");
      assert.strictEqual(getTimestampFromVideo(mockVideo), 125);
    });

    it("should return 0 if the timestamp text is not in a valid format (e.g., 'Live')", () => {
      const mockVideo = createMockElement("Live");
      assert.strictEqual(getTimestampFromVideo(mockVideo), 0);
    });

    it("should correctly parse a timestamp from a real-world example", () => {
      const mockVideo = createMockElement("9:59");
      assert.strictEqual(getTimestampFromVideo(mockVideo), 599);
    });
  });
});
