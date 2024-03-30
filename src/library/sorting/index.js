import { elementSelectors } from "../index";
import { SortByChannelNameStrategy } from "./sort-by-channel-name";
import { SortByDurationStrategy } from "./sort-by-duration";
import { SortByIndexStrategy } from "./sort-by-index";
import { SortByUploadDateStrategy } from "./sort-by-upload-date";
import { SortByViewsStrategy } from "./sort-by-views";

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

/**
 * Generates an object containing information about each supported sort type
 * @returns {Object}
 */
const generateSortTypes = () => ({
  index: {
    enabled: videoHasElement("yt-formatted-string#index"),
    label: {
      asc: chrome.i18n.getMessage("sortType_index_label_asc"),
      desc: chrome.i18n.getMessage("sortType_index_label_desc")
    },
    strategy: SortByIndexStrategy
  },
  duration: {
    enabled: videoHasElement(elementSelectors.timestamp),
    label: {
      asc: chrome.i18n.getMessage("sortType_duration_label_asc"),
      desc: chrome.i18n.getMessage("sortType_duration_label_desc")
    },
    strategy: SortByDurationStrategy
  },
  channelName: {
    enabled: videoHasElement(".ytd-channel-name"),
    label: {
      asc: chrome.i18n.getMessage("sortType_channelName_label_asc"),
      desc: chrome.i18n.getMessage("sortType_channelName_label_desc")
    },
    strategy: SortByChannelNameStrategy
  },
  views: {
    enabled:
      videoHasElement("yt-formatted-string#video-info") &&
      SortByViewsStrategy.supportedLocales.includes(
        chrome.i18n.getUILanguage()
      ),
    label: {
      asc: chrome.i18n.getMessage("sortType_views_label_asc"),
      desc: chrome.i18n.getMessage("sortType_views_label_desc")
    },
    strategy: SortByViewsStrategy
  },
  uploadDate: {
    enabled:
      videoHasElement("yt-formatted-string#video-info") &&
      !pageHasNativeSortFeature() &&
      SortByUploadDateStrategy.supportedLocales.includes(
        chrome.i18n.getUILanguage()
      ),
    label: {
      asc: chrome.i18n.getMessage("sortType_uploadDate_label_asc"),
      desc: chrome.i18n.getMessage("sortType_uploadDate_label_desc")
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
