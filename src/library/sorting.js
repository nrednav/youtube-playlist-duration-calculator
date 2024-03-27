import { getTimestampFromVideo } from "./index";

class PlaylistSorter {
  constructor(strategy, sortOrder) {
    this.strategy = strategy;
    this.sortOrder = sortOrder;
  }

  setStrategy(strategy, sortOrder) {
    this.strategy = strategy;
    this.sortOrder = sortOrder;
  }

  sort(videos) {
    return this.strategy.sort(videos, this.sortOrder);
  }
}

class SortByDurationStrategy {
  sort(videos, sortOrder) {
    return Array.from(videos)
      .slice(0, 100)
      .sort((videoA, videoB) => {
        const timestampA = getTimestampFromVideo(videoA);
        const timestampB = getTimestampFromVideo(videoB);

        if (sortOrder === "asc") {
          return timestampA - timestampB;
        }

        if (sortOrder === "desc") {
          return timestampB - timestampA;
        }
      });
  }
}

class SortByChannelNameStrategy {
  sort(videos, sortOrder) {
    return Array.from(videos)
      .slice(0, 100)
      .sort((videoA, videoB) => {
        const channelNameA =
          videoA.querySelector(".ytd-channel-name").innerText;
        const channelNameB =
          videoB.querySelector(".ytd-channel-name").innerText;

        if (sortOrder === "asc") {
          return channelNameA.localeCompare(channelNameB);
        }

        if (sortOrder === "desc") {
          return channelNameB.localeCompare(channelNameA);
        }
      });
  }
}

const SORT_TYPES = {
  duration: {
    label: {
      asc: "Duration (Shortest)",
      desc: "Duration (Longest)"
    },
    strategy: SortByDurationStrategy
  },
  channelName: {
    label: {
      asc: "Channel Name (A-Z)",
      desc: "Channel Name (Z-A)"
    },
    strategy: SortByChannelNameStrategy
  }
};

export { SORT_TYPES, PlaylistSorter };
