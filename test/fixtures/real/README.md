# Real-World DOM Fixtures

These fixtures are derived from real YouTube playlist DOM snapshots
captured on 2026-07-05. They supersede the stylized cartoons in the
parent `test/fixtures/` directory for the cases they cover.

## Source

Captured via "Copy outerHTML" from the DevTools Elements panel on
real playlist pages, in Chrome, signed in. Each fixture preserves the
structural DOM YouTube actually ships. Tracking querystring parameters
(`sqp=`, `rs=`, video IDs in URLs) have been redacted to placeholders
since they encode per-requestor info, but the DOM structure is intact.

## Inventory

### Renderer architecture (`ytd-playlist-video-renderer`)

- `renderer-video-item-normal.html`: A normal public video with
  duration, channel name, views, and upload date. Validates the
  selector-match extraction strategy and all sort selectors.
- `renderer-video-item-unavailable-private.html`: A `[Private video]`
  item. No timestamp element at all.
- `renderer-video-item-unavailable-deleted.html`: A `[Deleted video]`
  item. No timestamp element at all.
- `renderer-video-item-live.html`: A live stream. Timestamp element
  exists but reads "LIVE". Must not contribute to the duration total.
- `renderer-video-item-upcoming.html`: A scheduled or premiere video.
  Timestamp element reads "Upcoming". The metadata line contains
  "Scheduled for 7/5/26, 4:00 AM" which is the false-positive trap
  for content-pattern extraction.
- `renderer-video-list-container.html`: The containing
  `ytd-playlist-video-list-renderer > #contents` wrapper that holds
  the above items.

### ViewModel architecture (`yt-lockup-view-model`)

- `viewmodel-video-item-normal.html`: A normal lockup with a
  `badge-shape > div.ytBadgeShapeText` duration, channel name, views,
  and upload date in `yt-content-metadata-view-model` rows. Validates
  the content-pattern extraction strategy against real metadata noise.
- `viewmodel-video-item-unavailable.html`: An unavailable lockup.
  No title text, no duration badge, only "No views" metadata.
- `viewmodel-video-item-live.html`: A live lockup. Duration badge
  contains "LIVE" text. Metadata row contains "1.7k watching".
- `viewmodel-video-item-upcoming.html`: A scheduled lockup.
  Duration badge contains "Upcoming". Metadata row contains
  "Scheduled for 05/07/2026, 04:00" which is the false-positive trap
  for content-pattern extraction on this architecture.

## Known issues these fixtures expose

1. Content-pattern extraction (`content-pattern-extraction.js`)
   matches `/\d{1,2}:\d{2}(:\d{2})?/` against the entire video
   element `textContent`. On Upcoming videos the scheduled time
   "4:00" / "04:00" matches and is silently counted as a duration.
   Confirmed via `node -e` probe against both fixture variants.
2. `isVideoUnavailable` in `main.js` checks
   `ytd-thumbnail-overlay-time-status-renderer` (the renderer
   timestamp selector). This element does not exist in the viewmodel
   DOM, so the predicate is structurally incapable of detecting
   unavailable viewmodel videos.
3. Viewmodel ancestor chain confirmed via probe:
   `yt-lockup-view-model > div > div#contents >
   yt-item-section-renderer > div > yt-section-list-renderer > ...`.
   The fixture parent in the stylized `playlist-viewmodel.html`
   (`yt-section-list-renderer` direct child) matches the `closest()`
   call, so discovery works, but the live insertion container is
   `div#contents` inside `yt-item-section-renderer`, NOT directly
   under `yt-section-list-renderer`.
4. Renderer-invariant discovery's false-positive probe returned an
   empty array on a real public playlist page. Only the actual
   `ytd-playlist-video-list-renderer > #contents` element matches
   the "3+ video-renderer children" heuristic. No sidebar or
   recommendation false positives. This means the renderer-invariant
   strategy is safe on real pages but the existing stylized fixture
   could not have proven that.
