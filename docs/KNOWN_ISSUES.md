# Known Issues

This document describes issues which are already known & how to potentially
solve them.

## Issue 1: Video remains in playlist after removal

- Problem
  - After sorting a playlist and then removing a video from the sorted playlist,
    the video continues to be displayed in the sorted playlist
- Expectation
  - Video is immediately removed from the playlist at the expected position
  - Duration is recalculated
- Explanation
  - Video A = video to remove
  - Video B = some random video
  - Unfortunately, due to the way the "Remove from playlist/watch later"
    button is designed, it retains a reference to Video A's original
    position in the playlist even after the playlist is sorted
  - This means that when the button is clicked, it will remove some Video B,
    which is currently located at Video A's original position, while Video A
    remains in the playlist at its current position
  - This is purely a client UI issue. If you reload the page, you can confirm
    that Video A was correctly removed by YouTube's servers and Video B remains
    untouched
- Potential solution(s)
  - For now, the only solution is to reload the page whenever you remove a video
    from a playlist
  - The extension will display a message within the playlist summary section to
    request you to do this
