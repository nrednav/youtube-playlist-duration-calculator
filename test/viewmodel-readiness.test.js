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

const { JSDOM } = await import("jsdom");

const PLAYLIST_TOTAL = 154;

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "https://www.youtube.com/playlist?list=PLviewmodel",
});

const { window } = dom;

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

// jsdom resolves a scoped `querySelector("#id")` through a document-wide id
// index, so a repeated id inside one video resolves to nothing. Browsers match
// within the subtree.
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

// A lockup in the view-model architecture. There is no `#video-title` here:
// the title lives in the metadata heading and the duration in a `badge-shape`.
const lockup = ({ title, duration = "" }) => `
  <yt-lockup-view-model>
    <a href="/watch?v=x">
      <yt-thumbnail-view-model>
        <badge-shape>${duration}</badge-shape>
      </yt-thumbnail-view-model>
    </a>
    <yt-lockup-metadata-view-model>
      <h3>${title}</h3>
    </yt-lockup-metadata-view-model>
  </yt-lockup-view-model>`;

const lockupPage = (videos) => `
  <yt-page-header-view-model>
    <div class="ytPageHeaderViewModelContent">
      <div class="metadata-stats">
        <yt-formatted-string>${PLAYLIST_TOTAL} videos</yt-formatted-string>
      </div>
    </div>
  </yt-page-header-view-model>
  <ytd-playlist-sidebar-renderer>
    <div id="stats"><yt-formatted-string>${PLAYLIST_TOTAL} videos</yt-formatted-string></div>
  </ytd-playlist-sidebar-renderer>
  <yt-item-section-renderer>
    <div id="contents">${videos.join("")}</div>
  </yt-item-section-renderer>`;

// Discovery is not under test here. Its result is seeded the way the real
// discovery pass publishes it, so the readiness loop is exercised against the
// architecture it actually meets on a playlist page today.
const startViewmodelSession = (html) => {
  document.body.innerHTML = html;

  // The navigation handler resets `window.ytpdc` and removes any previous
  // summary, so discovery is seeded after it runs.
  document.dispatchEvent(new window.Event("yt-navigate-finish"));

  window.ytpdc.discoveryResult = {
    confidence: 0.6,
    videoSelector: "yt-lockup-view-model",
    container: document.querySelector("#contents"),
    videos: [...document.querySelectorAll("yt-lockup-view-model")],
  };
};

const poll = (ticks = 1) => {
  for (let index = 0; index < ticks; index += 1) {
    mock.timers.tick(1000);
  }
};

const summaryValues = () => {
  const summary = document.querySelector(
    "#ytpdc-playlist-summary-old, #ytpdc-playlist-summary-new",
  );

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

const badges = () => [...document.querySelectorAll("badge-shape")];

after(() => {
  mock.timers.reset();
});

describe("view-model readiness", () => {
  it("totals videos whose durations render after the first computation", () => {
    startViewmodelSession(
      lockupPage([
        lockup({ title: "A", duration: "1:00" }),
        lockup({ title: "B" }),
        lockup({ title: "C" }),
      ]),
    );

    poll(2);

    assert.deepStrictEqual(
      summaryValues(),
      {
        playlistSummary_totalDuration: "00:01:00",
        playlistSummary_videosCounted: "1",
        playlistSummary_videosNotCounted: "153",
      },
      "the first total may only describe the durations that were read",
    );

    const [, second, third] = badges();
    second.textContent = "2:00";
    third.textContent = "3:00";

    poll(2);

    assert.deepStrictEqual(
      summaryValues(),
      {
        playlistSummary_totalDuration: "00:06:00",
        playlistSummary_videosCounted: "3",
        playlistSummary_videosNotCounted: "151",
      },
      "durations that render after the first total must be summed",
    );
  });
});
