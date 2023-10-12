import {
  configurePage,
  setupPlaylistObserver,
  setupEventListeners,
  getVideos,
  getTimestamps,
  formatTimestamp,
  createPlaylistSummary,
  addSummaryToPage,
  pollPlaylistReady
} from "./library";

const start = () => {
  configurePage();
  setupPlaylistObserver(start);
  setupEventListeners(start);
  const videos = getVideos();
  const timestamps = getTimestamps(videos);
  const totalDurationInSeconds = timestamps.reduce((a, b) => a + b);
  const playlistDuration = formatTimestamp(totalDurationInSeconds);
  const playlistSummary = createPlaylistSummary({
    timestamps,
    playlistDuration
  });
  addSummaryToPage(playlistSummary);
};

// Entry-point
if (document.readyState !== "loading") {
  pollPlaylistReady(start);
} else {
  document.addEventListener("DOMContentLoaded", () => {
    pollPlaylistReady(start);
  });
}
