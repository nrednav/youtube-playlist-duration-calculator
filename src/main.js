import { PlaylistSorter } from "./modules/sorting";
import { logger } from "./shared/modules/logger";
import { elementSelectors } from "./shared/data/element-selectors";
import {
  convertSecondsToTimestamp,
  getTimestampFromVideo
} from "./shared/modules/timestamp";
import "./main.css";

const main = () => {
  setupPage();
  checkPlaylistReady();
};

const checkPlaylistReady = () => {
  logger.debug("Checking if playlist is ready to be processed");

  displayLoader();

  const maxPollCount = 60;
  let pollCount = 0;

  let playlistPoll = setInterval(() => {
    if (pollCount >= maxPollCount) clearInterval(playlistPoll);

    const playlistElement = document.querySelector(elementSelectors.playlist);
    const playlistExists = playlistElement !== null;

    if (
      pollCount > 15 &&
      !(playlistExists && isElementVisible(playlistElement)) &&
      window.location.pathname !== "/playlist"
    ) {
      clearInterval(playlistPoll);

      logger.warn("Could not find a playlist.");

      logger.debug(
        "Could not find a playlist",
        JSON.stringify({
          pollCount: pollCount,
          playlistExists: playlistExists,
          playlistVisible: isElementVisible(playlistElement),
          location: window.location
        })
      );

      return;
    }

    const timestampElement = document.querySelector(elementSelectors.timestamp);
    const timestampExists = timestampElement !== null;

    if (
      playlistExists &&
      timestampExists &&
      countUnavailableTimestamps() === countUnavailableVideos()
    ) {
      clearInterval(playlistPoll);

      const playlistVisible = isElementVisible(playlistElement);

      if (playlistVisible) {
        processPlaylist();
      } else {
        logger.debug("Playlist exists but is not visible, skipping processing");
      }
    }

    pollCount++;
  }, 1000);
};

const displayLoader = () => {
  const playlistSummaryElement = getPlaylistSummaryElement();
  if (!playlistSummaryElement) return;

  const loaderElement = document.createElement("div");
  loaderElement.id = "ytpdc-loader";
  loaderElement.textContent = chrome.i18n.getMessage("loaderMessage");

  playlistSummaryElement.innerHTML = "";
  playlistSummaryElement.appendChild(loaderElement);
};

const setupPage = () => {
  if (window.ytpdc && window.ytpdc.pageSetupDone) return;

  window.ytpdc = {
    pageSetupDone: false,
    playlistObserver: null,
    sortDropdown: {
      used: false,
      element: null
    },
    lastVideoInteractedWith: null
  };

  const onYoutubeNavigationFinished = () => {
    logger.debug(
      "YT Navigation Finished",
      `${JSON.stringify(window.location)}`
    );

    document.removeEventListener(
      "yt-navigate-finish",
      onYoutubeNavigationFinished,
      false
    );

    window.ytpdc.playlistObserver?.disconnect();

    window.ytpdc = {
      pageSetupDone: false,
      playlistObserver: null,
      sortDropdown: {
        used: false,
        element: null
      },
      lastVideoInteractedWith: null
    };

    main();
  };

  document.addEventListener(
    "yt-navigate-finish",
    onYoutubeNavigationFinished,
    false
  );

  const onPlaylistInteractedWith = (event) => {
    window.ytpdc.lastVideoInteractedWith = event.target.closest(
      elementSelectors.video
    );
  };

  document
    .querySelector(elementSelectors.playlist)
    ?.addEventListener("click", onPlaylistInteractedWith);

  window.ytpdc.pageSetupDone = true;
};

/**
 * Checks whether a given element is visible to the browser
 *
 * Ref:
 * - https://developer.mozilla.org/en-US/docs/Web/API/Element/checkVisibility
 * - https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetParent
 *
 * @param {Element} element
 */
const isElementVisible = (element) => {
  if (!element) return false;

  return (
    element?.offsetParent !== null ||
    element?.checkVisibility({
      contentVisibilityAuto: true,
      opacityProperty: true,
      visibilityProperty: true
    })
  );
};

const getPlaylistSummaryElement = () => {
  const selector =
    elementSelectors.playlistSummary[isNewDesign() ? "new" : "old"];
  return document.querySelector(selector);
};

const isNewDesign = () => {
  const designAnchors = {
    new: document.querySelector(elementSelectors.designAnchor.new),
    old: document.querySelector(elementSelectors.designAnchor.old)
  };

  return designAnchors.new && designAnchors.old.getAttribute("hidden") !== null;
};

/**
 * Counts the number of invalid timestamps in a list of video elements
 * @returns {number}
 */
const countUnavailableTimestamps = () => {
  return getVideos()
    .map(getTimestampFromVideo)
    .filter((timestamp) => timestamp === null).length;
};

/**
 * Returns a list of video elements found within the playlist element
 * @returns {Element[]}
 **/
const getVideos = () => {
  const playlistElement = document.querySelector(elementSelectors.playlist);
  if (!playlistElement) return [];

  const videos = playlistElement.getElementsByTagName(elementSelectors.video);
  return [...videos];
};

const countUnavailableVideos = () => {
  return getVideos().filter(isVideoUnavailable).length;
};

/**
 * Checks whether a given video element meets the criteria for being considered
 * "unavailable"
 * @param {Element} video
 */
const isVideoUnavailable = (video) => {
  const hasNoTimestamp =
    video.querySelector(elementSelectors.timestamp)?.innerText.trim() === "";

  if (hasNoTimestamp) return true;

  const hasUnavailableTitle = [
    chrome.i18n.getMessage("videoTitle_private"),
    chrome.i18n.getMessage("videoTitle_deleted"),
    chrome.i18n.getMessage("videoTitle_unavailable_v1"),
    chrome.i18n.getMessage("videoTitle_unavailable_v2"),
    chrome.i18n.getMessage("videoTitle_restricted"),
    chrome.i18n.getMessage("videoTitle_ageRestricted")
  ].includes(getVideoTitle(video));

  if (hasUnavailableTitle) return true;

  const hasNoChannelName =
    video.querySelector(elementSelectors.channelName)?.innerText.trim() === "";

  if (hasNoChannelName) return true;

  return false;
};

/**
 * @param {Element} video
 * @returns {string | undefined}
 */
const getVideoTitle = (video) => {
  return video.querySelector(elementSelectors.videoTitle)?.title;
};

const processPlaylist = () => {
  logger.debug("Processing playlist");

  const playlistObserver = setupPlaylistObserver();
  const videos = getVideos();
  const timestamps = videos.map(getTimestampFromVideo);

  logger.debug("Calculating total duration");

  const totalDurationInSeconds =
    Array.isArray(timestamps) && timestamps.length > 0
      ? timestamps.reduce((a, b) => a + b)
      : 0;
  const playlistDuration = convertSecondsToTimestamp(totalDurationInSeconds);

  addPlaylistSummaryToPage({ timestamps, playlistDuration, playlistObserver });
};

/**
  * Sets up a mutation observer on the playlist to detect when video(s) are
  * added or removed.
  * Upon detection it conditionally triggers a re-processing of the playlist
  * @returns {{
      disconnect: () => void,
      reconnect: () => void
    } | null}
  */
const setupPlaylistObserver = () => {
  if (window.ytpdc.playlistObserver) return window.ytpdc.playlistObserver;

  const playlistElement = document.querySelector(elementSelectors.playlist);
  if (!playlistElement) return null;

  const playlistObserver = new MutationObserver(onPlaylistMutated);
  playlistObserver.observe(playlistElement, { childList: true });
  window.ytpdc.playlistObserver = playlistObserver;

  return {
    disconnect: () => playlistObserver.disconnect(),
    reconnect: () =>
      playlistObserver.observe(playlistElement, { childList: true })
  };
};

/**
 * This function decides when the playlist duration should be recalculated & how
 * @param {MutationRecord[]} mutationList
 * @param {MutationObserver} observer
 * @returns {void | undefined}
 */
const onPlaylistMutated = (mutationList, observer) => {
  const playlistElement = document.querySelector(elementSelectors.playlist);

  if (mutationList.length === 1 && mutationList[0].type === "childList") {
    const mutation = mutationList[0];

    if (shouldRequestPageReload(mutation)) {
      // Problem encountered, request a page reload
      displayMessages([
        chrome.i18n.getMessage("problemEncountered_paragraphOne"),
        chrome.i18n.getMessage("problemEncountered_paragraphTwo")
      ]);
      observer.disconnect();
      return;
    }

    // No problem encountered, continue processing mutation

    const removedVideo = mutation.removedNodes[0];

    // If the playlist was sorted, YouTube removes the wrong video from the
    // playlist UI (correct video is removed by the server though)
    // So the following code re-adds that removed video to the playlist
    if (
      getVideoTitle(removedVideo) !==
      getVideoTitle(window.ytpdc.lastVideoInteractedWith)
    ) {
      if (mutation.previousSibling) {
        mutation.previousSibling.after(removedVideo);
      } else if (mutation.nextSibling) {
        mutation.nextSibling.before(removedVideo);
      }
    }

    observer.disconnect();
    window.ytpdc.lastVideoInteractedWith.remove();
    observer.observe(playlistElement, { childList: true });
    main();
  } else {
    main();
  }
};

/**
 * Checks whether enough conditions hold true when the playlist is mutated
 * to request a page reload
 * @param {MutationRecord} mutation
 * @returns {boolean}
 */
const shouldRequestPageReload = (mutation) => {
  return (
    mutation.addedNodes.length === 0 &&
    mutation.removedNodes.length === 1 &&
    mutation.removedNodes[0]?.tagName.toLowerCase() ===
      elementSelectors.video &&
    window.ytpdc.sortDropdown.used &&
    !window.ytpdc.lastVideoInteractedWith
  );
};

/**
 * Display a list of messages within the playlist summary element
 * @param {string[]} messages
 */
const displayMessages = (messages) => {
  const playlistSummaryElement = getPlaylistSummaryElement();
  if (!playlistSummaryElement) return;

  const containerElement = document.createElement("div");
  containerElement.id = "messages-container";

  messages.forEach((message) => {
    const messageElement = document.createElement("p");
    messageElement.textContent = message;
    containerElement.appendChild(messageElement);
  });

  playlistSummaryElement.innerHTML = "";
  playlistSummaryElement.appendChild(containerElement);
};

const addPlaylistSummaryToPage = ({
  timestamps,
  playlistDuration,
  playlistObserver
}) => {
  logger.debug("Adding playlist summary to page");

  const playlistSummaryElement = createPlaylistSummaryElement({
    timestamps,
    playlistDuration,
    playlistObserver
  });

  const existingPlaylistSummaryElement = getPlaylistSummaryElement();

  if (existingPlaylistSummaryElement) {
    existingPlaylistSummaryElement.replaceWith(playlistSummaryElement);
  } else {
    const metadataElement = document.querySelector(
      elementSelectors.playlistMetadata[isNewDesign() ? "new" : "old"]
    );
    if (!metadataElement) return null;

    metadataElement.parentElement.insertBefore(
      playlistSummaryElement,
      metadataElement.nextElementSibling
    );
  }
};

const createPlaylistSummaryElement = ({
  timestamps,
  playlistDuration,
  playlistObserver
}) => {
  const newDesign = isNewDesign();

  const containerElement = document.createElement("div");
  containerElement.id = elementSelectors.playlistSummary[
    newDesign ? "new" : "old"
  ].replace("#", "");
  containerElement.classList.add("container");

  // Fallback styles for old design
  if (!newDesign) {
    if (isDarkMode()) {
      containerElement.style.color = "white";
    } else {
      containerElement.style.background = "rgba(0,0,0,0.8)";
      containerElement.style.color = "white";
    }
  }

  const totalDuration = createSummaryItem(
    chrome.i18n.getMessage("playlistSummary_totalDuration"),
    `${playlistDuration}`,
    "#86efac"
  );
  containerElement.appendChild(totalDuration);

  const videosCounted = createSummaryItem(
    chrome.i18n.getMessage("playlistSummary_videosCounted"),
    `${timestamps.length}`,
    "#fdba74"
  );
  containerElement.appendChild(videosCounted);

  const totalVideosInPlaylist = countTotalVideosInPlaylist();
  const videosNotCounted = createSummaryItem(
    chrome.i18n.getMessage("playlistSummary_videosNotCounted"),
    `${
      totalVideosInPlaylist ? totalVideosInPlaylist - timestamps.length : "N/A"
    }`,
    "#fca5a5"
  );
  containerElement.appendChild(videosNotCounted);

  if (totalVideosInPlaylist <= 100) {
    if (window.ytpdc.sortDropdown.element) {
      containerElement.appendChild(window.ytpdc.sortDropdown.element);
    } else {
      const sortDropdown = createSortDropdown(playlistObserver);
      window.ytpdc.sortDropdown.element = sortDropdown;
      containerElement.appendChild(sortDropdown);
    }
  }

  if (totalVideosInPlaylist >= 100) {
    const tooltipElement = document.createElement("div");
    tooltipElement.id = "ytpdc-playlist-summary-tooltip";

    const iconElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    iconElement.setAttribute("preserveAspectRatio", "xMidYMid meet");
    iconElement.setAttribute("viewBox", "0 0 24 24");
    iconElement.innerHTML = `<path fill="white" fill-rule="evenodd" d="M12 1C5.925 1 1
    5.925 1 12s4.925 11 11 11s11-4.925 11-11S18.075 1 12 1Zm-.5 5a1 1 0 1 0 0
    2h.5a1 1 0 1 0 0-2h-.5ZM10 10a1 1 0 1 0 0 2h1v3h-1a1 1 0 1 0 0 2h4a1 1 0 1 0
    0-2h-1v-4a1 1 0 0 0-1-1h-2Z" clip-rule="evenodd"/>`;
    tooltipElement.appendChild(iconElement);

    const textElement = document.createElement("p");
    textElement.textContent = chrome.i18n.getMessage("playlistSummary_tooltip");
    tooltipElement.appendChild(textElement);

    containerElement.appendChild(tooltipElement);
  }

  return containerElement;
};

const isDarkMode = () => {
  return document.documentElement.getAttribute("dark") !== null;
};

const createSummaryItem = (label, value, valueColor = "#facc15") => {
  const container = document.createElement("div");
  container.classList.add("ytpdc-playlist-summary-item");

  const labelContainer = document.createElement("p");
  labelContainer.textContent = label;

  const valueContainer = document.createElement("p");
  valueContainer.classList.add("ytpdc-playlist-summary-item-value");
  valueContainer.style.color = valueColor;
  valueContainer.textContent = value;

  container.appendChild(labelContainer);
  container.appendChild(valueContainer);

  return container;
};

const countTotalVideosInPlaylist = () => {
  const statsElement = document.querySelector(
    elementSelectors.stats[isNewDesign() ? "new" : "old"]
  );

  if (!statsElement) return null;

  return parseInt(statsElement.innerText.replace(/\D/g, ""));
};

const createSortDropdown = (playlistObserver) => {
  const containerElement = document.createElement("div");
  containerElement.id = "ytpdc-sort-control";

  const labelElement = document.createElement("p");
  labelElement.classList.add("label");
  labelElement.textContent = chrome.i18n.getMessage("sortDropdown_label");

  const dropdownElement = document.createElement("div");
  dropdownElement.id = "ytpdc-sort-control-dropdown-container";

  const dropdownButtonElement = document.createElement("button");
  dropdownButtonElement.id = "ytpdc-sort-control-dropdown-button";

  const dropdownButtonTextElement = document.createElement("span");

  const dropdownOptionsElement = document.createElement("div");
  dropdownOptionsElement.id = "ytpdc-sort-control-dropdown-options";
  dropdownOptionsElement.classList.add("hidden");

  dropdownButtonElement.addEventListener("click", () => {
    dropdownOptionsElement.classList.toggle("hidden");
  });

  const sortOptions = PlaylistSorter.getSortOptions();

  sortOptions.forEach((sortOption) => {
    dropdownOptionsElement.appendChild(sortOption);
  });

  dropdownButtonTextElement.textContent = sortOptions[0].textContent;

  dropdownOptionsElement.addEventListener("click", (event) => {
    if (
      !event.target.classList.contains("ytpdc-sort-control-dropdown-option")
    ) {
      return;
    }

    window.ytpdc.sortDropdown.used = true;

    dropdownOptionsElement.classList.toggle("hidden");
    dropdownButtonTextElement.textContent = event.target.textContent;

    playlistObserver?.disconnect();

    const playlistElement = document.querySelector(elementSelectors.playlist);
    const videos = playlistElement.getElementsByTagName(elementSelectors.video);

    const playlistSorter = new PlaylistSorter(
      event.target.getAttribute("value")
    );
    const sortedVideos = playlistSorter.sort([...videos].slice(0, 100));

    playlistElement.replaceChildren(...sortedVideos);

    playlistObserver?.reconnect();
  });

  const caretDownIcon = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  caretDownIcon.setAttribute("viewBox", "0 0 256 256");
  caretDownIcon.innerHTML = `<path fill="currentColor" d="m216.49 104.49l-80
  80a12 12 0 0 1-17 0l-80-80a12 12 0 0 1 17-17L128 159l71.51-71.52a12 12 0 0 1
  17 17Z"/>`;

  dropdownButtonElement.appendChild(dropdownButtonTextElement);
  dropdownButtonElement.appendChild(caretDownIcon);
  dropdownElement.appendChild(dropdownButtonElement);
  dropdownElement.appendChild(dropdownOptionsElement);
  containerElement.appendChild(labelElement);
  containerElement.appendChild(dropdownElement);

  return containerElement;
};

// Entry-point
if (document.readyState !== "loading") {
  logger.info("Loaded.");
  main();
} else {
  document.addEventListener("DOMContentLoaded", () => {
    logger.info("Loaded.");
    main();
  });
}
