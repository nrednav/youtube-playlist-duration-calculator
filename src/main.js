import { pollPlaylistReady } from "./library";
import "./main.css";

// Entry-point
if (document.readyState !== "loading") {
  pollPlaylistReady();
} else {
  document.addEventListener("DOMContentLoaded", () => {
    pollPlaylistReady();
  });
}
