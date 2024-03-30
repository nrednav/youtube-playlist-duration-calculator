import { elementSelectors, getTimestampFromVideo } from "./index";

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

class SortByViewsStrategy {
  /**
   * Sorts a list of videos by their view count
   * @param {Array<Element>} videos
   * @param {"asc" | "desc"} sortOrder
   * @returns {Array<Element>}
   */
  sort(videos, sortOrder) {
    return Array.from(videos)
      .slice(0, 100)
      .sort((videoA, videoB) => {
        const videoInfoA = videoA.querySelector(
          "yt-formatted-string#video-info"
        );
        const videoInfoB = videoB.querySelector(
          "yt-formatted-string#video-info"
        );

        const viewCountA = this.extractViewCount(videoInfoA);
        const viewCountB = this.extractViewCount(videoInfoB);

        if (sortOrder === "asc") {
          return viewCountA - viewCountB;
        }

        if (sortOrder === "desc") {
          return viewCountB - viewCountA;
        }
      });
  }

  /**
   * Extracts the view count as a number from a video info element
   * @param {Element} videoInfo
   * @returns {number}
   */
  extractViewCount(videoInfo) {
    const viewCountElement = videoInfo.firstElementChild;
    const viewCountRegex = /(\d+(\.\d+)?[km]?)/g;
    const [viewCountString] = viewCountElement.textContent
      .toLowerCase()
      .match(viewCountRegex);
    const suffix = viewCountString.slice(-1);
    const viewCountBase = parseFloat(viewCountString);

    if (isNaN(viewCountBase)) {
      return 0;
    }

    if (suffix === "k") {
      return Math.round(viewCountBase * 1000);
    } else if (suffix === "m") {
      return Math.round(viewCountBase * 1_000_000);
    } else {
      return Math.round(viewCountBase);
    }
  }
}

class SortByUploadDateStrategy {
  /**
   * Sorts a list of videos by their upload date
   * @param {Array<Element>} videos
   * @param {"asc" | "desc"} sortOrder
   * @returns {Array<Element>}
   */
  sort(videos, sortOrder) {
    return Array.from(videos)
      .slice(0, 100)
      .sort((videoA, videoB) => {
        const videoInfoA = videoA.querySelector(
          "yt-formatted-string#video-info"
        );
        const videoInfoB = videoB.querySelector(
          "yt-formatted-string#video-info"
        );

        const secondsA = this.extractUploadDateAsSeconds(videoInfoA);
        const secondsB = this.extractUploadDateAsSeconds(videoInfoB);

        if (sortOrder === "asc") {
          return secondsA - secondsB;
        }

        if (sortOrder === "desc") {
          return secondsB - secondsA;
        }
      });
  }

  /**
   * Extracts the upload date as seconds from a video info element
   * @param {Element} videoInfo
   * @returns {number}
   */
  extractUploadDateAsSeconds(videoInfo) {
    const secondsByUnit = {
      day: 1 * 86400,
      week: 7 * 86400,
      month: 30 * 86400,
      year: 365 * 86400
    };

    const uploadDateElement = videoInfo.children[2];
    const uploadDateRegex = /(\d+) (\w+) ago/;
    const [value, unit] = uploadDateElement.textContent
      .toLowerCase()
      .match(uploadDateRegex)
      .slice(1);
    const normalizedUnit = unit.endsWith("s") ? unit.slice(0, -1) : unit;
    return parseFloat(value) * secondsByUnit[normalizedUnit];
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
    enabled: videoHasElement(elementSelectors.timestamp),
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
  },
  views: {
    enabled: videoHasElement("yt-formatted-string#video-info"),
    label: {
      asc: "Views (Least)",
      desc: "Views (Most)"
    },
    strategy: SortByViewsStrategy
  },
  uploadDate: {
    enabled:
      videoHasElement("yt-formatted-string#video-info") &&
      !pageHasNativeSortFeature(),
    label: {
      asc: "Upload Date (Newest)",
      desc: "Upload Date (Oldest)"
    },
    strategy: SortByUploadDateStrategy
  }
});

/**
 * Checks whether an element identified by identifier can be found within the
 * first video element rendered in the playlist
 * @param {string} identifier
 * @returns {boolean}
 */
const videoHasElement = (identifier) => {
  const videoElement = document.querySelector(elementSelectors.video);
  return videoElement && videoElement.querySelector(identifier);
};

const pageHasNativeSortFeature = () => {
  const nativeSortElement = document.querySelector(
    "#filter-menu yt-sort-filter-sub-menu-renderer"
  );
  return nativeSortElement !== null;
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
