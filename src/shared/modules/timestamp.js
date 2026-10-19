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
