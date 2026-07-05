import assert from "node:assert";
import { describe, it } from "node:test";
import { buildReportUrl, detectBrowser } from "./report-url.js";

describe("detectBrowser", () => {
  it("returns Firefox for a Firefox user agent", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0";
    assert.strictEqual(detectBrowser(ua), "Firefox");
  });

  it("returns Chrome for a Chrome user agent", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
    assert.strictEqual(detectBrowser(ua), "Chrome");
  });

  it("returns Edge for an Edge user agent (Edg token)", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0";
    assert.strictEqual(detectBrowser(ua), "Edge");
  });

  it("returns Opera for an OPR user agent", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 OPR/113.0.0.0";
    assert.strictEqual(detectBrowser(ua), "Opera");
  });

  it("returns Safari for a Safari-only user agent", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
    assert.strictEqual(detectBrowser(ua), "Safari");
  });

  it("returns Unknown for an empty user agent", () => {
    assert.strictEqual(detectBrowser(""), "Unknown");
    assert.strictEqual(detectBrowser(undefined), "Unknown");
  });

  it("does not leak OS or full version", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0";
    const result = detectBrowser(ua);
    // Result should be a bare browser name with no version or OS tokens
    assert.strictEqual(result, "Firefox");
    assert.ok(!result.includes("10.0"));
    assert.ok(!result.includes("128.0"));
  });
});

describe("buildReportUrl", () => {
  it("builds a URL containing the form base path", () => {
    const url = buildReportUrl({
      extensionVersion: "2.3.0",
      userAgent: "Mozilla/5.0 Firefox/128.0",
      locale: "en",
    });
    assert.ok(url.startsWith("https://docs.google.com/forms/d/e/"));
    assert.ok(url.includes("/viewform?"));
  });

  it("encodes extension version into the correct entry field", () => {
    const url = buildReportUrl({
      extensionVersion: "2.3.0",
      userAgent: "Firefox",
      locale: "en",
    });
    assert.ok(url.includes("entry.516432152=2.3.0"));
  });

  it("encodes browser into the correct entry field", () => {
    const url = buildReportUrl({
      extensionVersion: "2.3.0",
      userAgent: "Mozilla/5.0 Firefox/128.0",
      locale: "en",
    });
    assert.ok(url.includes("entry.597972634=Firefox"));
  });

  it("encodes locale into the correct entry field", () => {
    const url = buildReportUrl({
      extensionVersion: "2.3.0",
      userAgent: "Firefox",
      locale: "pt",
    });
    assert.ok(url.includes("entry.998836863=pt"));
  });

  it("only pre-fills version/browser/locale and leaves user fields blank", () => {
    const url = buildReportUrl({
      extensionVersion: "2.3.0",
      userAgent: "Firefox",
      locale: "en",
    });
    // The form has 5 entry IDs total. Only 3 should appear in the URL.
    // The other 2 (description, expectation) must NOT be pre-filled.
    const entryCount = (url.match(/entry\.\d+=/g) || []).length;
    assert.strictEqual(entryCount, 3);
  });

  it("handles missing values by falling back to unknown", () => {
    const url = buildReportUrl({});
    assert.ok(url.includes("entry.516432152=unknown"));
    assert.ok(url.includes("entry.597972634=Unknown"));
    assert.ok(url.includes("entry.998836863=unknown"));
  });

  it("produces a URL-decodable body free of PII beyond browser name", () => {
    const url = buildReportUrl({
      extensionVersion: "2.3.0",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
      locale: "en",
    });
    const decoded = decodeURIComponent(url);
    // The full UA string must NOT appear in the URL
    assert.ok(!decoded.includes("Windows NT"));
    assert.ok(!decoded.includes("rv:128"));
    assert.ok(!decoded.includes("Gecko"));
  });
});
