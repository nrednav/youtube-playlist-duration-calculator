/**
 * Shared duration-text validation for YouTube duration strings.
 *
 * A duration is one of:
 *   M:SS, MM:SS            (e.g. "4:30", "59:59")
 *   H:MM:SS, HH:MM:SS,  HHH:MM:SS, ...   (e.g. "1:04:30", "100:00:00")
 *
 * The hours position is unbounded to accept legitimately long videos
 * (YouTube renders durations over 100 hours as "100:00:00"). Only the
 * SECONDS component is bounds-checked, because YouTube's own rendering
 * guarantees seconds roll over (< 60), so seconds >= 60 is definitively
 * invalid input (e.g. "9:99", "99:99"). Minutes and hours are not
 * clamped to avoid false negatives on real durations.
 *
 * This consolidates three previously-duplicated duration regexes
 * (discovery, extraction, sorting) into one source of truth.
 */

const DURATION_PATTERN = /\d+:\d{2}(:\d{2})?/;

/**
 * Whether a text string (typically a badge textContent) IS a duration.
 * Use for badge text that should contain ONLY a duration.
 *
 * @param {string} text
 * @returns {boolean}
 */
export const isDurationText = (text) => {
  if (typeof text !== "string") {
    return false;
  }

  const match = text.trim().match(DURATION_PATTERN);

  if (!match) {
    return false;
  }

  const parts = match[0].split(":");
  const seconds = Number(parts[parts.length - 1]);

  return seconds < 60;
};

/**
 * Extract the first valid duration substring from a text that may
 * contain other content (e.g. a whole video lockup's textContent).
 * Returns null if no valid duration is present.
 *
 * @param {string} text
 * @returns {string|null}
 */
export const extractDuration = (text) => {
  if (typeof text !== "string") {
    return null;
  }

  const match = text.match(DURATION_PATTERN);

  if (!match) {
    return null;
  }

  const parts = match[0].split(":");
  const seconds = Number(parts[parts.length - 1]);

  return seconds < 60 ? match[0] : null;
};
