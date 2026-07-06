/**
 * Views Extraction
 *
 * Locates a video's view count by structural invariant, not by element
 * name. The invariant: the views datum is the metadata-row text fragment
 * that contains a digit and is NEITHER the upload-date fragment NOR the
 * live-video "watching" count.
 *
 * On the renderer architecture this fragment is the first child of
 * yt-formatted-string#video-info. On the viewmodel architecture it is a
 * span inside yt-content-metadata-view-model's metadata row. Both are the
 * SAME datum, and the locale parser handles suffix and word logic identically
 * regardless of which DOM node carried it.
 *
 * YouTube cannot render a view count without digits and the locale views
 * word. Live videos render "watching" instead of "views". A different
 * datum. Upload dates render a time-ago phrase. These constraints are
 * forced by what each datum IS, not by element names, so the extractor
 * survives element renames that would break a selector-based reader.
 *
 * Contract: { value: number|null, confidence: number, strategyName }
 *
 * Locale suffix logic is delegated to the existing parsers under
 * sort-by-views/parsers/, migrated 2026-07-05 to accept a raw string.
 */

import { elementSelectors } from "src/shared/data/element-selectors";
import { getViewsParser } from "../sorting/sort-by-views/parsers";

/**
 * Extract a video's view count.
 *
 * @param {Element|null} videoElement
 * @returns {{ value: number|null, confidence: number, strategyName: string }}
 */
export const extractViews = (videoElement) => {
  if (!videoElement) {
    return { value: null, confidence: 0, strategyName: "none" };
  }

  const fragment = locateViewsFragment(videoElement);

  if (!fragment) {
    return { value: null, confidence: 0, strategyName: "none" };
  }

  const locale = resolveLocale(videoElement);
  const Parser = getViewsParser(locale);
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

const WATCHING_MARKER = "watching";
const DELIMITER_TEXT = "•";

/**
 * Locate the views text fragment inside a video element.
 *
 * Candidate set is RESTRICTED to metadata-row children (renderer
 * #video-info children on the renderer architecture, metadata-row
 * spans on viewmodel). This deliberately excludes the video title,
 * which contains digits (years, episode numbers) and would otherwise
 * be mis-selected as the views fragment.
 *
 * Within the candidate set, the views fragment is the one that:
 *   - contains at least one digit, AND
 *   - is NOT the live "watching" count, AND
 *   - is NOT the upload-date fragment (detected as a "X unit(s) ago"
 *     or locale-relative-time phrase), AND
 *   - is NOT the standalone delimiter.
 *
 * The upload-date exclusion is structural: relative-time phrases end
 * in a time unit word, while views fragments end in the locale views
 * word or a numeric suffix. We exclude by the "ago"-style marker only
 * for en. For other locales the delimiter-separated position is the
 * discriminator (views is the fragment BEFORE the delimiter, date is
 * the fragment AFTER). This is the same structural fact the renderer
 * parser relied on when it took firstElementChild.
 *
 * @param {Element} videoElement
 * @returns {string|null}
 */
const locateViewsFragment = (videoElement) => {
  const candidates = collectMetadataFragments(videoElement);

  // Prefer the fragment that sits immediately before the delimiter.
  // On renderer: [#video-info children] = [views, "•", date].
  // On viewmodel: [metadata-row spans] = [channel-link-area..., views,
  //   "•", date]. In both, "views" precedes "•".
  const delimiterIndex = candidates.findIndex(
    (text) => text.trim() === DELIMITER_TEXT,
  );

  if (delimiterIndex > 0) {
    const candidate = candidates[delimiterIndex - 1].trim();
    if (isViewsFragment(candidate)) {
      return candidate;
    }
  }

  // Fallback: any metadata fragment that parses as views and is not the
  // watching count or a relative-time phrase. Covers locales or layouts
  // where no delimiter is present.
  for (const text of candidates) {
    const trimmed = text.trim();
    if (isViewsFragment(trimmed)) {
      return trimmed;
    }
  }

  return null;
};

/**
 * Whether a text fragment is the views datum.
 */
const isViewsFragment = (text) => {
  if (!text) return false;
  if (!/\d/.test(text)) return false;
  if (text === DELIMITER_TEXT) return false;
  if (text.toLowerCase().includes(WATCHING_MARKER)) return false;
  if (isRelativeTimePhrase(text)) return false;
  return true;
};

/**
 * Whether a text fragment is a relative-time ("X ago") phrase rather than
 * a view count. English marker is "ago". Other locales use their own word;
 * the delimiter-position rule (above) is the primary discriminator, and
 * this is a secondary guard so an en "2 years ago" fragment is never
 * mistaken for 2 views.
 */
const isRelativeTimePhrase = (text) => {
  return /\bago\b/i.test(text);
};

/**
 * Collect metadata-row text fragments from a video element.
 *
 * Renderer: children of yt-formatted-string#video-info.
 * ViewModel: spans within yt-content-metadata-view-model metadata rows.
 *
 * Both are the "small metadata text" region of the video card. The
 * title heading is excluded by construction.
 */
const collectMetadataFragments = (videoElement) => {
  const fragments = [];

  // Renderer fast path (also kept as the structural anchor for the
  // renderer architecture's #video-info contract).
  const videoInfo = videoElement.querySelector?.(elementSelectors.videoInfo);
  if (videoInfo) {
    for (const child of videoInfo.children) {
      fragments.push((child.textContent || "").trim());
    }
  }

  // ViewModel path: metadata-row spans. Also matches renderer extras
  // if YouTube adds them inside a content-metadata-view-model.
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
