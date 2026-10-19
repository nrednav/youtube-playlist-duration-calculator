import assert from "node:assert";
import { registerHooks } from "node:module";
import { after, describe, it, mock } from "node:test";

// main.js imports its stylesheet, which Node cannot execute. The extension's
// behaviour is what is under test, not the sheet.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.endsWith(".css")) {
      return { url: "data:text/javascript,", shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const { JSDOM, VirtualConsole } = await import("jsdom");

const PLAYLIST_TOTAL = 154;

const jsdomErrors = [];
const virtualConsole = new VirtualConsole();

virtualConsole.on("jsdomError", (error) => {
  jsdomErrors.push(error);
});

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "https://www.youtube.com/playlist?list=PLintegration",
  virtualConsole,
});

const { window } = dom;

// Three browser behaviours the content script depends on that jsdom does not
// implement faithfully. Each shim is answered from real DOM state.
//
// checkVisibility: jsdom reports offsetParent as null for everything, so the
// second clause is always reached. Attachment is the honest proxy.
//
// innerText: jsdom performs no layout, so textContent is the closest real
// reading. The content script reads duration and count text this way.
//
// Scoped querySelector on a bare id: jsdom resolves it through a document-wide
// id index, so a video renderer holding a repeated id (YouTube reuses
// id="video-title" on every renderer) resolves to nothing. Browsers match
// within the subtree, which is what the scoped querySelectorAll already does.
Object.defineProperty(window.Element.prototype, "checkVisibility", {
  value() {
    return this.isConnected;
  },
  configurable: true,
});
Object.defineProperty(window.HTMLElement.prototype, "innerText", {
  get() {
    return this.textContent;
  },
  configurable: true,
});

const unscopedIdQuerySelector = window.Element.prototype.querySelector;

window.Element.prototype.querySelector = function scopedQuerySelector(
  selector,
) {
  if (/^#[\w-]+$/.test(selector)) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  return unscopedIdQuerySelector.call(this, selector);
};

globalThis.window = window;
globalThis.document = window.document;
globalThis.MutationObserver = window.MutationObserver;
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
globalThis.chrome = {
  runtime: { getManifest: () => ({ version: "0.0.0" }) },
  i18n: { getMessage: (key) => key },
};

mock.timers.enable({ apis: ["setInterval"] });

await import("../src/main.js");

const videoRenderer = ({ title, duration = "" }) => `
  <ytd-playlist-video-renderer>
    <a id="video-title" title="${title}"></a>
    <ytd-thumbnail-overlay-time-status-renderer>${duration}</ytd-thumbnail-overlay-time-status-renderer>
  </ytd-playlist-video-renderer>`;

const playlistPage = (videos) => `
  <ytd-playlist-sidebar-renderer>
    <div id="items"><div class="header"></div></div>
    <div id="stats"><yt-formatted-string>${PLAYLIST_TOTAL} videos</yt-formatted-string></div>
  </ytd-playlist-sidebar-renderer>
  <ytd-playlist-video-list-renderer>
    <div id="contents">${videos.join("")}</div>
  </ytd-playlist-video-list-renderer>`;

const startSession = (html) => {
  document.body.innerHTML = html;
  document.dispatchEvent(new window.Event("yt-navigate-finish"));
};

const poll = (ticks = 1) => {
  for (let index = 0; index < ticks; index += 1) {
    mock.timers.tick(1000);
  }
};

const summaryValues = () => {
  const summary = document.querySelector("#ytpdc-playlist-summary-old");

  if (!summary) return null;

  const values = {};

  for (const item of summary.querySelectorAll(".ytpdc-playlist-summary-item")) {
    const label = item.querySelector(
      ".ytpdc-playlist-summary-item-label",
    ).textContent;
    const value = item.querySelector(
      ".ytpdc-playlist-summary-item-value",
    ).textContent;

    values[label] = value;
  }

  return values;
};

const durationElements = () => [
  ...document.querySelectorAll("ytd-thumbnail-overlay-time-status-renderer"),
];

describe("playlist readiness and summary accounting", () => {
  it("waits for durations that render late, then totals all of them", () => {
    startSession(
      playlistPage([
        videoRenderer({ title: "A", duration: "1:00" }),
        videoRenderer({ title: "B", duration: "2:00" }),
        videoRenderer({ title: "C" }),
        videoRenderer({ title: "D" }),
      ]),
    );

    poll(3);

    assert.strictEqual(
      summaryValues(),
      null,
      "no summary may appear while two durations are still missing",
    );

    const [, , third, fourth] = durationElements();
    third.textContent = "3:00";
    fourth.textContent = "4:00";

    poll(1);

    assert.deepStrictEqual(summaryValues(), {
      playlistSummary_totalDuration: "00:10:00",
      playlistSummary_videosCounted: "4",
      playlistSummary_videosNotCounted: "150",
    });
  });

  it("counts an unavailable video as not counted without waiting for it", () => {
    startSession(
      playlistPage([
        videoRenderer({ title: "A", duration: "1:00" }),
        videoRenderer({ title: "B", duration: "2:00" }),
        videoRenderer({ title: "videoTitle_private" }),
      ]),
    );

    poll(2);

    assert.deepStrictEqual(summaryValues(), {
      playlistSummary_totalDuration: "00:03:00",
      playlistSummary_videosCounted: "2",
      playlistSummary_videosNotCounted: "152",
    });
  });

  it("does not wait for an unavailable item with an unseen title", () => {
    startSession(
      playlistPage([
        videoRenderer({ title: "A", duration: "1:00" }),
        videoRenderer({ title: "[Vidéo privée]" }),
      ]),
    );

    poll(2);

    assert.deepStrictEqual(summaryValues(), {
      playlistSummary_totalDuration: "00:01:00",
      playlistSummary_videosCounted: "1",
      playlistSummary_videosNotCounted: "153",
    });
  });

  it("does not wait for a described item that has no title", () => {
    startSession(
      playlistPage([
        videoRenderer({ title: "A", duration: "1:00" }),
        "<ytd-playlist-video-renderer><span>No views</span></ytd-playlist-video-renderer>",
      ]),
    );

    poll(2);

    assert.deepStrictEqual(summaryValues(), {
      playlistSummary_totalDuration: "00:01:00",
      playlistSummary_videosCounted: "1",
      playlistSummary_videosNotCounted: "153",
    });
  });

  it("computes once from available durations when the budget runs out", () => {
    startSession(
      playlistPage([
        videoRenderer({ title: "A", duration: "1:00" }),
        videoRenderer({ title: "B" }),
        videoRenderer({ title: "C" }),
      ]),
    );

    poll(1);

    assert.strictEqual(
      summaryValues(),
      null,
      "one poll must not compute a total",
    );

    poll(59);

    assert.strictEqual(
      summaryValues(),
      null,
      "the wait must be bounded, not abandoned",
    );

    poll(2);

    assert.deepStrictEqual(summaryValues(), {
      playlistSummary_totalDuration: "00:01:00",
      playlistSummary_videosCounted: "1",
      playlistSummary_videosNotCounted: "153",
    });
  });

  it("recomputes when durations arrive after the budget runs out", () => {
    startSession(
      playlistPage([
        videoRenderer({ title: "A", duration: "1:00" }),
        videoRenderer({ title: "B" }),
        videoRenderer({ title: "C" }),
      ]),
    );

    poll(61);

    assert.deepStrictEqual(summaryValues(), {
      playlistSummary_totalDuration: "00:01:00",
      playlistSummary_videosCounted: "1",
      playlistSummary_videosNotCounted: "153",
    });

    const [, second, third] = durationElements();
    second.textContent = "2:00";
    third.textContent = "3:00";

    poll(1);

    assert.deepStrictEqual(
      summaryValues(),
      {
        playlistSummary_totalDuration: "00:06:00",
        playlistSummary_videosCounted: "3",
        playlistSummary_videosNotCounted: "151",
      },
      "a duration that renders after the fallback must be summed",
    );
  });

  it("does not throw when the page has no metadata insertion point", () => {
    startSession(`
      <ytd-playlist-sidebar-renderer><div class="header"></div></ytd-playlist-sidebar-renderer>
      <ytd-playlist-video-list-renderer>
        <div id="contents">
          ${videoRenderer({ title: "A", duration: "1:00" })}
        </div>
      </ytd-playlist-video-list-renderer>`);

    assert.doesNotThrow(
      () => poll(2),
      "a missing metadata element must not throw out of the poll tick",
    );

    assert.strictEqual(
      summaryValues(),
      null,
      "nothing may be inserted without an insertion point",
    );
  });

  it("survives a throwing poll tick and stops polling", () => {
    startSession(
      playlistPage([videoRenderer({ title: "A", duration: "1:00" })]),
    );

    const video = document.querySelector("ytd-playlist-video-renderer");
    const original = video.querySelector;

    video.querySelector = () => {
      throw new Error("boom");
    };

    assert.doesNotThrow(
      () => poll(1),
      "an exception must not escape the interval callback",
    );

    video.querySelector = original;

    poll(3);

    assert.strictEqual(
      summaryValues(),
      null,
      "a failed interval must be stopped, not retried every second",
    );
  });

  it("survives a throwing mutation callback", async () => {
    startSession(
      playlistPage([
        videoRenderer({ title: "A", duration: "1:00" }),
        videoRenderer({ title: "B", duration: "2:00" }),
      ]),
    );

    poll(2);

    jsdomErrors.length = 0;
    window.ytpdc.lastVideoInteractedWith = {};
    document.querySelector("ytd-playlist-video-renderer").remove();

    await new Promise((resolve) => setImmediate(resolve));

    assert.deepStrictEqual(
      jsdomErrors.map((error) => error.message),
      [],
      "a throwing mutation must be contained",
    );

    window.ytpdc.lastVideoInteractedWith = null;

    startSession(
      playlistPage([videoRenderer({ title: "C", duration: "3:00" })]),
    );

    poll(2);

    assert.deepStrictEqual(
      summaryValues(),
      {
        playlistSummary_totalDuration: "00:03:00",
        playlistSummary_videosCounted: "1",
        playlistSummary_videosNotCounted: "153",
      },
      "a throwing mutation must not wedge the extension",
    );
  });

  it("treats a digit-free playlist count as unknown", () => {
    startSession(`
      <ytd-playlist-sidebar-renderer>
        <div id="items"><div class="header"></div></div>
        <div id="stats"><yt-formatted-string>videos</yt-formatted-string></div>
      </ytd-playlist-sidebar-renderer>
      <ytd-playlist-video-list-renderer>
        <div id="contents">
          ${videoRenderer({ title: "A", duration: "1:00" })}
        </div>
      </ytd-playlist-video-list-renderer>`);

    poll(2);

    assert.deepStrictEqual(summaryValues(), {
      playlistSummary_totalDuration: "00:01:00",
      playlistSummary_videosCounted: "1",
      playlistSummary_videosNotCounted: "N/A",
    });

    assert.strictEqual(
      document.querySelector("#ytpdc-playlist-summary-tooltip"),
      null,
      "an unknown count must not be reported as an oversized playlist",
    );
  });

  it("restarts readiness when a navigation is not announced", () => {
    startSession(
      playlistPage([
        videoRenderer({ title: "A", duration: "1:00" }),
        videoRenderer({ title: "B", duration: "2:00" }),
        videoRenderer({ title: "C", duration: "3:00" }),
      ]),
    );

    poll(2);

    assert.strictEqual(
      summaryValues().playlistSummary_totalDuration,
      "00:06:00",
    );

    document.querySelector("#contents").innerHTML = [
      videoRenderer({ title: "D", duration: "5:00" }),
      videoRenderer({ title: "E", duration: "6:00" }),
      videoRenderer({ title: "F", duration: "7:00" }),
    ].join("");

    window.history.pushState({}, "", "/watch");
    poll(1);

    window.history.pushState({}, "", "/playlist?list=PLintegration");
    poll(1);
    poll(1);

    assert.strictEqual(
      summaryValues().playlistSummary_totalDuration,
      "00:18:00",
      "a watch started on the previous page must not suppress readiness",
    );
  });

  it("attempts discovery once per page load", () => {
    startSession(`
      <ytd-playlist-sidebar-renderer>
        <div id="items"><div class="header"></div></div>
      </ytd-playlist-sidebar-renderer>
      <ytd-playlist-video-list-renderer>
        ${videoRenderer({ title: "A", duration: "1:00" })}
      </ytd-playlist-video-list-renderer>`);

    const originalQuerySelectorAll = document.querySelectorAll.bind(document);
    let searches = 0;

    document.querySelectorAll = (selector) => {
      if (selector === "yt-section-list-renderer") {
        searches += 1;
      }

      return originalQuerySelectorAll(selector);
    };

    try {
      poll(15);
    } finally {
      document.querySelectorAll = originalQuerySelectorAll;
    }

    assert.strictEqual(
      searches,
      1,
      "a search that found nothing must not be re-run every tick",
    );
  });

  it("stops watching after the window closes", () => {
    startSession(
      playlistPage([
        videoRenderer({ title: "A", duration: "1:00" }),
        videoRenderer({ title: "B" }),
        videoRenderer({ title: "C" }),
      ]),
    );

    poll(61);
    poll(31);

    const [, second, third] = durationElements();
    second.textContent = "2:00";
    third.textContent = "3:00";

    poll(2);

    assert.deepStrictEqual(
      summaryValues(),
      {
        playlistSummary_totalDuration: "00:01:00",
        playlistSummary_videosCounted: "1",
        playlistSummary_videosNotCounted: "153",
      },
      "the interval must stop rather than poll a playlist forever",
    );
  });
});

after(() => {
  mock.timers.reset();
  dom.window.close();
});
