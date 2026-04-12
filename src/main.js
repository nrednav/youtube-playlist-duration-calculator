import { PlaylistSorter } from "./modules/sorting";
import { elementSelectors } from "./shared/data/element-selectors";
import { logger } from "./shared/modules/logger";
import {
  convertSecondsToTimestamp,
  getTimestampFromVideo,
} from "./shared/modules/timestamp";
import "./main.css";

const main = () => {
  try {
    setupPage();
    checkPlaylistReady();
  } catch (error) {
    logger.error("main_failed", error.message);
  }
};

const checkPlaylistReady = () => {
  logger.debug("Checking if playlist is ready to be processed");

  displayLoader();

  const maxPollCount = 60;
  let pollCount = 0;

  const playlistPoll = setInterval(() => {
    if (pollCount >= maxPollCount) {
      clearInterval(playlistPoll);
    }

    const playlistElement = document.querySelector(elementSelectors.playlist);
    const playlistExists = playlistElement !== null;

    logger.debug("poll_tick", () => ({
      pollCount,
      playlistExists,
      playlistVisible: playlistExists
        ? isElementVisible(playlistElement)
        : null,
      pathname: window.location.pathname,
    }));

    if (
      pollCount > 15 &&
      !(playlistExists && isElementVisible(playlistElement)) &&
      window.location.pathname !== "/playlist"
    ) {
      clearInterval(playlistPoll);

      logger.warn("Could not find a playlist.");

      logger.debug("playlist_not_found", () => ({
        pollCount,
        playlistExists,
        playlistVisible: isElementVisible(playlistElement),
        pathname: window.location.pathname,
      }));

      return;
    }

    const timestampElement = document.querySelector(elementSelectors.timestamp);
    const timestampExists = timestampElement !== null;
    const unavailableTimestampsCount = countUnavailableTimestamps();
    const unavailableVideosCount = countUnavailableVideos();

    if (
      playlistExists &&
      timestampExists &&
      unavailableTimestampsCount === unavailableVideosCount
    ) {
      clearInterval(playlistPoll);

      const playlistVisible = isElementVisible(playlistElement);

      logger.debug("playlist_ready_check", () => ({
        pollCount,
        playlistVisible,
        timestampExists,
        unavailableTimestampsCount,
        unavailableVideosCount,
        playlistOffsetHeight: playlistElement?.offsetHeight,
        playlistOffsetWidth: playlistElement?.offsetWidth,
      }));

      if (playlistVisible) {
        processPlaylist();
      } else {
        logger.debug("playlist_not_visible_skipping", () => ({
          pollCount,
          offsetParent: playlistElement?.offsetParent?.tagName,
          display: getComputedStyle(playlistElement).display,
          visibility: getComputedStyle(playlistElement).visibility,
        }));
      }
    }

    pollCount++;
  }, 1000);
};

const displayLoader = () => {
  const playlistSummaryElement = getPlaylistSummaryElement();

  if (!playlistSummaryElement) {
    return;
  }

  const loaderElement = document.createElement("div");
  loaderElement.id = "ytpdc-loader";
  loaderElement.textContent = chrome.i18n.getMessage("loaderMessage");
  loaderElement.style.color = "#fff";

  playlistSummaryElement.innerHTML = "";
  playlistSummaryElement.appendChild(loaderElement);
};

const setupPage = () => {
  if (window.ytpdc?.pageSetupDone) return;

  window.ytpdc = {
    pageSetupDone: false,
    playlistObserver: null,
    sortDropdown: {
      used: false,
      element: null,
    },
    lastVideoInteractedWith: null,
  };

  const onYoutubeNavigationFinished = () => {
    logger.debug("yt_navigation_finished", () => ({
      pathname: window.location.pathname,
      search: window.location.search,
    }));

    document.removeEventListener(
      "yt-navigate-finish",
      onYoutubeNavigationFinished,
      false,
    );

    window.ytpdc.playlistObserver?.disconnect();

    getPlaylistSummaryElement()?.remove();

    window.ytpdc = {
      pageSetupDone: false,
      playlistObserver: null,
      sortDropdown: {
        used: false,
        element: null,
      },
      lastVideoInteractedWith: null,
    };

    main();
  };

  document.addEventListener(
    "yt-navigate-finish",
    onYoutubeNavigationFinished,
    false,
  );

  const onPlaylistInteractedWith = (event) => {
    window.ytpdc.lastVideoInteractedWith = event.target.closest(
      elementSelectors.video,
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
      visibilityProperty: true,
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
    old: document.querySelector(elementSelectors.designAnchor.old),
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
 *
 * Criteria:
 * - Has no timestamp
 * - Title is unavailable
 *
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
    chrome.i18n.getMessage("videoTitle_ageRestricted"),
  ].includes(getVideoTitle(video));

  if (hasUnavailableTitle) return true;

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
  logger.debug("processing_playlist");

  const playlistObserver = setupPlaylistObserver();
  const videos = getVideos();
  const timestamps = videos.map(getTimestampFromVideo);
  const nullTimestamps = timestamps.filter((t) => t === null).length;

  const totalDurationInSeconds =
    Array.isArray(timestamps) && timestamps.length > 0
      ? timestamps.reduce((a, b) => a + b)
      : 0;

  const playlistDuration = convertSecondsToTimestamp(totalDurationInSeconds);

  logger.debug("playlist_calculated", () => ({
    videoCount: videos.length,
    timestampCount: timestamps.length,
    nullTimestamps,
    totalDurationInSeconds,
    playlistDuration,
  }));

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
  if (window.ytpdc.playlistObserver) {
    logger.debug("playlist_observer_reused");
    return window.ytpdc.playlistObserver;
  }

  const playlistElement = document.querySelector(elementSelectors.playlist);

  if (!playlistElement) {
    logger.debug("playlist_observer_no_element");
    return null;
  }

  const playlistObserver = new MutationObserver(onPlaylistMutated);

  playlistObserver.observe(playlistElement, { childList: true });

  window.ytpdc.playlistObserver = playlistObserver;

  logger.debug("playlist_observer_created", () => ({
    playlistChildCount: playlistElement.childElementCount,
  }));

  return {
    disconnect: () => playlistObserver.disconnect(),
    reconnect: () =>
      playlistObserver.observe(playlistElement, { childList: true }),
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

  logger.debug("playlist_mutated", () => ({
    mutationCount: mutationList.length,
    types: mutationList.map((m) => m.type),
    addedTotal: mutationList.reduce((n, m) => n + m.addedNodes.length, 0),
    removedTotal: mutationList.reduce((n, m) => n + m.removedNodes.length, 0),
    sortDropdownUsed: window.ytpdc.sortDropdown.used,
    lastVideoInteracted: !!window.ytpdc.lastVideoInteractedWith,
  }));

  if (mutationList.length === 1 && mutationList[0].type === "childList") {
    const mutation = mutationList[0];

    if (shouldRequestPageReload(mutation)) {
      // Problem encountered, request a page reload
      displayMessages([
        chrome.i18n.getMessage("problemEncountered_paragraphOne"),
        chrome.i18n.getMessage("problemEncountered_paragraphTwo"),
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

  if (!playlistSummaryElement) {
    return;
  }

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
  playlistObserver,
}) => {
  const playlistSummaryElement = createPlaylistSummaryElement({
    timestamps,
    playlistDuration,
    playlistObserver,
  });

  const existingPlaylistSummaryElement = getPlaylistSummaryElement();

  if (existingPlaylistSummaryElement) {
    logger.debug("replacing_existing_summary", () => ({
      existingId: existingPlaylistSummaryElement.id,
      existingVisible: isElementVisible(existingPlaylistSummaryElement),
    }));

    existingPlaylistSummaryElement.replaceWith(playlistSummaryElement);
  } else {
    const playlistMetadataElement = getPlaylistMetadataElement();

    if (!playlistMetadataElement) {
      throw new Error(
        [
          "Cannot add playlist summary to page",
          "Reason = Cannot find playlist metadata element in document",
        ].join(", "),
      );
    }

    playlistMetadataElement.parentElement.insertBefore(
      playlistSummaryElement,
      playlistMetadataElement.nextElementSibling,
    );

    logger.debug("inserted_playlist_summary", () => ({
      summaryId: playlistSummaryElement.id,
      isNewDesign: isNewDesign(),
      summaryVisible: isElementVisible(playlistSummaryElement),
      summaryOffsetHeight: playlistSummaryElement.offsetHeight,
      summaryOffsetWidth: playlistSummaryElement.offsetWidth,
      parentOverflow: getComputedStyle(playlistSummaryElement.parentElement)
        .overflow,
      parentDisplay: getComputedStyle(playlistSummaryElement.parentElement)
        .display,
      parentHeight: getComputedStyle(playlistSummaryElement.parentElement)
        .height,
    }));
  }
};

const createPlaylistSummaryElement = ({
  timestamps,
  playlistDuration,
  playlistObserver,
}) => {
  const newDesign = isNewDesign();

  logger.debug("creating_summary_element", () => ({
    newDesign,
    newAnchorFound: !!document.querySelector(elementSelectors.designAnchor.new),
    oldAnchorFound: !!document.querySelector(elementSelectors.designAnchor.old),
    oldAnchorHidden: document
      .querySelector(elementSelectors.designAnchor.old)
      ?.getAttribute("hidden"),
    totalVideosInPlaylist: countTotalVideosInPlaylist(),
  }));

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
    "#86efac",
  );

  containerElement.appendChild(totalDuration);

  const videosCounted = createSummaryItem(
    chrome.i18n.getMessage("playlistSummary_videosCounted"),
    `${timestamps.length}`,
    "#fdba74",
  );

  containerElement.appendChild(videosCounted);

  const totalVideosInPlaylist = countTotalVideosInPlaylist();
  const videosNotCounted = createSummaryItem(
    chrome.i18n.getMessage("playlistSummary_videosNotCounted"),
    `${
      totalVideosInPlaylist ? totalVideosInPlaylist - timestamps.length : "N/A"
    }`,
    "#fca5a5",
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
      "svg",
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

const getPlaylistMetadataElement = () => {
  for (const meta of elementSelectors.playlistMetadata) {
    let element;

    if (meta.queryMethod === "querySelectorAllAndFilter") {
      const potentialElements = document.querySelectorAll(meta.selector);

      logger.debug("metadata_selector_querySelectorAll", () => ({
        selector: meta.selector,
        matchCount: potentialElements.length,
      }));

      if (potentialElements.length > 0) {
        element = [...potentialElements].find(isElementVisible);

        logger.debug("metadata_selector_visibility_filter", () => ({
          selector: meta.selector,
          visibleElementFound: !!element,
        }));

        if (element) {
          logger.debug("metadata_selector_matched", () => ({
            selector: meta.selector,
            elementTag: element.tagName,
            elementClasses: element.className,
            parentTag: element.parentElement?.tagName,
            parentClasses: element.parentElement?.className,
            parentId: element.parentElement?.id,
            parentOverflow: element.parentElement
              ? getComputedStyle(element.parentElement).overflow
              : null,
          }));

          return element;
        }
      }
    } else {
      element = document.querySelector(meta.selector);

      logger.debug("metadata_selector_querySelector", () => ({
        selector: meta.selector,
        found: !!element,
      }));

      if (element && isElementVisible(element)) {
        logger.debug("metadata_selector_matched", () => ({
          selector: meta.selector,
          elementTag: element.tagName,
          elementClasses: element.className,
          parentTag: element.parentElement?.tagName,
          parentClasses: element.parentElement?.className,
          parentId: element.parentElement?.id,
          parentOverflow: element.parentElement
            ? getComputedStyle(element.parentElement).overflow
            : null,
        }));

        return element;
      }
    }
  }

  logger.debug("metadata_selector_no_match");

  return null;
};

const isDarkMode = () => {
  return document.documentElement.getAttribute("dark") !== null;
};

const createSummaryItem = (label, value, valueColor = "#facc15") => {
  const container = document.createElement("div");
  container.classList.add("ytpdc-playlist-summary-item");

  const labelContainer = document.createElement("p");
  labelContainer.classList.add("ytpdc-playlist-summary-item-label");
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
    elementSelectors.stats[isNewDesign() ? "new" : "old"],
  );

  if (!statsElement) return null;

  return Number.parseInt(statsElement.innerText.replace(/\D/g, ""));
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
      event.target.getAttribute("value"),
    );
    const sortedVideos = playlistSorter.sort([...videos].slice(0, 100));

    playlistElement.replaceChildren(...sortedVideos);

    playlistObserver?.reconnect();
  });

  const caretDownIcon = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
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
const start = () => {
  logger.info("Loaded.");
  main();
};

if (document.readyState !== "loading") {
  start();
} else {
  document.addEventListener("DOMContentLoaded", start);
}
