import { elementSelectors } from "../data/element-selectors";

/**
 * @param {Element} video
 * @returns {string | undefined}
 */
export const getVideoTitle = (video) => {
  return video.querySelector(elementSelectors.videoTitle)?.title;
};

/**
 * Availability is decided by title alone. A missing duration is ambiguous:
 * the badge may simply not be rendered yet. Reading it as unavailability made
 * still-loading videos look finished.
 *
 * @param {Element} video
 * @param {{ unavailableTitles: string[] }} options
 * @returns {boolean}
 */
export const isVideoUnavailable = (video, { unavailableTitles }) => {
  return unavailableTitles.includes(getVideoTitle(video));
};
