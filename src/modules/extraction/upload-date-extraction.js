/**
 * Upload-Date Extraction
 *
 * Locates a video's upload date by structural invariant, not by element
 * name. The invariant: the upload-date datum is the metadata-row text
 * fragment IMMEDIATELY AFTER the "•" delimiter.
 *
 * On the renderer architecture this fragment is the third child of
 * yt-formatted-string#video-info (children = [views, "•", date]). On
 * the viewmodel architecture it is a span inside
 * yt-content-metadata-view-model's metadata row (spans = [..., views,
 * "•", date]). Both are the SAME datum, and the locale parser handles
 * regex/unit logic identically regardless of which DOM node carried it.
 *
 * YouTube cannot render a relative upload date without a digit and a
 * locale time-unit word. Live videos have no upload date (they render
 * "watching" instead of "views"). These constraints are forced by what
 * each datum IS, not by element names, so the extractor survives renames
 * that would break a selector-based reader ("children[2]").
 *
 * Contract: { value: number|null, confidence: number, strategyName }
 *
 * Locale regex/unit logic is delegated to the existing parsers under
 * sort-by-upload-date/parsers/, migrated 2026-07-05 to accept a raw
 * string.
 */

import { elementSelectors } from "src/shared/data/element-selectors";
import { getUploadDateParser } from "../sorting/sort-by-upload-date/parsers";

/**
 * Extract a video's upload date as seconds-since-epoch (relative, "ago").
 *
 * @param {Element|null} videoElement
 * @returns {{ value: number|null, confidence: number, strategyName: string }}
 */
export const extractUploadDate = (videoElement) => {
  if (!videoElement) {
    return { value: null, confidence: 0, strategyName: "none" };
  }

  const fragment = locateDateFragment(videoElement);

  if (!fragment) {
    return { value: null, confidence: 0, strategyName: "none" };
  }

  const locale = resolveLocale(videoElement);
  const Parser = getUploadDateParser(locale);
  const parser = new Parser();
  const value = parser.parse(fragment);

  if (value === null || Number.isNaN(value)) {
    return { value: null, confidence: 0, strategyName: "none" };
  }

  return { value, confidence: 0.9, strategyName: "content-pattern" };
};

const resolveLocale = (videoElement) => {
  return (
    videoElement.ownerDocument?.documentElement?.lang ||
    document?.documentElement?.lang ||
    "en"
  );
};

const DELIMITER_TEXT = "•";
const WATCHING_MARKER = "watching";

/**
 * Locate the upload-date text fragment inside a video element.
 *
 * The date fragment is the metadata-row text fragment IMMEDIATELY AFTER
 * the "•" delimiter. This is the structural twin of the views extractor,
 * which selects the fragment immediately BEFORE the delimiter.
 *
 * On renderer: [#video-info children] = [views, "•", date].
 * On viewmodel: [metadata-row spans] = [..., views, "•", date].
 * In both, "date" follows "•".
 *
 * @param {Element} videoElement
 * @returns {string|null}
 */
const locateDateFragment = (videoElement) => {
  const candidates = collectMetadataFragments(videoElement);

  const delimiterIndex = candidates.findIndex(
    (text) => text.trim() === DELIMITER_TEXT,
  );

  if (delimiterIndex >= 0 && delimiterIndex < candidates.length - 1) {
    const candidate = candidates[delimiterIndex + 1].trim();
    if (isDateFragment(candidate)) {
      return candidate;
    }
  }

  // Fallback: scan metadata fragments for one that parses as a relative
  // time phrase. Covers locales or layouts where no delimiter is present.
  for (const text of candidates) {
    const trimmed = text.trim();
    if (isDateFragment(trimmed)) {
      return trimmed;
    }
  }

  return null;
};

/**
 * Whether a text fragment is the upload-date datum.
 *
 * A date fragment contains a digit, is not the delimiter, is not the
 * live "watching" count. The locale parser is the final arbiter of
 * whether the text actually parses as a relative-time phrase. This gate
 * only selects fragments that plausibly are dates so the parser is not
 * fed arbitrary text.
 */
const isDateFragment = (text) => {
  if (!text) return false;
  if (!/\d/.test(text)) return false;
  if (text === DELIMITER_TEXT) return false;
  if (text.toLowerCase().includes(WATCHING_MARKER)) return false;
  return true;
};

/**
 * Collect metadata-row text fragments from a video element.
 *
 * Renderer: children of yt-formatted-string#video-info.
 * ViewModel: spans within yt-content-metadata-view-model metadata rows.
 */
const collectMetadataFragments = (videoElement) => {
  const fragments = [];

  const videoInfo = videoElement.querySelector?.(elementSelectors.videoInfo);
  if (videoInfo) {
    for (const child of videoInfo.children) {
      fragments.push((child.textContent || "").trim());
    }
  }

  const metadataSpans = videoElement.querySelectorAll?.(
    ".ytContentMetadataViewModelMetadataRow span",
  );
  if (metadataSpans) {
    for (const span of metadataSpans) {
      fragments.push((span.textContent || "").trim());
    }
  }

  return fragments.filter(Boolean);
};
