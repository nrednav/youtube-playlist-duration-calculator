import { pollPlaylistReady } from "./library/index";
import "./main.css";

// Entry-point
if (document.readyState !== "loading") {
  pollPlaylistReady();
} else {
  document.addEventListener("DOMContentLoaded", () => {
    pollPlaylistReady();
  });
}
