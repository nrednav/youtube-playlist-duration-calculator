/**
 * Page Guard
 *
 * The indivisible bridge between a URL state (where the extension is
 * permitted to operate) and the territory-level insertion decisions in
 * main.js.
 *
 * The insertion branch of addPlaylistSummaryToPage, and every call site
 * of processPlaylist, previously guarded on incidental signals: whether a
 * playlist selector happened to match, whether the detected variant was
 * "known," or whether `pathname !== "/playlist"` held for the *stop*
 * branches. None of these are a positive, structural statement of "this
 * page is one where the extension may insert UI."
 *
 * That gap left the renderer branch of checkPlaylistReady (the only
 * processPlaylist call site not already gated by `pathname === "/playlist"`)
 * vulnerable to SPA transition windows: YouTube updates
 * `window.location.pathname` to a non-playlist URL (e.g. /feed/playlists)
 * before tearing down the prior page's playlist renderer DOM. During that
 * window the playlist selector still resolves, the timestamp selector
 * still resolves, the new page's metadata header is already rendered,
 * and processPlaylist inserts the summary under the new page's title.
 *
 * The fix is not to name `/feed/playlists` (that fixes one symptom and
 * leaves the same window open on /feed/history, /watch, channel pages,
 * and any future non-playlist URL). The fix is a single positive
 * predicate: operate only on the page the extension is for.
 *
 * The URL pathname is updated atomically by YouTube's SPA router before
 * the DOM is progressively cleaned up, so the live pathname is the
 * structurally invariant signal during the transition window. A live
 * `pathname` check at the call site is robust to every variant of the
 * stale-DOM failure, including ones not yet observed.
 */

/**
 * The single pathname on which the extension is permitted to operate.
 *
 * @type {string}
 */
export const OPERABLE_PLAYLIST_PATHNAME = "/playlist";

/**
 * Whether the current page is one where the extension may insert UI or
 * process a playlist.
 *
 * Strict positive match: the pathname must be exactly "/playlist". Every
 * other URL, including /feed/playlists, /feed/history, /watch, channel
 * pages, and the root, returns false. This is the affirmative principle:
 * the extension does not ask "is this URL forbidden," it asks "is this
 * URL permitted," and only one URL is permitted.
 *
 * @param {string} [pathname] - Defaults to the live `window.location.pathname`
 *   so callers in main.js do not have to thread it through. Tests pass an
 *   explicit value.
 * @returns {boolean}
 */
export const isOperablePlaylistPage = (pathname = window.location.pathname) => {
  return pathname === OPERABLE_PLAYLIST_PATHNAME;
};
