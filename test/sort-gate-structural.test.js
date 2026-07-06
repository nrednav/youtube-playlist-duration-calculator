import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";

// Mock chrome before importing any module that consults chrome.i18n or
// chrome.runtime. The gate calls chrome.i18n.getMessage for sort labels.
globalThis.chrome = {
  runtime: { getManifest: () => ({ version: "0.0.0" }) },
  i18n: {
    getMessage: (key) => key, // return the key itself; we only count options
  },
};

const { PlaylistSorter } = await import("../src/modules/sorting/index.js");

const FIXTURES_DIR = path.join(import.meta.dirname, "fixtures", "real");

/**
 * Load a real-world single-video-item fixture into a JSDOM document and
 * install it as the global document so the sort gate's document.querySelector
 * resolves against the fixture. Restore the prior document after each test.
 */
const withFixtureDocument = (file, lang = "en") => {
  const html = fs.readFileSync(path.join(FIXTURES_DIR, file), "utf-8");
  const dom = new JSDOM(html);
  dom.window.document.documentElement.lang = lang;
  return dom.window.document;
};

describe("PlaylistSorter.getSortTypes, structural-invariant integration", () => {
  // The sort gate must report all five sort types as
  // enabled on the viewmodel architecture. Pre-fix, only Duration and
  // Index were enabled on viewmodel because videoHasElement hardcodes
  // `return false` for channelName and videoInfo on the viewmodel branch.
  // The extractor-based gate keys off structural-invariant presence, not
  // element names, so it returns true on both architectures.

  it("enables all five sort types on the viewmodel architecture", () => {
    const prevDoc = globalThis.document;
    globalThis.document = withFixtureDocument(
      "viewmodel-video-item-normal.html",
    );

    try {
      const sortTypes = PlaylistSorter.getSortTypes();

      assert.ok(sortTypes.index.enabled, "index must be enabled");
      assert.ok(sortTypes.duration.enabled, "duration must be enabled");
      assert.ok(sortTypes.channelName.enabled, "channelName must be enabled");
      assert.ok(sortTypes.views.enabled, "views must be enabled");
      assert.ok(sortTypes.uploadDate.enabled, "uploadDate must be enabled");
    } finally {
      globalThis.document = prevDoc;
    }
  });

  it("enables all five sort types on the renderer architecture", () => {
    const prevDoc = globalThis.document;
    globalThis.document = withFixtureDocument(
      "renderer-video-item-normal.html",
    );

    try {
      const sortTypes = PlaylistSorter.getSortTypes();

      assert.ok(sortTypes.index.enabled, "index must be enabled");
      assert.ok(sortTypes.duration.enabled, "duration must be enabled");
      assert.ok(sortTypes.channelName.enabled, "channelName must be enabled");
      assert.ok(sortTypes.views.enabled, "views must be enabled");
      assert.ok(sortTypes.uploadDate.enabled, "uploadDate must be enabled");
    } finally {
      globalThis.document = prevDoc;
    }
  });

  it("renders all five sort options (asc+desc = 10 rows) on viewmodel", () => {
    const prevDoc = globalThis.document;
    globalThis.document = withFixtureDocument(
      "viewmodel-video-item-normal.html",
    );

    try {
      const options = PlaylistSorter.getSortOptions();
      // 5 sort types × 2 orders = 10 options.
      assert.strictEqual(
        options.length,
        10,
        `expected 10 sort options on viewmodel, got ${options.length}`,
      );
    } finally {
      globalThis.document = prevDoc;
    }
  });
});

describe("PlaylistSorter, structural-invariant sort execution on viewmodel", () => {
  // END-TO-END PROOF: the gate proving options render is necessary but
  // not sufficient. Pre-migration, the strategies called renderer-only
  // selectors (elementSelectors.videoInfo, .ytd-channel-name) directly,
  // so even if the gate had shown options, clicking them would have
  // thrown on viewmodel. These tests prove the strategies execute to
  // completion against real viewmodel DOM and produce correctly-ordered
  // output, by consuming the architecture-agnostic extractors.

  /**
   * Build a JSDOM document containing N cloned viewmodel lockups, each
   * with its channel/views/date text rewritten to the given tuple, so
   * the sort strategies have multiple distinguishable items to order.
   */
  const buildViewModelDoc = (rows) => {
    const baseHtml = fs.readFileSync(
      path.join(FIXTURES_DIR, "viewmodel-video-item-normal.html"),
      "utf-8",
    );
    const dom = new JSDOM(baseHtml);
    const doc = dom.window.document;
    doc.documentElement.lang = "en";

    // Locate the single template lockup, clone it N times, rewrite the
    // channel/views/date spans in each clone.
    const template = doc.querySelector("yt-lockup-view-model");
    if (!template) throw new Error("template lockup not found in fixture");
    const parent = template.parentElement;

    for (const { channel, views, date } of rows) {
      const clone = template.cloneNode(true);
      rewriteChannel(clone, channel);
      rewriteViews(clone, views);
      rewriteDate(clone, date);
      parent.appendChild(clone);
    }
    // Remove the template (first) lockup so only the cloned rows remain.
    template.remove();
    return doc;
  };

  const rewriteChannel = (lockup, name) => {
    const anchor = [...lockup.querySelectorAll("a")].find((a) =>
      (a.getAttribute("href") || "").startsWith("/@"),
    );
    if (anchor) anchor.textContent = name;
  };

  const rewriteViews = (lockup, text) => {
    const spans = [
      ...lockup.querySelectorAll(".ytContentMetadataViewModelMetadataRow span"),
    ];
    const viewsSpan = spans.find((s) => /views/i.test(s.textContent || ""));
    if (viewsSpan) viewsSpan.textContent = text;
  };

  const rewriteDate = (lockup, text) => {
    const spans = [
      ...lockup.querySelectorAll(".ytContentMetadataViewModelMetadataRow span"),
    ];
    const delimiterIdx = spans.findIndex(
      (s) => (s.textContent || "").trim() === "•",
    );
    if (delimiterIdx >= 0 && spans[delimiterIdx + 1]) {
      spans[delimiterIdx + 1].textContent = text;
      spans[delimiterIdx + 1].setAttribute("aria-label", text);
    }
  };

  it("sorts viewmodel videos by channel name without throwing", () => {
    const rows = [
      { channel: "Zeta", views: "1K views", date: "1 year ago" },
      { channel: "Alpha", views: "2K views", date: "2 years ago" },
      { channel: "Mu", views: "3K views", date: "3 years ago" },
    ];
    const prevDoc = globalThis.document;
    globalThis.document = buildViewModelDoc(rows);

    try {
      const videos = [
        ...globalThis.document.querySelectorAll("yt-lockup-view-model"),
      ];
      const sorted = new PlaylistSorter("channelName:asc").sort(videos);
      const names = sorted.map((v) => {
        const a = [...v.querySelectorAll("a")].find((x) =>
          (x.getAttribute("href") || "").startsWith("/@"),
        );
        return a?.textContent;
      });
      assert.deepStrictEqual(names, ["Alpha", "Mu", "Zeta"]);
    } finally {
      globalThis.document = prevDoc;
    }
  });

  it("sorts viewmodel videos by views without throwing", () => {
    const rows = [
      { channel: "Z", views: "3K views", date: "1 year ago" },
      { channel: "A", views: "1K views", date: "2 years ago" },
      { channel: "M", views: "2K views", date: "3 years ago" },
    ];
    const prevDoc = globalThis.document;
    globalThis.document = buildViewModelDoc(rows);

    try {
      const videos = [
        ...globalThis.document.querySelectorAll("yt-lockup-view-model"),
      ];
      const asc = new PlaylistSorter("views:asc").sort(videos);
      const desc = new PlaylistSorter("views:desc").sort(videos);

      const viewsOf = (v) => {
        const text =
          [
            ...v.querySelectorAll(
              ".ytContentMetadataViewModelMetadataRow span",
            ),
          ].find((s) => /views/i.test(s.textContent || ""))?.textContent || "";
        const m = text.toLowerCase().match(/([\d.]+)\s*k?/);
        if (!m) return 0;
        const base = Number.parseFloat(m[1]);
        return text.toLowerCase().includes("k") ? base * 1000 : base;
      };

      assert.deepStrictEqual(asc.map(viewsOf), [1000, 2000, 3000]);
      assert.deepStrictEqual(desc.map(viewsOf), [3000, 2000, 1000]);
    } finally {
      globalThis.document = prevDoc;
    }
  });

  it("sorts viewmodel videos by upload date without throwing", () => {
    const rows = [
      { channel: "Z", views: "1K views", date: "3 years ago" },
      { channel: "A", views: "2K views", date: "1 year ago" },
      { channel: "M", views: "3K views", date: "2 years ago" },
    ];
    const prevDoc = globalThis.document;
    globalThis.document = buildViewModelDoc(rows);

    try {
      const videos = [
        ...globalThis.document.querySelectorAll("yt-lockup-view-model"),
      ];
      const asc = new PlaylistSorter("uploadDate:asc").sort(videos);
      const desc = new PlaylistSorter("uploadDate:desc").sort(videos);

      const yearsOf = (v) =>
        Number.parseInt(
          [...v.querySelectorAll(".ytContentMetadataViewModelMetadataRow span")]
            .find((s) => /ago/i.test(s.getAttribute("aria-label") || ""))
            ?.textContent?.replace(/\D/g, "") || "0",
          10,
        );

      assert.deepStrictEqual(asc.map(yearsOf), [1, 2, 3], "asc = oldest first");
      assert.deepStrictEqual(
        desc.map(yearsOf),
        [3, 2, 1],
        "desc = newest first",
      );
    } finally {
      globalThis.document = prevDoc;
    }
  });
});
