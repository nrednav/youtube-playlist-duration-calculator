/**
 * Derives the summary counts from the single number that the duration total is
 * actually built from: the timestamps that were summed. Counting inspected
 * video elements instead would report a still-loading video as counted.
 *
 * `notCounted` is null when the playlist total is unknown so the caller can
 * render "N/A" rather than a fabricated number.
 *
 * @param {{ timestamps: Array<number|null>, nullTimestamps: number, totalVideosInPlaylist: number|null }} input
 * @returns {{ counted: number, notCounted: number|null }}
 */
export const deriveSummaryCounts = ({
  timestamps,
  nullTimestamps,
  totalVideosInPlaylist,
}) => {
  const counted = timestamps.length - nullTimestamps;
  const totalIsKnown =
    Number.isFinite(totalVideosInPlaylist) && totalVideosInPlaylist > 0;

  return {
    counted,
    notCounted: totalIsKnown ? totalVideosInPlaylist - counted : null,
  };
};
