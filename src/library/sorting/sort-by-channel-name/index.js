export class SortByChannelNameStrategy {
  /**
   * Sorts a list of videos by their channel name
   * @param {Array<Element>} videos
   * @param {"asc" | "desc"} sortOrder
   * @returns {Array<Element>}
   */
  sort(videos, sortOrder) {
    return [...videos].sort((videoA, videoB) => {
      const channelNameA = videoA.querySelector(".ytd-channel-name").innerText;
      const channelNameB = videoB.querySelector(".ytd-channel-name").innerText;

      if (sortOrder === "asc") {
        return channelNameA.localeCompare(channelNameB);
      }

      if (sortOrder === "desc") {
        return channelNameB.localeCompare(channelNameA);
      }
    });
  }
}
