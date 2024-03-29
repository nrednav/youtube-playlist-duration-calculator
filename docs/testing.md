# Testing

This document describes the process involved in testing the extension.

## Types of Playlists

- Public
  - Less than 100 videos
    - https://www.youtube.com/playlist?list=PLrtg3MOb7tvG9h9rll5V9O96owfcBpROG
    - https://www.youtube.com/playlist?list=PLBsP89CPrMePWBCMIp0naluIz67UwRX9B
  - More than 100 videos
    - https://www.youtube.com/playlist?list=PLBsP89CPrMeM2MmF4suOeT0vsic9nEC2Y
- Private
  - Regular
  - Watch Later
    - https://www.youtube.com/playlist?list=WL
  - Liked Videos
    - https://www.youtube.com/playlist?list=LL

## Pre-requisites

- Ensure that both Chrome & Firefox are installed
- Ensure the extension has been installed & enabled in both browsers

## Process

- For each type of playlist
  - Visit playlist page
  - Verify the following
    - A summary section is displayed within the playlist information panel
      located on the left-hand side of the page
    - The summary section displays the following:
      - Total duration (hh:mm:ss)
      - Videos counted
      - Videos not counted
      - For playlists with 100 videos or less
        - Sort dropdown
      - For playlists with more than 100 videos
        - Tooltip
    - For playlists with 100 videos or less
      - Clicking on the sort dropdown displays the following sort criteria
        - Index (Ascending/Descending)
        - Duration (Shortest/Longest)
        - Channel Name (A-Z/Z-A)
        - Views (Most/Least)
        - (For public playlists only) Upload Date (Oldest/Newest)
      - Clicking on a sort criterion updates the order of videos in the playlist
    - For playlists with more than 100 videos
      - Scrolling to the bottom updates the summary section to display the text
        "Calculating..."
      - After the next batch of videos have been loaded, the summary section
        updates to display new information
    - For private playlists
      - Removing a video triggers a recalculation of the playlist duration