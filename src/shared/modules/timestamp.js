import { elementSelectors } from "src/shared/data/element-selectors";

/**
 * Converts a numerical amount of seconds to a textual timestamp formatted as
 * hh:mm:ss
 * @param {number} seconds
 * @returns {string}
 */
export const convertSecondsToTimestamp = (seconds) => {
  const hours = `${Math.floor(seconds / 3600)}`.padStart(2, "0");
  seconds %= 3600;
  const minutes = `${Math.floor(seconds / 60)}`.padStart(2, "0");
  const remainingSeconds = `${seconds % 60}`.padStart(2, "0");
  return `${hours}:${minutes}:${remainingSeconds}`;
};

/**
 * Converts a textual timestamp formatted as hh:mm:ss to its numerical value
 * represented in seconds
 * @param {string} timestamp
 * @returns {number}
 */
export const convertTimestampToSeconds = (timestamp) => {
  let timeComponents = timestamp
    .split(":")
    .map((timeComponent) => parseInt(timeComponent, 10));

  let seconds = 0;
  let minutes = 1;

  while (timeComponents.length > 0) {
    let timeComponent = timeComponents.pop();
    if (isNaN(timeComponent)) continue;

    seconds += minutes * timeComponent;
    minutes *= 60;
  }

  return seconds;
};

/**
 * Extracts a timestamp from a video element
 * @param {Element} video
 * @returns {number}
 */
export const getTimestampFromVideo = (video) => {
  if (!video) return null;

  const timestampElement = video.querySelector(elementSelectors.timestamp);
  if (!timestampElement) return null;

  const timestamp = timestampElement.innerText;
  if (!timestamp) return null;

  // Ref: Timestamp regex from https://stackoverflow.com/a/8318367
  const timestampSanitized = timestamp
    .trim()
    .replace(/\n/g, "")
    .toLowerCase()
    .match(/((?:(?:([01]?\d|2[0-3]):)?([0-5]?\d):)?([0-5]?\d))|upcoming/)[0];

  const timestampAsSeconds = convertTimestampToSeconds(timestampSanitized);
  return timestampAsSeconds;
};
