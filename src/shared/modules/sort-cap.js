/**
 * The maximum playlist size for which sorting is offered.
 *
 * Sorting is capped because the extension sorts only the currently-loaded
 * video elements, not the whole playlist. For large playlists this
 * silently produces a partial re-order that misleads the user about what
 * "sorted" means. Showing the control on an oversized playlist (or when
 * the count cannot be determined, which previously coerced to 0 and
 * enabled the dropdown) is a worse contract than not showing it.
 *
 * @type {number}
 */
export const SORT_VIDEO_CAP = 100;

/**
 * Whether sorting should be offered for a playlist of the given total size.
 *
 * Returns `false` when the size is unknown (`null`/`undefined`/`NaN`) or when
 * it meets or exceeds the cap. Returns `true` only for a known size strictly
 * below the cap. Strict, defensive, deterministic: the boolean answer maps
 * one-to-one to "the dropdown should render."
 *
 * @param {number | null | undefined} totalCount
 * @returns {boolean}
 */
export const isSortingEnabledForCount = (totalCount) => {
  if (totalCount === null || totalCount === undefined) return false;
  if (Number.isNaN(totalCount)) return false;
  return totalCount < SORT_VIDEO_CAP;
};
