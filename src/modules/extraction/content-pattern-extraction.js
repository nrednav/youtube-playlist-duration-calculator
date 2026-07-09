/**
 * Content-Pattern Extraction
 *
 * Extracts data from video elements by matching the shape of the content
 * itself (text patterns, structural heuristics) rather than by element
 * tag names that can change across YouTube layout variants.
 */

import {
  extractDuration,
  isDurationText,
} from "../../shared/modules/duration-pattern";

/**
 * Resolve the dedicated YouTube duration-badge element inside a video
 * item, if any.
 *
 * Each video element has one badge-shape inside the thumbnail overlay
 * that holds either the duration text (e.g. "4:30") or a non-duration
 * marker ("LIVE", "Upcoming"). This function scans ALL badge-shape
 * elements and returns the one whose text matches a duration pattern.
 * If no badge-shape has duration text, it falls back to the first
 * badge-shape (for known non-duration markers like LIVE), then to the
 * legacy renderer element, and finally scans all descendants for a
 * standalone duration string.
 *
 * @param {Element} videoElement
 * @returns {Element|null}
 */
const resolveDurationBadge = (videoElement) => {
  // Scan all badge-shape elements. Return the first one whose text
  // matches a duration pattern. Falls through to legacy renderer
  // element or descendant scan if no badge-shape has duration text.
  const allBadges = videoElement.querySelectorAll("badge-shape");

  for (const badge of allBadges) {
    const text = (badge.textContent || "").trim();

    if (isDurationText(text)) {
      return badge;
    }
  }

  if (allBadges.length > 0) {
    return allBadges[0];
  }

  // Legacy renderer architecture: ytd-thumbnail-overlay-time-status-renderer
  const legacyBadge = videoElement.querySelector(
    "ytd-thumbnail-overlay-time-status-renderer",
  );

  if (legacyBadge) {
    return legacyBadge;
  }

  // Viewmodel architecture fallback: scan all descendants for an element
  // whose entire textContent is a short duration string. This catches
  // durations rendered in non-badge elements on the viewmodel architecture
  // (e.g. a span whose textContent is just "4:30"), while excluding false
  // positives from elements with longer textContent (e.g. "Scheduled for
  // 05/07/2026, 04:00" at length 35 or "46:13 Chapter Name" at length 18).
  // The < 10 character threshold is safe because all standard duration
  // formats (MM:SS at 5 chars, HH:MM:SS at 8 chars) are well under it.
  const allDescendants = videoElement.querySelectorAll("*");

  for (const descendant of allDescendants) {
    const text = (descendant.textContent || "").trim();

    if (text && text.length < 10 && isDurationText(text)) {
      return descendant;
    }
  }

  return null;
};

/**
 * Extracts a duration-ish text from a video element.
 *
 * Badge-first extraction (Bug 1 fix): when YouTube renders a dedicated
 * duration badge element, the duration lives in its textContent and we
 * MUST NOT scan the whole video element's textContent for a duration
 * pattern. Real Upcoming video items contain a scheduled-time string
 * (e.g. "Scheduled for 7/5/26, 4:00 AM") in adjacent metadata. The
 * Durations are matched via the shared extractDuration / isDurationText
 * validator, which rejects invalid clock values (seconds >= 60).
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
    const raw = extractDuration(badgeText);

    if (raw) {
      return { value: raw, confidence: 0.9 };
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
  const raw = extractDuration(text);

  if (raw) {
    const confidence =
      text.trim() === raw || text.includes(`  ${raw}`) ? 0.9 : 0.6;

    return { value: raw, confidence };
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
