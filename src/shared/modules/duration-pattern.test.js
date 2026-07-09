import assert from "node:assert";
import { describe, it } from "node:test";
import { extractDuration, isDurationText } from "./duration-pattern.js";

describe("isDurationText", () => {
  it("accepts valid MM:SS", () => {
    assert.strictEqual(isDurationText("4:30"), true);
    assert.strictEqual(isDurationText("59:59"), true);
  });
  it("accepts valid H:MM:SS and long-form hours", () => {
    assert.strictEqual(isDurationText("1:04:30"), true);
    assert.strictEqual(isDurationText("12:04:30"), true);
    assert.strictEqual(isDurationText("100:00:00"), true);
  });
  it("rejects seconds >= 60 (invalid clock)", () => {
    assert.strictEqual(isDurationText("9:99"), false);
    assert.strictEqual(isDurationText("59:60"), false);
    assert.strictEqual(isDurationText("1:02:60"), false);
  });
  it("rejects non-duration text", () => {
    assert.strictEqual(isDurationText("LIVE"), false);
    assert.strictEqual(isDurationText("Upcoming"), false);
    assert.strictEqual(isDurationText(""), false);
    assert.strictEqual(isDurationText(null), false);
    assert.strictEqual(isDurationText(undefined), false);
  });
});

describe("extractDuration", () => {
  it("extracts the duration substring from mixed text", () => {
    assert.strictEqual(
      extractDuration("Title 4:30 Channel 1.2M views"),
      "4:30",
    );
  });
  it("returns null when no valid duration is present", () => {
    assert.strictEqual(extractDuration("No duration here"), null);
    assert.strictEqual(extractDuration("9:99"), null);
  });
  it("extracts long-form hours", () => {
    assert.strictEqual(extractDuration("100:00:00"), "100:00:00");
  });
});
