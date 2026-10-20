import assert from "node:assert";
import { describe, it } from "node:test";
import { elementSelectors } from "../data/element-selectors.js";
import { getVideoTitle, isVideoUnavailable } from "./video-availability.js";

const UNAVAILABLE_TITLES = [
  "[Private video]",
  "[Deleted video]",
  "[Unavailable]",
  "[Video unavailable]",
  "[Restricted video]",
  "[Age restricted]",
];

const videoWithTitle = (title) => ({
  textContent: "",
  querySelector: () => (title === undefined ? null : { title }),
});

const videoWithoutTitleButDescribed = () => ({
  textContent: "No views",
  querySelector: () => null,
});

describe("getVideoTitle()", () => {
  it("reads the title from the title element", () => {
    assert.strictEqual(
      getVideoTitle(videoWithTitle("Some video")),
      "Some video",
    );
  });

  it("returns undefined when the title element is absent", () => {
    assert.strictEqual(getVideoTitle(videoWithTitle(undefined)), undefined);
  });
});

describe("isVideoUnavailable()", () => {
  it("flags every unavailable title", () => {
    for (const title of UNAVAILABLE_TITLES) {
      assert.strictEqual(
        isVideoUnavailable(videoWithTitle(title), {
          unavailableTitles: UNAVAILABLE_TITLES,
        }),
        true,
        `${title} must be flagged unavailable`,
      );
    }
  });

  it("does not flag a normal title", () => {
    assert.strictEqual(
      isVideoUnavailable(videoWithTitle("Some video"), {
        unavailableTitles: UNAVAILABLE_TITLES,
      }),
      false,
    );
  });

  it("does not flag a video that has not rendered anything yet", () => {
    assert.strictEqual(
      isVideoUnavailable(videoWithTitle(undefined), {
        unavailableTitles: UNAVAILABLE_TITLES,
      }),
      false,
    );
  });

  it("flags a bracketed placeholder from a locale this build never saw", () => {
    assert.strictEqual(
      isVideoUnavailable(videoWithTitle("[Vidéo privée]"), {
        unavailableTitles: UNAVAILABLE_TITLES,
      }),
      true,
    );
  });

  it("flags a described item that has no title at all", () => {
    assert.strictEqual(
      isVideoUnavailable(videoWithoutTitleButDescribed(), {
        unavailableTitles: UNAVAILABLE_TITLES,
      }),
      true,
    );
  });

  it("does not read the duration to decide", () => {
    const video = {
      textContent: "",
      querySelector(selector) {
        if (selector === elementSelectors.timestamp) {
          throw new Error(`unexpected duration read: ${selector}`);
        }
        return selector === elementSelectors.videoTitle
          ? { title: "[Private video]" }
          : null;
      },
    };

    assert.strictEqual(
      isVideoUnavailable(video, { unavailableTitles: UNAVAILABLE_TITLES }),
      true,
    );
  });
});
