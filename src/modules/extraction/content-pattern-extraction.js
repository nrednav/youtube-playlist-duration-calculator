/**
 * Content-Pattern Extraction
 *
 * Extracts data from video elements by matching the shape of the content
 * itself (text patterns, structural heuristics) rather than by element
 * tag names that can change across YouTube layout variants.
 */

const DURATION_PATTERN = /(\d{1,2}):(\d{2})(?::(\d{2}))?/;
const DURATION_PATTERN_LOOSE = /\d{1,2}:\d{2}(:\d{2})?/;

/**
 * Extracts a duration-ish text from a video element by scanning its
 * text content for MM:SS or HH:MM:SS patterns.
 *
 * @param {Element} videoElement
 * @returns {{ value: string|null, confidence: number }}
 */
export const extractTimestampByPattern = (videoElement) => {
  if (!videoElement) {
    return { value: null, confidence: 0 };
  }

  const text = videoElement.textContent || "";

  // Try to find duration patterns in the text
  const matches = text.match(DURATION_PATTERN_LOOSE);

  if (matches) {
    const raw = matches[0];
    const parts = raw.split(":").length;

    // HH:MM:SS or MM:SS — standard duration format
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
