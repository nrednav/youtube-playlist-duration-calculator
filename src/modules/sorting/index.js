import { elementSelectors } from "src/shared/data/element-selectors";
import { extractChannelName } from "../extraction/channel-name-extraction";
import { extractTimestamp } from "../extraction/orchestrator";
import { extractUploadDate } from "../extraction/upload-date-extraction";
import { extractViews } from "../extraction/views-extraction";
import { SortByChannelNameStrategy } from "./sort-by-channel-name";
import { SortByDurationStrategy } from "./sort-by-duration";
import { SortByIndexStrategy } from "./sort-by-index";
import { SortByUploadDateStrategy } from "./sort-by-upload-date";
import { SortByViewsStrategy } from "./sort-by-views";

export class PlaylistSorter {
  /**
   * @param {string} key Format "<sort-type>:<sort-order>"
   */
  constructor(key) {
    const [sortType, sortOrder] = key.split(":");
    const sortTypes = PlaylistSorter.getSortTypes();
    const SortStrategy = sortTypes[sortType].strategy;
    this.strategy = new SortStrategy();
    this.sortOrder = sortOrder;
  }

  /**
   * Sorts a list of elements with specific strategy & order
   * @param {Element[]} videos
   * @returns {Element[]}
   */
  sort(videos) {
    return this.strategy.sort(videos, this.sortOrder);
  }

  /**
   * Generates an object containing information about each supported sort type
   * @returns {Object}
   */
  static getSortTypes() {
    return {
      index: {
        enabled: videoExposesDatum("index"),
        label: {
          asc: chrome.i18n.getMessage("sortType_index_label_asc"),
          desc: chrome.i18n.getMessage("sortType_index_label_desc"),
        },
        strategy: SortByIndexStrategy,
      },
      duration: {
        enabled: videoExposesDatum("duration"),
        label: {
          asc: chrome.i18n.getMessage("sortType_duration_label_asc"),
          desc: chrome.i18n.getMessage("sortType_duration_label_desc"),
        },
        strategy: SortByDurationStrategy,
      },
      channelName: {
        enabled: videoExposesDatum("channelName"),
        label: {
          asc: chrome.i18n.getMessage("sortType_channelName_label_asc"),
          desc: chrome.i18n.getMessage("sortType_channelName_label_desc"),
        },
        strategy: SortByChannelNameStrategy,
      },
      views: {
        enabled:
          videoExposesDatum("views") &&
          SortByViewsStrategy.supportedLocales.includes(
            document.documentElement.lang,
          ),
        label: {
          asc: chrome.i18n.getMessage("sortType_views_label_asc"),
          desc: chrome.i18n.getMessage("sortType_views_label_desc"),
        },
        strategy: SortByViewsStrategy,
      },
      uploadDate: {
        enabled:
          videoExposesDatum("uploadDate") &&
          !pageHasNativeSortFeature() &&
          SortByUploadDateStrategy.supportedLocales.includes(
            document.documentElement.lang,
          ),
        label: {
          asc: chrome.i18n.getMessage("sortType_uploadDate_label_asc"),
          desc: chrome.i18n.getMessage("sortType_uploadDate_label_desc"),
        },
        strategy: SortByUploadDateStrategy,
      },
    };
  }

  /**
   * Generates a list of <div> elements representing each type of sort
   */
  static getSortOptions() {
    const sortTypes = PlaylistSorter.getSortTypes();
    return Object.keys(sortTypes).flatMap((sortType) => {
      const { enabled, label } = sortTypes[sortType];
      if (!enabled) return [];
      return Object.keys(label).map((sortOrder) => {
        const optionElement = document.createElement("div");
        optionElement.classList.add("ytpdc-sort-control-dropdown-option");
        optionElement.setAttribute("value", `${sortType}:${sortOrder}`);
        optionElement.textContent = label[sortOrder];
        return optionElement;
      });
    });
  }
}

/**
 * Whether the first video in the playlist exposes a given sort datum.
 *
 * This replaces the per-architecture
 * `videoHasElement` gate, which branched on renderer vs viewmodel and
 * hardcoded `return false` for channelName / videoInfo on viewmodel. The
 * old gate knew which SELECTOR to query per architecture. When no selector
 * existed for an architecture, the datum was reported absent regardless of
 * whether the data was actually in the DOM.
 *
 * The replacement keys off structural-invariant EXTRACTORS, which locate
 * data by what it IS (a /@handle link, digits + "views", a time-ago
 * phrase, a duration badge) rather than by element name. One code path
 * runs on both architectures. A datum is "present" when its extractor
 * returns positive confidence on the first video.
 *
 * @param {"index"|"duration"|"channelName"|"views"|"uploadDate"} datum
 * @returns {boolean}
 */
const videoExposesDatum = (datum) => {
  const videoElement = resolveFirstVideo();
  if (!videoElement) return false;

  switch (datum) {
    case "index":
      // Index is always available: on renderer via the DOM index element,
      // on viewmodel via array position (frozen to an attribute on first
      // sort). No extraction needed at gate time.
      return true;
    case "duration": {
      const result = extractTimestamp(videoElement);
      return result.confidence > 0;
    }
    case "channelName": {
      const result = extractChannelName(videoElement);
      return result.confidence > 0;
    }
    case "views": {
      const result = extractViews(videoElement);
      return result.confidence > 0;
    }
    case "uploadDate": {
      const result = extractUploadDate(videoElement);
      return result.confidence > 0;
    }
    default:
      return false;
  }
};

/**
 * Resolve the first video element in the playlist, agnostic to the
 * rendering architecture. The renderer architecture renders
 * ytd-playlist-video-renderer. The viewmodel architecture renders
 * yt-lockup-view-model. Both are queried in priority order.
 *
 * @returns {Element|null}
 */
const resolveFirstVideo = () => {
  return (
    document.querySelector(elementSelectors.video) ||
    document.querySelector("yt-lockup-view-model")
  );
};

const pageHasNativeSortFeature = () => {
  const nativeSortElement = document.querySelector(
    "#filter-menu yt-sort-filter-sub-menu-renderer",
  );
  return nativeSortElement !== null;
};
