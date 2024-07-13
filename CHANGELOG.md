# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic
Versioning](https://semver.org/spec/v2.0.0.html).

## [v2.1.3] - 2024-07-12

### Added

- Added `isElementVisible` function

### Changed

- Updated the logger `debug` method to be controlled by the presence of a
  `ytpdc-debug=true` search param in the URL

### Fixed

- Fixed (hopefully) a rare bug where the extension would not load despite the
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
