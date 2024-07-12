# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic
Versioning](https://semver.org/spec/v2.0.0.html).

## [v2.1.3] - 2024-07-12

### Fixed

- Fixed (hopefully) a rare bug where the extension would not load despite the
  playlist being visible
  - As part of the process that checks whether a playlist is ready to be
    processed, the extension checks whether the user is currently on a playlist
    overview page
    - This check is important because we don't want the extension to load on
      non-playlist pages and consume browser resources unnecessarily
  - For a playlist overview page, the value of `window.location.pathname` should
    start with `/playlist`
  - Unfortunately, in some rare cases, when a user navigates to their "Watch
    Later" playlist, `window.location.pathname` would still contain the value of
    the page they navigated from, despite the browser address bar updating to
    display a url that contains `/playlist`
    - A timeout of 15 seconds was added to give the pathname enough time to
      update but it appears this had no effect and the extension would not
      proceed with loading
  - To fix this, the extension will now also check whether a playlist is visible
    before blocking further loading

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
