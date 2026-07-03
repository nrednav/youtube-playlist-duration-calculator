import assert from "node:assert";
import { describe, it } from "node:test";
import {
  extractTimestampByPattern,
  extractTitleByPattern,
} from "./content-pattern-extraction.js";

const createMockElement = (tagName, opts = {}) => ({
  tagName: tagName.toUpperCase(),
  textContent: opts.textContent || "",
  querySelectorAll(sel) {
    return opts.querySelectorAll?.(sel) || [];
  },
  getAttribute(attr) {
    return opts.attributes?.[attr] || null;
  },
});

describe("extractTimestampByPattern", () => {
  it("extracts MM:SS format", () => {
    const el = createMockElement("div", { textContent: "12:34" });
    const result = extractTimestampByPattern(el);
    assert.strictEqual(result.value, "12:34");
    assert.ok(result.confidence > 0.8); // standalone match
  });

  it("extracts HH:MM:SS format", () => {
    const el = createMockElement("div", { textContent: "1:23:45" });
    const result = extractTimestampByPattern(el);
    assert.strictEqual(result.value, "1:23:45");
    assert.ok(result.confidence > 0.8);
  });

  it("extracts duration from text with surrounding content", () => {
    const el = createMockElement("div", {
      textContent: "Title\n  12:34\n  Channel",
    });
    const result = extractTimestampByPattern(el);
    assert.strictEqual(result.value, "12:34");
    // Not standalone, so lower confidence
    assert.ok(result.confidence >= 0.6);
  });

  it("returns null for text without timestamp", () => {
    const el = createMockElement("div", { textContent: "No timestamp here" });
    const result = extractTimestampByPattern(el);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.confidence, 0);
  });

  it("returns null for null input", () => {
    const result = extractTimestampByPattern(null);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.confidence, 0);
  });
});

describe("extractTitleByPattern", () => {
  it("extracts title from anchor title attribute", () => {
    const anchor = createMockElement("a", {
      attributes: { title: "Test Video Title" },
      textContent: "Test Video Title",
    });
    const parent = createMockElement("div", {
      querySelectorAll: () => [anchor],
    });
    const result = extractTitleByPattern(parent);
    assert.strictEqual(result.value, "Test Video Title");
    assert.strictEqual(result.confidence, 0.8);
  });

  it("picks the longest title among multiple anchors", () => {
    const shortAnchor = createMockElement("a", {
      attributes: { title: "Short" },
      textContent: "Short",
    });
    const longAnchor = createMockElement("a", {
      attributes: { title: "The Full Long Video Title" },
      textContent: "The Full Long Video Title",
    });
    const parent = createMockElement("div", {
      querySelectorAll: () => [shortAnchor, longAnchor],
    });
    const result = extractTitleByPattern(parent);
    assert.strictEqual(result.value, "The Full Long Video Title");
  });

  it("returns null when no anchor found", () => {
    const parent = createMockElement("div", { querySelectorAll: () => [] });
    const result = extractTitleByPattern(parent);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.confidence, 0);
  });
});
