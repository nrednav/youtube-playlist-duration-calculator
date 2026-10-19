/**
 * The states a duration read can be in.
 *
 * Kept apart from the reader so predicates that only need to compare a
 * state do not pull in the DOM strategies and their logger.
 */
export const DurationReading = Object.freeze({
  DURATION: "duration",
  NO_DURATION: "no-duration",
  PENDING: "pending",
});
