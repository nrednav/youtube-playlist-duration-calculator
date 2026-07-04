import { elementSelectors } from "src/shared/data/element-selectors";
import { extractTimestampByPattern } from "../../modules/extraction/content-pattern-extraction.js";

/**
 * Converts a numerical amount of seconds to a textual timestamp formatted as
 * hh:mm:ss
 * @param {number} seconds
 * @returns {string}
 */
export const convertSecondsToTimestamp = (seconds) => {
  // Guard against negative or non-finite input that would produce
  // nonsensical timestamps like "-1:-2:-3" or "NaN:NaN:NaN".
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00:00";
  }

  const totalSeconds = Math.floor(seconds);
  const hours = `${Math.floor(totalSeconds / 3600)}`.padStart(2, "0");
  const minutes = `${Math.floor((totalSeconds % 3600) / 60)}`.padStart(2, "0");
  const remainingSeconds = `${totalSeconds % 60}`.padStart(2, "0");

  return `${hours}:${minutes}:${remainingSeconds}`;
};

/**
 * Converts a textual timestamp formatted as hh:mm:ss to its numerical value
 * represented in seconds
 * @param {string} timestamp
 * @returns {number}
 */
export const convertTimestampToSeconds = (timestamp) => {
  const timeComponents = timestamp
    .split(":")
    .map((timeComponent) => Number.parseInt(timeComponent, 10));

  let seconds = 0;
  let minutes = 1;

  while (timeComponents.length > 0) {
    const timeComponent = timeComponents.pop();

    if (Number.isNaN(timeComponent)) {
      continue;
    }

    seconds += minutes * timeComponent;
    minutes *= 60;
  }

  return seconds;
};

/**
 * Extracts a timestamp from a video element
 *
 * Strategy:
 * 1. Try the known element selector (renderer architecture)
 * 2. Fall back to content-pattern extraction (viewmodel architecture)
 *
 * @param {Element} video
 * @returns {number}
 */
export const getTimestampFromVideo = (video) => {
  if (!video) {
    return null;
  }

  // Strategy 1: Known element selector
  const timestampElement = video.querySelector(elementSelectors.timestamp);

  if (timestampElement) {
    const timestamp = timestampElement.innerText;

    if (timestamp) {
      const sanitizedTimestamp = timestamp.trim().replace(/\n/g, "");

      // Does the timestamp match hh:mm:ss?
      // Ref: Timestamp regex from https://stackoverflow.com/a/8318367
      const matches = sanitizedTimestamp.match(
        /((?:(?:([01]?\d|2[0-3]):)?([0-5]?\d):)?([0-5]?\d))/,
      );

      if (matches) {
        return convertTimestampToSeconds(matches[0]);
      }

      // Timestamp exists but does not match hh:mm:ss, treat it as 0 seconds
      return 0;
    }
  }

  // Strategy 2: Content-pattern extraction (handles viewmodel architecture)
  const patternResult = extractTimestampByPattern(video);

  if (patternResult.value) {
    return convertTimestampToSeconds(patternResult.value);
  }

  return null;
};
