# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic
Versioning](https://semver.org/spec/v2.0.0.html).

## [v2.3.1] - 2026-07-07

### Fixed

- Fixed `discoverByViewModel` using stale playlist recommendation cards
  from a previous SPA page as the insertion container and readiness
  sample. Lockups whose `badge-shape` text is a video count ("20 videos")
  are now excluded. Only lockups whose `badge-shape` text matches a
  duration pattern ("1:28:08") are used for container derivation and
  readiness checks.
- Fixed duration validation to reject invalid clock values where
  seconds are 60 or greater (e.g. "9:99"). Previously, each module
  (discovery, extraction, sorting) duplicated a loose regex that
  matched any digit-colon-digit sequence regardless of clock validity.
  A shared `duration-pattern` module now provides `isDurationText` and
  `extractDuration` with seconds-bounds checking, so bad inputs like
  "9:99" are rejected everywhere.
- Fixed the structural-invariant discovery strategy passing a hardcoded
  `"unknown"` variant to the search function. When renderer-like elements
  from adjacent page sections were present during an SPA transition, the
  renderer-invariant branch could short-circuit before the viewmodel
  branch ran. The strategy now passes the actual variant detected from
  the live DOM.
- Fixed `resolveDurationBadge` returning the first `badge-shape` in DOM
  order regardless of its text content. It now scans all `badge-shape`
  elements for one whose text matches a duration pattern, then attempts
  a bounded descendant-element scan (length < 10 characters, excluding
  false positives from metadata strings), then falls back to the legacy
  renderer selector.
- Fixed sort-type detection after SPA navigation. `resolveFirstVideo`
  no longer returns the first `yt-lockup-view-model` in DOM order (which
  may be a stale card), but scans for a lockup whose `badge-shape`
  contains a real duration pattern. Only index sorting was shown when
  a stale card was selected.
- Fixed `resolveFirstVideo` returning the first lockup as a fallback
  when no lockup has a duration badge. It now returns null in that case,
  causing the sort dropdown to show "No options available" rather than
  probing a stale or non-playable card.
- Fixed upload date locale parsers (en, es, fr, pt, zh-Hans-CN,
  zh-Hant-TW) throwing `TypeError: Cannot read properties of null` on
  metadata fragments that pass the date-fragment gate (contain a digit)
  but do not match the locale's date regex. Each parser now guards the
  `.match()` return value and returns `null` on mismatch.
- Fixed SPA transition race where a poll tick detects a pathname change
  to /playlist before YouTube's DOM finishes rendering, causing
  discovery to run on a transition-state page, derive the wrong
  insertion container, and process only 1 video. The polling loop now
  skips the tick and resets the poll counter when the pathname differs
  from the previous tick, giving YouTube's renderer one full interval
  to stabilise before running discovery.

## [v2.3.0] - 2026-07-03

### Added

- Support for the `yt-lockup-view-model` (view-model) rendering architecture
  alongside the existing `ytd-*-renderer` architecture. The extension now
  detects the active variant and runs discovery, extraction, reactivity, and
  readiness logic against either layout.
- Structural-invariant discovery strategy that locates the playlist container
  by structure (duration-bearing lockups, video-renderer children) rather
  than by YouTube's chosen element names, used as a fallback when the known
  selectors miss.
- Content-pattern extraction strategy for timestamps, channel names, upload
  dates, and views. Locates data by what it is (`/@handle` anchors,
  digits plus "views", time-ago phrases, duration badges) rather than by
  element name, so extraction survives single-architecture selector breakage.
- Confidence-bounded duration aggregation. When timestamps are recovered via
  pattern matching rather than an exact selector, the summary reports the
  count of estimated videos and a per-token-shape worst-case error bound
  rather than presenting the total as exact.
- User-visible failure indicator (red-bordered panel) shown inside the
  playlist summary when no discovery strategy can locate the playlist,
  with a localized message and a pre-filled, account-free report link
  capturing extension version, browser, and locale.
- "No options available" placeholder in the sort dropdown when no sort
  strategies report positive confidence on the first video.
- `?ytpdc-debug=true` diagnostic logging of variant detection, strategy
  prioritization, discovery results, and the failure snapshot.
- Failure-indicator and sort-dropdown placeholder strings to all locales
  (`en`, `es`, `fr`, `pt`, `pt_BR`, `pt_PT`, `zh`, `zh_CN`, `zh_TW`).

### Changed

- Refactored the sort-gate predicate from `videoHasElement` (per-architecture
  selector query that hard-disabled `channelName` and `videoInfo` on
  view-model) to `videoExposesDatum`, which reports a datum as present when
  its extractor returns positive confidence. One code path runs on both
  architectures.
- Refactored the readiness loop in `main.js` into named predicates
  (`shouldSignalFailureForUnknownVariant`, `shouldStopPollingSilently`,
  `isViewmodelDesyncCheckpoint`, `maybeRunInvariantSearch`, `isRendererReady`,
  `isViewmodelReady`) and split the failure path into a `signalFailure` helper.
- Split unavailable-video accounting into the broad
  `countVideosWithoutExtractableTimestamp` and the narrow
  `countVideosFlaggedUnavailable`, with the readiness invariant that the two
  counts agree.
- Observer target resolution now falls back to the discovered view-model
  insertion container when the known renderer selector does not match, so
  scroll-triggered appends are detected on both architectures.
- `convertSecondsToTimestamp` now guards negative and non-finite input,
  returning `00:00:00` instead of producing `NaN` or negative-segment output.
- Polling interval is now tracked in a module-level handle and cleared on
  stop to prevent the readiness loop from running indefinitely after exit.
- Bumped dependency audit state via `npm audit fix`.

### Fixed

- Fixed the playlist summary being injected on non-playlist pages
  (e.g. `/feed/playlists`, `/feed/history`, `/watch`, channel pages) during
  SPA transition windows where `window.location.pathname` had already
  flipped while the prior page's playlist DOM had not yet been torn down.
  Insertion is now gated on a single positive predicate,
  `isOperablePlaylistPage`, at the `processPlaylist` and loader call sites.
- Fixed the sort dropdown enabling itself on unknown or oversized playlists.
  An unknown video count previously coerced to `0` and passed a `<=` cap
  check, enabling sorting on playlists the extension cannot sort in full.
  Sorting is now disabled when the total count is unknown, `NaN`, or meets
  the cap of 100.
- Fixed `SortByIndexStrategy` being a function of its own output on
  architectures without a DOM index element. Because the strategy reordered
  the live DOM via `replaceChildren`, the input array arrived pre-sorted on
  the next call, making ascending a no-op and descending alternate between
  directions on repeated clicks. The strategy now freezes each video's
  original position to a `data-ytpdc-original-index` attribute on first sort.
- Fixed `SortByChannelNameStrategy` crashing on the view-model architecture
  where the `.ytd-channel-name` selector does not resolve. The strategy now
  consumes the architecture-agnostic `extractChannelName` extractor.
- Fixed scheduled-time (upcoming) videos being miscounted in the unavailable
  timestamp tally during duration parse.

## [v2.2.3] - 2026-04-12

### Changed

- Refactored logger `debug` method to use structured event labels with
  lazy-evaluated data payloads
- Added structured debug logging across playlist detection, observer lifecycle,
  mutation handling, and summary insertion
- Deduplicated extension entry-point initialization

### Fixed

- Fixed playlist metadata element not rendering on public & private playlists
  due to YouTube renaming the page header CSS class
- Fixed `getPlaylistMetadataElement` returning invisible elements from
  `querySelector` matches, which could prevent the summary from appearing

## [v2.2.2] - 2025-09-04

### Fixed

- Ensure the summary element is removed on page navigation to prevent
  duplication.
- Update the playlist metadata element selector to support recent YouTube UI
  changes.
- Set a default text color for the loading indicator to improve contrast.

## [v2.2.1] - 2025-06-25

### Updated

- Updated dependencies
- Refactored build system
  - Migrated from pnpm to npm
  - Migrated from ESLint + Prettier to Biome

### Fixed

- Fixed the text color of playlist summary item labels (e.g. Total duration,
  Videos counted)

## [v2.2.0] - 2024-07-27

### Added

- Added try-catch error handling to `main()`
- Created `getPlaylistMetadataElement` function
  - The playlist metadata element appears to have a different identifier
    depending on if the user has YouTube premium or not
  - This function will take that into account and use the appropriate selector
    to find the metadata element
- Added `youtubePremium` variant to list of `playlistMetadata` element selectors
- Added translations for `fr` locale
- Implemented sorting by view count & upload date for `fr` locale
- Added tests for the `fr` locale parsers

### Fixed

- Fixed extension not loading for youtube premium layouts

## [v2.1.4] - 2024-07-26

### Removed

- Removed code which checks whether the video has a channel name from the
  `isVideoUnavailable` function
  - Found a rare situation where a
    [video](https://www.youtube.com/watch?v=QwtyIDmhxh4) (as of 2024-07-26) had
    a valid title and timestamp but no channel name
  - This incorrectly flagged the video as "unavailable"
  - The `checkPlaylistReady` function relies on the count of unavailable videos
    & timestamps to determine whether a playlist is ready to be processed
  - The video being incorrectly flagged, led to one count being higher than the
    other, and so the extension determined the playlist was "not ready"

## [v2.1.3] - 2024-07-12

### Added

- Added `isElementVisible` function

### Changed

- Updated the logger `debug` method to be controlled by the presence of a
  `ytpdc-debug=true` search param in the URL

### Fixed

- Fixed a rare bug where the extension would not load despite the
  playlist being visible
  - This was caused by unreliable logic in the `checkPlaylistReady` function

## [v2.1.2] - 2024-04-16

### Fixed

- Fixed bug with extension on non-playlist pages where it would spam error logs
  due to not finding a playlist element
- Fixed bug where playlists containing "Upcoming" videos would not calculate a
  total duration
- Fixed bug where the yt-navigate-finish event listener was not being removed
  before a new one could be added
- Added browser console logs to indicate when the extension loads & when it
  cannot find a playlist

## [v2.1.1] - 2024-04-13

### Fixed

- Fixed an issue with timestamp strings not being parsed correctly leading to an
  inaccurate total duration being calculated
  - It appears something may have changed recently with how timestamps are
    rendered since the timestamp DOM element now has a chance to contain
    duplicate timstamp strings, e.g. `04:20\n 04:20`
  - So when `convertTimestampToSeconds` gets such a timestamp and attempts to
    split it by `:`, the end result is 4 time components: `[4, 20, 4, 20]`
  - To fix this, `getTimestampFromVideo` will now use a regular expression to
    extract the timestamp from the DOM element

## [v2.1.0] - 2024-04-07

### Added

- Added ability to sort playlists by different criteria (index, duration, views,
  channel name, upload date)
- Added i18n support & language translations:
  - English (en, en-GB, en-IN, en-US)
  - Spanish (es, es-419, es-us)
  - Portuguese (pt-PT, pt-BR)
  - Chinese (zh-Hans-CN, zh-Hant-TW)
- Added & updated documentation (README, testing, adding translations)

### Changed

- Migrated package manager from npm to pnpm
- Refactored several parts of codebase to reduce complexity

### Fixed

- Fixed several bugs
  - Bug with mutation observer not disconnecting when navigating between
    playlists
  - Bug where timestamps were not being summed properly
- Addressed vulnerabilities reported by pnpm audit and dependabot

[v2.3.1]: https://github.com/nrednav/youtube-playlist-duration-calculator/compare/v2.3.0...v2.3.1
[v2.3.0]: https://github.com/nrednav/youtube-playlist-duration-calculator/compare/v2.2.3...v2.3.0
[v2.2.3]: https://github.com/nrednav/youtube-playlist-duration-calculator/compare/v2.2.2...v2.2.3
[v2.2.2]: https://github.com/nrednav/youtube-playlist-duration-calculator/compare/v2.2.1...v2.2.2
[v2.2.1]: https://github.com/nrednav/youtube-playlist-duration-calculator/compare/v2.2.0...v2.2.1
[v2.2.0]: https://github.com/nrednav/youtube-playlist-duration-calculator/compare/v2.1.4...v2.2.0
[v2.1.4]: https://github.com/nrednav/youtube-playlist-duration-calculator/compare/v2.1.3...v2.1.4
[v2.1.3]: https://github.com/nrednav/youtube-playlist-duration-calculator/compare/v2.1.2...v2.1.3
[v2.1.2]: https://github.com/nrednav/youtube-playlist-duration-calculator/compare/v2.1.1...v2.1.2
[v2.1.1]: https://github.com/nrednav/youtube-playlist-duration-calculator/compare/v2.1.0...v2.1.1
[v2.1.0]: https://github.com/nrednav/youtube-playlist-duration-calculator/releases/tag/v2.1.0
