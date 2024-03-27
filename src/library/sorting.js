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
  /**
   * Sorts a list of videos by their duration
   * @param {Array<Element>} videos
   * @param {"asc" | "desc"} sortOrder
   * @returns {Array<Element>}
   */
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
  /**
   * Sorts a list of videos by their channel name
   * @param {Array<Element>} videos
   * @param {"asc" | "desc"} sortOrder
   * @returns {Array<Element>}
   */
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

class SortByIndexStrategy {
  sort(videos, sortOrder) {
    return Array.from(videos)
      .slice(0, 100)
      .sort((videoA, videoB) => {
        const indexA = videoA.querySelector(
          "yt-formatted-string#index"
        ).innerText;
        const indexB = videoB.querySelector(
          "yt-formatted-string#index"
        ).innerText;

        if (sortOrder === "asc") {
          return Number(indexA) - Number(indexB);
        }

        if (sortOrder === "desc") {
          return Number(indexB) - Number(indexA);
        }
      });
  }
}

const SORT_TYPES = {
  index: {
    label: {
      asc: "Index (Ascending)",
      desc: "Index (Descending)"
    },
    strategy: SortByIndexStrategy
  },
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

const SORT_OPTIONS = Object.keys(SORT_TYPES).flatMap((sortType) => {
  const { label } = SORT_TYPES[sortType];
  return Object.keys(label).map((sortOrder) => {
    return () => {
      const option = document.createElement("option");
      option.value = `${sortType}:${sortOrder}`;
      option.textContent = label[sortOrder];
      return option;
    };
  });
});

export { SORT_TYPES, SORT_OPTIONS, PlaylistSorter };
