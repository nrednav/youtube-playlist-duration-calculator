import {
  addSummaryToPage,
  configurePage,
  createPlaylistSummary,
  formatTimestamp,
  getTimestamps,
  getVideos,
  pollPlaylistReady,
  setupEventListeners,
  setupPlaylistObserver
} from "./library";

const start = () => {
  configurePage();
  setupPlaylistObserver();
  setupEventListeners();
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
