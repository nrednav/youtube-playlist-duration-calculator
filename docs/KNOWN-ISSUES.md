# Known Issues

The following document describes issues which are already known about & how to
potentially solve them.

## Issue 1: Video remains in playlist after removal

- Problem
  - After sorting the playlist and removing a video from the sorted playlist,
    the video continues to be displayed in the playlist
- Expectation
  - Video is immediately removed from the playlist at the expected position
  - Duration is recalculated
- Explanation
  - Unfortunately, due to the way the "Remove from playlist/watch later" button
    is designed, it retains a reference to the video's original position in the
    playlist even after the playlist is sorted.
  - This means that when the button is clicked, it will not remove the video
    from the expected position in the playlist but instead from the original
    position of the video
  - This is purely a UI issue. If you reload the page, you can confirm that the
    correct video was indeed removed by the YouTube servers
- Potential solution(s)
  - For now, the only solution is to reload the page whenever you remove a video
    from a playlist
  - The extension will display a message within the playlist summary section to
    request you to do this
