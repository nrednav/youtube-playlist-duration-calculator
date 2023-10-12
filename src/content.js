import { pollPlaylistReady } from "./library";

// Entry-point
if (document.readyState !== "loading") {
  pollPlaylistReady();
} else {
  document.addEventListener("DOMContentLoaded", () => {
    pollPlaylistReady();
  });
}
