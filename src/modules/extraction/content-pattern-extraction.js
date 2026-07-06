/**
 * Content-Pattern Extraction
 *
 * Extracts data from video elements by matching the shape of the content
 * itself (text patterns, structural heuristics) rather than by element
 * tag names that can change across YouTube layout variants.
 */

const DURATION_PATTERN_LOOSE = /\d{1,2}:\d{2}(:\d{2})?/;

/**
 * Resolve the dedicated YouTube duration-badge element inside a video
 * item, if any.
 *
 * Both architectures ship a badge element whose textContent is either
 * the duration (e.g. "15:31") or a non-duration marker ("LIVE",
 * "Upcoming"). Prefer `badge-shape` because its textContent is clean
 * (just the duration string), while the legacy
 * `ytd-thumbnail-overlay-time-status-renderer` element concatenates
 * the badge text with the duplicate `#time-status > span#text` text.
 *
 * @param {Element} videoElement
 * @returns {Element|null}
 */
const resolveDurationBadge = (videoElement) => {
  return (
    videoElement.querySelector("badge-shape") ||
    videoElement.querySelector("ytd-thumbnail-overlay-time-status-renderer")
  );
};

/**
 * Extracts a duration-ish text from a video element.
 *
 * Badge-first extraction (Bug 1 fix): when YouTube renders a dedicated
 * duration badge element, the duration lives in its textContent and we
 * MUST NOT scan the whole video element's textContent for a duration
 * pattern. Real Upcoming video items contain a scheduled-time string
 * (e.g. "Scheduled for 7/5/26, 4:00 AM") in adjacent metadata. The
 * loose `\d{1,2}:\d{2}` regex matches "4:00" from that metadata and
 * silently counts the Upcoming video as a 4-minute duration.
 *
 * The badge is the authoritative signal. If it exists and matches the
 * duration pattern, return it at high confidence. If it exists but
 * does NOT match (LIVE, Upcoming, empty), return null definitively
 * and refuse to fall through to text scanning. Only when no badge is
 * present at all do we fall back to the legacy whole-text scan.
 *
 * @param {Element} videoElement
 * @returns {{ value: string|null, confidence: number }}
 */
export const extractTimestampByPattern = (videoElement) => {
  if (!videoElement) {
    return { value: null, confidence: 0 };
  }

  const badge = resolveDurationBadge(videoElement);

  if (badge) {
    const badgeText = (badge.textContent || "").trim();
    const match = badgeText.match(DURATION_PATTERN_LOOSE);

    if (match) {
      const raw = match[0];
      const parts = raw.split(":").length;

      // The badge is YouTube's dedicated duration element, so a match
      // there is high confidence regardless of whether the badge text
      // contains extra markup text (it doesn't, but defense in depth).
      if (parts === 3 || parts === 2) {
        return { value: raw, confidence: 0.9 };
      }
    }

    // Badge exists but its text is NOT a duration ("LIVE", "Upcoming",
    // or empty). This is a definitive non-duration signal: refuse to
    // fall through to whole-text scanning, which would otherwise match
    // "4:00" from the scheduled-time metadata on Upcoming videos.
    return { value: null, confidence: 0 };
  }

  // No badge element present (e.g. unavailable videos have neither
  // badge-shape nor ytd-thumbnail-overlay-time-status-renderer. Some
  // test mocks have no querySelector at all). Fall back to scanning
  // the element's textContent for a duration pattern. This path is
  // only safe because a real Upcoming or Live video always has a badge
  // present, so the false-positive trap is unreachable here.
  const text = videoElement.textContent || "";
  const matches = text.match(DURATION_PATTERN_LOOSE);

  if (matches) {
    const raw = matches[0];
    const parts = raw.split(":").length;

    if (parts === 3 || parts === 2) {
      // Higher confidence when the match is standalone (not part of larger text)
      const confidence =
        text.trim() === raw || text.includes(`  ${raw}`) ? 0.9 : 0.6;

      return { value: raw, confidence };
    }
  }

  return { value: null, confidence: 0 };
};

/**
 * Extracts a video title from a video element by scanning for
 * anchor elements with a title attribute, picking the longest one.
 *
 * @param {Element} videoElement
 * @returns {{ value: string|null, confidence: number }}
 */
export const extractTitleByPattern = (videoElement) => {
  if (!videoElement) {
    return { value: null, confidence: 0 };
  }

  const anchors = videoElement.querySelectorAll("a");
  let best = null;
  let bestLength = 0;

  for (const anchor of anchors) {
    // Prefer the title attribute (used by YouTube for full titles)
    const title = anchor.getAttribute("title") || anchor.textContent.trim();

    if (title && title.length > bestLength && title.length > 5) {
      best = title;
      bestLength = title.length;
    }
  }

  return {
    value: best,
    confidence: best ? 0.8 : 0,
  };
};
