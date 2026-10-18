/**
 * Whether any video is still waiting for its duration text.
 *
 * A normal title plus a missing duration means the badge has not rendered yet.
 * Unavailable videos are excluded: they have no duration by nature, so they
 * would otherwise hold readiness open until the poll budget ran out.
 *
 * @param {Element[]} videos
 * @param {{ getTimestampFromVideo: (video: Element) => number|null, isVideoUnavailable: (video: Element) => boolean }} dependencies
 * @returns {boolean}
 */
export const hasLoadingVideo = (
  videos,
  { getTimestampFromVideo, isVideoUnavailable },
) => {
  return videos.some(
    (video) =>
      !isVideoUnavailable(video) && getTimestampFromVideo(video) === null,
  );
};
