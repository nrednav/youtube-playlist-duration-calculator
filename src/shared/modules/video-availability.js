import { elementSelectors } from "../data/element-selectors";

const normalize = (value) =>
  (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();

const titleOf = (element) =>
  element.getAttribute?.("title") ||
  element.title ||
  element.getAttribute?.("aria-label") ||
  element.textContent;

/**
 * The title YouTube shows for a video, from whichever element carries it on
 * the current architecture.
 *
 * @param {Element} video
 * @returns {string | undefined}
 */
export const getVideoTitle = (video) => {
  for (const selector of elementSelectors.videoTitleCandidates) {
    const element = video.querySelector(selector);

    if (!element) continue;

    const title = titleOf(element);

    if (title?.trim()) {
      return title.trim();
    }
  }

  return undefined;
};

/**
 * Whether a video is one YouTube has given up on.
 *
 * A missing duration is ambiguous: the badge may simply not be rendered yet.
 * Reading it as unavailability made still-loading videos look finished.
 *
 * Unavailability is decided from the title, in three steps, because a single
 * exact string match is not enough. The localized set covers the current
 * wording. A bracketed placeholder covers a wording this build has never
 * seen. And an item that has metadata but no title at all is one YouTube
 * cannot name, which is what a removed video looks like.
 *
 * @param {Element} video
 * @param {{ unavailableTitles: string[] }} options
 * @returns {boolean}
 */
export const isVideoUnavailable = (video, { unavailableTitles }) => {
  const title = normalize(getVideoTitle(video));

  if (title) {
    if (unavailableTitles.some((candidate) => normalize(candidate) === title)) {
      return true;
    }

    return /^\[.*\]$/.test(title);
  }

  return (video.textContent || "").trim().length > 0;
};
