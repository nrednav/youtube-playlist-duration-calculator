/**
 * Playlist-Count Extraction
 *
 * Locates the playlist's total video count by structural invariant, not by
 * element name. The count datum is the digit-bearing metadata text span in
 * the page-header metadata view-model that is flanked by delimiter spans on
 * both sides. YouTube renders the playlist count there on both the renderer
 * and viewmodel architectures ("154 videos", "2 videos"), immediately
 * between two "•" delimiters, distinct from the adjacent view-count span.
 *
 * Why not match the locale "videos" word: there are too many locales to
 * verify the translation for each, and getting it wrong silently breaks
 * the count. The delimiter flanking is locale-independent because
 * YouTube's own metadata layout uses the "•" separator regardless of
 * language. This is the Content-Pattern principle applied
 * to a playlist-level field.
 *
 * Strategy contract: { value: number|null, confidence: number, strategyName }
 *
 * Used by `countTotalVideosInPlaylist` in the entry point. A `null` value
 * (both strategies fail) makes the count genuinely unknown rather than a
 * buggy `0`, so the sort gate degrades to "no dropdown, no tooltip"
 * instead of false-enabling sorting on large playlists.
 */

const PAGE_HEADER_METADATA_CLASS = "ytPageHeaderViewModelContentMetadata";
const METADATA_TEXT_SELECTOR = "span.ytContentMetadataViewModelMetadataText";
const DELIMITER_SELECTOR = "span.ytContentMetadataViewModelDelimiter";

/**
 * Extract the playlist's total video count.
 *
 * @param {Document} doc
 * @returns {{ value: number|null, confidence: number, strategyName: string }}
 */
export const extractPlaylistCount = (doc = document) => {
  const headerViewModel = locatePageHeaderMetadata(doc);
  if (!headerViewModel) {
    return { value: null, confidence: 0, strategyName: "none" };
  }

  const count = locateByDelimiterFlanking(headerViewModel);
  if (count !== null) {
    return { value: count, confidence: 0.9, strategyName: "metadata-flanked" };
  }

  return { value: null, confidence: 0, strategyName: "none" };
};

/**
 * Locate the playlist's page-header metadata view-model, scoped to the top
 * of the page so per-video `yt-content-metadata-view-model` cards are never
 * considered. The page-header variant is the only one carrying the
 * `ytPageHeaderViewModelContentMetadata` class.
 *
 * @param {Document} doc
 * @returns {Element|null}
 */
const locatePageHeaderMetadata = (doc) => {
  return doc.querySelector(`.${PAGE_HEADER_METADATA_CLASS}`);
};

/**
 * Locate the count by its delimiter-flanking position.
 *
 * The metadata text and delimiter nodes are interleaved as siblings in
 * document order. The count span is the first digit-bearing text node that
 * has a delimiter sibling immediately before AND after it. This excludes:
 *   - "Playlist"/"Private" labels (no digits)
 *   - the trailing view-count span (no delimiter after it. It's last)
 *
 * Returns the parsed integer, or `null` if no flanked digit span is found.
 *
 * @param {Element} headerViewModel
 * @returns {number|null}
 */
const locateByDelimiterFlanking = (headerViewModel) => {
  const nodes = [...headerViewModel.querySelectorAll("*")];

  for (let idx = 0; idx < nodes.length; idx++) {
    const node = nodes[idx];
    if (isDelimiter(node) || !isMetadataText(node)) continue;

    const prev = nodes[idx - 1];
    const next = nodes[idx + 1];
    const flanked = !!prev && !!next && isDelimiter(prev) && isDelimiter(next);
    if (!flanked) continue;

    const value = parseCount(node.textContent);
    if (value !== null) return value;
  }

  return null;
};

const isDelimiter = (node) => {
  if (!node || node.nodeType !== 1) return false;
  return node.matches?.(DELIMITER_SELECTOR) ?? false;
};

const isMetadataText = (node) => {
  if (!node || node.nodeType !== 1) return false;
  return node.matches?.(METADATA_TEXT_SELECTOR) ?? false;
};

/**
 * Parse a leading digit run with optional thousands and grouping separators
 * into an integer. Returns `null` if the text has no leading digits, so a
 * non-count metadata span is never mistaken for the count.
 *
 * Locale-independent: handles ".", "," and space as grouping separators
 * the way the existing views/date parsers already do. Strips anything past
 * the digit run so "154 videos" yields 154 regardless of the trailing word.
 *
 * @param {string} text
 * @returns {number|null}
 */
const parseCount = (text) => {
  if (!text) return null;

  // Anchor at the start: the count span's text BEGINS with the digit run.
  // The adjacent view-count span ("858,009 views") also begins with digits,
  // so digit-presence alone is not the discriminator. The flanking is.
  const match = text.trim().match(/^(\d[\d.,\s]*)/);
  if (!match) return null;

  const digitsOnly = match[1].replace(/[^\d]/g, "");
  if (!digitsOnly) return null;

  const value = Number.parseInt(digitsOnly, 10);
  return Number.isNaN(value) ? null : value;
};
