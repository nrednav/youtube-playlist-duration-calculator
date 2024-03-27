import { config, getTimestampFromVideo } from "./index";

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
  /**
   * Sorts a list of videos by their index
   * @param {Array<Element>} videos
   * @param {"asc" | "desc"} sortOrder
   * @returns {Array<Element>}
   */
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

/**
 * Generates an object containing information about each supported sort type
 * @returns {Object}
 */
const generateSortTypes = () => ({
  index: {
    enabled: videoHasElement("yt-formatted-string#index"),
    label: {
      asc: "Index (Ascending)",
      desc: "Index (Descending)"
    },
    strategy: SortByIndexStrategy
  },
  duration: {
    enabled: videoHasElement(config.timestampContainer),
    label: {
      asc: "Duration (Shortest)",
      desc: "Duration (Longest)"
    },
    strategy: SortByDurationStrategy
  },
  channelName: {
    enabled: videoHasElement(".ytd-channel-name"),
    label: {
      asc: "Channel Name (A-Z)",
      desc: "Channel Name (Z-A)"
    },
    strategy: SortByChannelNameStrategy
  }
});

/**
 * Checks whether an element identified by identifier can be found within the
 * first video element rendered in the playlist
 * @param {string} identifier
 * @returns {boolean}
 */
const videoHasElement = (identifier) => {
  const videoElement = document.querySelector(config.videoElement);
  return videoElement && videoElement.querySelector(identifier);
};

/**
 * Generates a list of <option> elements for each type of sort
 */
const generateSortOptions = (sortTypes) => {
  return Object.keys(sortTypes).flatMap((sortType) => {
    const { enabled, label } = sortTypes[sortType];
    if (!enabled) return [];
    return Object.keys(label).map((sortOrder) => {
      const option = document.createElement("option");
      option.value = `${sortType}:${sortOrder}`;
      option.textContent = label[sortOrder];
      return option;
    });
  });
};

export { generateSortTypes, generateSortOptions, PlaylistSorter };
