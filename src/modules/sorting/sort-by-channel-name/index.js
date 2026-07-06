import { extractChannelName } from "src/modules/extraction/channel-name-extraction";

export class SortByChannelNameStrategy {
  /**
   * Sorts a list of videos by their channel name.
   *
   * Previously called
   * `video.querySelector(".ytd-channel-name").innerText`, a selector
   * that resolves only on the renderer architecture. On viewmodel it
   * returned null and crashed. The strategy now consumes the
   * architecture-agnostic `extractChannelName` extractor, which locates
   * the channel name by structural invariant (the /@handle anchor).
   *
   * @param {Array<Element>} videos
   * @param {"asc" | "desc"} sortOrder
   * @returns {Array<Element>}
   */
  sort(videos, sortOrder) {
    return [...videos].sort((videoA, videoB) => {
      const nameA = extractChannelName(videoA).value ?? "";
      const nameB = extractChannelName(videoB).value ?? "";

      if (sortOrder === "asc") {
        return nameA.localeCompare(nameB);
      }

      if (sortOrder === "desc") {
        return nameB.localeCompare(nameA);
      }

      return 0;
    });
  }
}
