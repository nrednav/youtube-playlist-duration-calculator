import assert from "node:assert";
import { describe, it } from "node:test";
import {
  extractTimestampByPattern,
  extractTitleByPattern,
} from "./content-pattern-extraction.js";

const createMockElement = (tagName, opts = {}) => ({
  tagName: tagName.toUpperCase(),
  textContent: opts.textContent || "",
  querySelector(sel) {
    return opts.querySelector?.(sel) || null;
  },
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

describe("extractTimestampByPattern, badge-first regression (Bug 1)", () => {
  // Regression tests for the Upcoming scheduled-time false positive.
  // Real Upcoming video items embed a scheduled-time string (e.g.
  // "Scheduled for 7/5/26, 4:00 AM") in adjacent metadata text. The
  // loose /\d{1,2}:\d{2}/ regex matches "4:00" from that metadata if
  // the function scans the whole video element textContent instead of
  // consulting the dedicated duration badge element first. These
  // tests pin the badge-first behavior so the bug cannot return.

  it("returns the badge duration when badge-shape exists with a clean duration", () => {
    const badge = createMockElement("badge-shape", { textContent: "29:20" });
    const el = createMockElement("yt-lockup-view-model", {
      textContent: "Some Title T1 1.7M views 2 years ago 29:20",
      querySelector: (sel) =>
        sel === "ytd-thumbnail-overlay-time-status-renderer" ? null : badge,
      querySelectorAll: (sel) => (sel === "badge-shape" ? [badge] : []),
    });
    const result = extractTimestampByPattern(el);
    assert.strictEqual(result.value, "29:20");
    assert.ok(result.confidence >= 0.9);
  });

  it("returns null for Upcoming badge and refuses to scan metadata text", () => {
    // The lockup's textContent contains "Scheduled for 05/07/2026, 04:00".
    // The naive text-scan path would match "04:00" and silently count
    // the Upcoming video as a 4-minute duration. With the badge-first
    // guard, the "Upcoming" badge is a definitive non-duration signal
    // and the function must NOT fall through to text scanning.
    const badge = createMockElement("badge-shape", {
      textContent: "Upcoming",
    });
    const el = createMockElement("yt-lockup-view-model", {
      textContent:
        "Tokyo | many many records Robcdee 3 waiting Scheduled for 05/07/2026, 04:00",
      querySelector: (sel) =>
        sel === "ytd-thumbnail-overlay-time-status-renderer" ? null : badge,
      querySelectorAll: (sel) => (sel === "badge-shape" ? [badge] : []),
    });
    const result = extractTimestampByPattern(el);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.confidence, 0);
  });

  it("returns null for LIVE badge and refuses to scan metadata text", () => {
    const badge = createMockElement("badge-shape", { textContent: "LIVE" });
    const el = createMockElement("yt-lockup-view-model", {
      textContent: "LIVE: Some Stream Newsmax 1.7k watching",
      querySelector: (sel) =>
        sel === "ytd-thumbnail-overlay-time-status-renderer" ? null : badge,
      querySelectorAll: (sel) => (sel === "badge-shape" ? [badge] : []),
    });
    const result = extractTimestampByPattern(el);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.confidence, 0);
  });

  it("returns null when badge-shape exists with empty text", () => {
    // An empty badge is still a badge element. The badge is authoritative
    // and the function must NOT fall through to text scanning (which
    // would risk false positives). Only when NO badge is present at all
    // is the text scan used.
    const badge = createMockElement("badge-shape", { textContent: "" });
    const el = createMockElement("div", {
      textContent: "Title 12:34 Channel",
      querySelector: (sel) =>
        sel === "ytd-thumbnail-overlay-time-status-renderer" ? null : badge,
      querySelectorAll: (sel) => (sel === "badge-shape" ? [badge] : []),
    });
    const result = extractTimestampByPattern(el);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.confidence, 0);
  });

  it("prefers badge-shape with duration text over non-duration badge (viewmodel)", () => {
    // On the viewmodel architecture, a lockup may contain multiple
    // badge-shape elements (e.g. playlist position index "3" AND
    // duration "45:30"). resolveDurationBadge must pick the one with
    // duration text, not the first in DOM order.
    const indexBadge = createMockElement("badge-shape", {
      textContent: "3",
    });
    const durationBadge = createMockElement("badge-shape", {
      textContent: "45:30",
    });
    const el = createMockElement("yt-lockup-view-model", {
      textContent: "My Jazz Playlist 45:30 Jazz Artist 1.2M views 3",
      querySelector: (_sel) => null,
      querySelectorAll: (sel) =>
        sel === "badge-shape" ? [indexBadge, durationBadge] : [],
    });
    const result = extractTimestampByPattern(el);
    assert.strictEqual(result.value, "45:30");
    assert.ok(result.confidence >= 0.9);
  });

  it("finds duration in non-badge descendant via full-element scan", () => {
    // On the viewmodel architecture during SPA navigation, no badge-shape
    // element contains duration text. The duration is rendered in another
    // element (e.g. a span whose textContent is just "4:30"). The
    // descendant scan must find it.
    const durationSpan = createMockElement("span", {
      textContent: "4:30",
    });
    const el = createMockElement("yt-lockup-view-model", {
      textContent: "Title 4:30 Channel 1.2M views 2 years ago",
      querySelector: (sel) =>
        sel === "ytd-thumbnail-overlay-time-status-renderer" ? null : null,
      querySelectorAll: (sel) => (sel === "badge-shape" ? [] : [durationSpan]),
    });
    const result = extractTimestampByPattern(el);
    assert.strictEqual(result.value, "4:30");
    assert.ok(result.confidence >= 0.9);
  });

  it("falls back to text scan when no badge element exists", () => {
    // Unavailable videos have neither badge-shape nor
    // ytd-thumbnail-overlay-time-status-renderer. The fallback path is
    // safe in real DOM because real Upcoming or Live videos always have a
    // badge present, so the false-positive trap is unreachable here.
    const el = createMockElement("div", {
      textContent: "12:34",
      querySelector: () => null,
      querySelectorAll: () => [],
    });
    const result = extractTimestampByPattern(el);
    assert.strictEqual(result.value, "12:34");
    assert.ok(result.confidence >= 0.6);
  });

  it("rejects an invalid-seconds badge (9:99) as no duration", () => {
    const badge = createMockElement("badge-shape", { textContent: "9:99" });
    const el = createMockElement("yt-lockup-view-model", {
      textContent: "Title 9:99 Channel",
      querySelector: (sel) =>
        sel === "ytd-thumbnail-overlay-time-status-renderer" ? null : badge,
      querySelectorAll: (sel) => (sel === "badge-shape" ? [badge] : []),
    });
    const result = extractTimestampByPattern(el);
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
