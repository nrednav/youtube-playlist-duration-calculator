import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";

// Mock chrome.runtime before importing strategies
globalThis.chrome = {
  runtime: {
    getManifest: () => ({ version: "0.0.0" }),
  },
};

const { discoverPlaylist } = await import(
  "../src/modules/discovery/orchestrator.js"
);
const { extractTimestamp } = await import(
  "../src/modules/extraction/orchestrator.js"
);
const { extractTimestampByPattern } = await import(
  "../src/modules/extraction/content-pattern-extraction.js"
);

const FIXTURES_DIR = path.join(import.meta.dirname, "fixtures", "real");

/**
 * Read a real-world fixture file and return a JSDOM document.
 * @param {string} name - Filename in test/fixtures/real/
 * @returns {Document}
 */
const loadRealFixture = (name) => {
  const html = fs.readFileSync(path.join(FIXTURES_DIR, name), "utf-8");
  return new JSDOM(html).window.document;
};

/**
 * Extract the first video element from a single-video-item fixture.
 * @param {string} name
 * @param {string} selector - CSS selector for the video element
 * @returns {Element}
 */
const getVideoFromFixture = (name, selector) => {
  const doc = loadRealFixture(name);
  return doc.querySelector(selector);
};

const RENDERER_SELECTOR = "ytd-playlist-video-renderer";
const VIEWMODEL_SELECTOR = "yt-lockup-view-model";

/**
 * Real-world fixtures grouped by architecture. Each fixture file is a
 * single video item captured from a real YouTube playlist DOM on
 * 2026-07-05. This corpus replaces the stylized cartoons in
 * test/fixtures/ for the cases it covers.
 */
const REAL_FIXTURES = {
  renderer: [
    { file: "renderer-video-item-normal.html", expectedDuration: "15:31" },
    {
      file: "renderer-video-item-unavailable-private.html",
      expectedDuration: null,
    },
    {
      file: "renderer-video-item-unavailable-deleted.html",
      expectedDuration: null,
    },
    { file: "renderer-video-item-live.html", expectedDuration: null },
    { file: "renderer-video-item-upcoming.html", expectedDuration: null },
  ],
  viewmodel: [
    { file: "viewmodel-video-item-normal.html", expectedDuration: "29:20" },
    {
      file: "viewmodel-video-item-unavailable.html",
      expectedDuration: null,
    },
    { file: "viewmodel-video-item-live.html", expectedDuration: null },
    { file: "viewmodel-video-item-upcoming.html", expectedDuration: null },
  ],
};

describe("Real-World Fixture Corpus, Extraction Fidelity", () => {
  for (const [arch, fixtures] of Object.entries(REAL_FIXTURES)) {
    const selector =
      arch === "renderer" ? RENDERER_SELECTOR : VIEWMODEL_SELECTOR;

    describe(`${arch} architecture`, () => {
      for (const { file, expectedDuration } of fixtures) {
        const expectation =
          expectedDuration === null
            ? "MUST return null (no duration)"
            : `MUST extract ${expectedDuration}`;

        it(`${file}: ${expectation}`, () => {
          const video = getVideoFromFixture(file, selector);

          assert.ok(video, `selector ${selector} did not match in ${file}`);

          const result = extractTimestamp(video);

          if (expectedDuration === null) {
            assert.strictEqual(
              result.seconds,
              null,
              `Expected null duration for ${file} but got ${
                result.seconds
              } via ${result.strategyName}`,
            );
          } else {
            assert.strictEqual(
              result.seconds,
              convertDurationToSeconds(expectedDuration),
              `Expected ${expectedDuration} for ${file} but got ${
                result.seconds
              } via ${result.strategyName}`,
            );
            assert.ok(result.confidence > 0);
          }
        });
      }
    });
  }
});

describe("Real-World Fixture Corpus, Content-Pattern False-Positive Probe", () => {
  // The content-pattern strategy scans the entire video element
  // textContent for /\d{1,2}:\d{2}(:\d{2})?/. Real DOM contains
  // "Scheduled for 7/5/26, 4:00 AM" and "Scheduled for 05/07/2026,
  // 04:00". These MUST NOT produce duration matches.
  it("renderer upcoming: content-pattern does not match scheduled time", () => {
    const video = getVideoFromFixture(
      "renderer-video-item-upcoming.html",
      RENDERER_SELECTOR,
    );
    const result = extractTimestampByPattern(video);

    assert.strictEqual(
      result.value,
      null,
      `Expected null but content-pattern matched "${result.value}" (probably "4:00" from the scheduled time)`,
    );
  });

  it("viewmodel upcoming: content-pattern does not match scheduled time", () => {
    const video = getVideoFromFixture(
      "viewmodel-video-item-upcoming.html",
      VIEWMODEL_SELECTOR,
    );
    const result = extractTimestampByPattern(video);

    assert.strictEqual(
      result.value,
      null,
      `Expected null but content-pattern matched "${result.value}" (probably "04:00" from the scheduled time)`,
    );
  });

  it("viewmodel live: content-pattern does not match watching count or live text", () => {
    const video = getVideoFromFixture(
      "viewmodel-video-item-live.html",
      VIEWMODEL_SELECTOR,
    );
    const result = extractTimestampByPattern(video);

    // The lockup's textContent includes "1.7k watching". No HH:MM:SS,
    // so this should be null. If it ever matches, that is a regression.
    assert.strictEqual(
      result.value,
      null,
      `Expected null but content-pattern matched "${result.value}"`,
    );
  });

  it("viewmodel normal: content-pattern extracts the badge duration, not metadata noise", () => {
    const video = getVideoFromFixture(
      "viewmodel-video-item-normal.html",
      VIEWMODEL_SELECTOR,
    );
    const result = extractTimestampByPattern(video);

    assert.ok(result.value, "content-pattern must match on normal viewmodel");
    assert.strictEqual(result.value, "29:20");
  });
});

describe("Real-World Fixture Corpus, Sort Selector Validation", () => {
  // Sort selectors are validated against real DOM. If YouTube changes
  // these element shapes, these tests break before they ship.
  it("renderer normal: channel name selector resolves", () => {
    const video = getVideoFromFixture(
      "renderer-video-item-normal.html",
      RENDERER_SELECTOR,
    );

    const channelEl = video.querySelector(".ytd-channel-name");
    assert.ok(channelEl, ".ytd-channel-name selector must match");
    // jsdom does not implement layout-aware `innerText` (returns
    // undefined). Assert on textContent containment instead. The real
    // DOM duplicates the channel name in a hidden tooltip inside this
    // element, so exact-equality would be fragile across redesigns.
    // Production sort code reads .innerText and works in real browsers.
    assert.ok(
      channelEl.textContent.includes("TEDx Talks"),
      `channel text must include expected name, got: ${channelEl.textContent}`,
    );
  });

  it("renderer normal: video title selector resolves with title attribute", () => {
    const video = getVideoFromFixture(
      "renderer-video-item-normal.html",
      RENDERER_SELECTOR,
    );

    const titleEl = video.querySelector("#video-title");
    assert.ok(titleEl, "#video-title selector must match");
    assert.strictEqual(
      titleEl.getAttribute("title"),
      "Sugar is Not a Treat | Jody Stanislaw | TEDxSunValley",
    );
  });

  it("renderer normal: video index selector resolves", () => {
    const video = getVideoFromFixture(
      "renderer-video-item-normal.html",
      RENDERER_SELECTOR,
    );

    const indexEl = video.querySelector("yt-formatted-string#index");
    assert.ok(indexEl, "yt-formatted-string#index selector must match");
    assert.strictEqual(indexEl.textContent, "5");
  });

  it("renderer normal: video info selector has views and upload date", () => {
    const video = getVideoFromFixture(
      "renderer-video-item-normal.html",
      RENDERER_SELECTOR,
    );

    const infoEl = video.querySelector("yt-formatted-string#video-info");
    assert.ok(infoEl, "yt-formatted-string#video-info selector must match");
    assert.ok(
      infoEl.children.length > 0,
      "video-info must have children spans",
    );
    const text = infoEl.textContent;
    assert.ok(text.includes("5.7M views"), `got: ${text}`);
    assert.ok(text.includes("8 years ago"), `got: ${text}`);
  });

  it("renderer live: video info contains 'watching' not 'views'", () => {
    const video = getVideoFromFixture(
      "renderer-video-item-live.html",
      RENDERER_SELECTOR,
    );

    const infoEl = video.querySelector("yt-formatted-string#video-info");
    assert.ok(infoEl);
    const text = infoEl.textContent;
    assert.ok(text.includes("watching"), `got: ${text}`);
    // The view-count sort parser must NOT mistake "1.8K watching" for
    // a view count. This is a precondition the parser must handle.
    assert.ok(!text.includes("views"), `"watching" is not "views": ${text}`);
  });
});

describe("Real-World Fixture Corpus, Discovery Strategy Sanity", () => {
  // Discovery orchestrator runs against a single isolated video item.
  // The structural-invariant strategy should find the lockup on
  // viewmodel fixtures. On renderer fixtures isolated outside their
  // container, discovery of the *container* cannot be tested. But
  // the strategy must not crash or return negative confidence.
  it("viewmodel normal: structural-invariant finds the lockup", () => {
    const doc = loadRealFixture("viewmodel-video-item-normal.html");
    const result = discoverPlaylist(doc);

    assert.ok(
      result.videos?.length > 0 || result.container,
      "viewmodel discovery must produce a candidate",
    );
    assert.strictEqual(result.videoSelector, "yt-lockup-view-model");
  });

  it("viewmodel unavailable: structural-invariant still finds the lockup even without a duration", () => {
    const doc = loadRealFixture("viewmodel-video-item-unavailable.html");
    const result = discoverPlaylist(doc);

    // The unavailable lockup has no badge-shape duration. Discovery
    // must still locate the lockup so downstream consumers can count
    // it as "video not parseable" rather than missing it entirely.
    assert.ok(
      result.videos?.length > 0 || result.container,
      "unavailable viewmodel lockup must still be discovered",
    );
  });
});

/**
 * Convert "MM:SS" or "HH:MM:SS" to seconds for test assertions.
 * @param {string} timestamp
 * @returns {number}
 */
const convertDurationToSeconds = (timestamp) => {
  const parts = timestamp.split(":").map((p) => Number.parseInt(p, 10));
  let seconds = 0;
  let multiplier = 1;
  while (parts.length > 0) {
    const part = parts.pop();
    if (Number.isNaN(part)) continue;
    seconds += part * multiplier;
    multiplier *= 60;
  }
  return seconds;
};
