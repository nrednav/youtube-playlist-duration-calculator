const start = () => {
  console.log("start");
  configurePage();
  setupPlaylistObserver();
  setupEventListeners();
  const videos = getVideos();
  const timestamps = getTimestamps(videos);
  const totalDurationInSeconds = timestamps.reduce((a, b) => a + b);
  const playlistDuration = formatTimestamp(totalDurationInSeconds);
  const playlistSummary = createPlaylistSummary({ videos, playlistDuration });
  addSummaryToPage(playlistSummary);
};

// Entry-point
if (document.readyState !== "loading") {
  pollPlaylistReady();
} else {
  document.addEventListener("DOMContentLoaded", () => {
    pollPlaylistReady();
  });
}
