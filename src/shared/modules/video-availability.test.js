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
  querySelector: () => (title === undefined ? null : { title }),
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

  it("does not flag a video whose title is absent", () => {
    assert.strictEqual(
      isVideoUnavailable(videoWithTitle(undefined), {
        unavailableTitles: UNAVAILABLE_TITLES,
      }),
      false,
    );
  });

  it("decides from the title alone", () => {
    const video = {
      querySelector(selector) {
        if (selector !== elementSelectors.videoTitle) {
          throw new Error(`unexpected read: ${selector}`);
        }
        return { title: "[Private video]" };
      },
    };

    assert.strictEqual(
      isVideoUnavailable(video, { unavailableTitles: UNAVAILABLE_TITLES }),
      true,
    );
  });
});
