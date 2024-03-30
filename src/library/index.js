import {
  PlaylistSorter,
  generateSortOptions,
  generateSortTypes
} from "./sorting";

const config = {
  statsContainer: {
    main: ".metadata-stats yt-formatted-string",
    fallback: "#stats yt-formatted-string"
  }
};

const elementSelectors = {
  timestamp: "ytd-thumbnail-overlay-time-status-renderer",
  // Design anchor = Element that helps distinguish between old & new layouts
  designAnchor: {
    old: "ytd-playlist-sidebar-renderer",
    new: "ytd-playlist-header-renderer"
  },
  playlistSummary: {
    old: "#ytpdc-playlist-summary-old",
    new: "#ytpdc-playlist-summary-new"
  },
  playlistMetadata: {
    old: "ytd-playlist-sidebar-renderer #items",
    new: ".immersive-header-content .metadata-action-bar"
  },
  video: "ytd-playlist-video-renderer",
  playlist: "ytd-playlist-video-list-renderer #contents"
};

const pollPlaylistReady = () => {
  displayLoader();

  const maxPollCount = 60;
  let pollCount = 0;

  let playlistPoll = setInterval(() => {
    if (pollCount >= maxPollCount) clearInterval(playlistPoll);

    if (
      document.querySelector(elementSelectors.timestamp) &&
      countUnavailableTimestamps() === countUnavailableVideos()
    ) {
      clearInterval(playlistPoll);
      processPlaylist();
    }

    pollCount++;
  }, 1000);
};

const getPlaylistSummaryElement = () => {
  const selector =
    elementSelectors.playlistSummary[isNewDesign() ? "new" : "old"];
  return document.querySelector(selector);
};

const displayLoader = () => {
  const playlistSummaryElement = getPlaylistSummaryElement();
  if (!playlistSummaryElement) return;

  const loaderElement = document.createElement("div");
  loaderElement.id = "ytpdc-loader";
  loaderElement.textContent = "Calculating...";

  playlistSummaryElement.innerHTML = "";
  playlistSummaryElement.appendChild(loaderElement);
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

/**
 * Counts the number of invalid timestamps in a list of video container elements
 * @returns {number}
 */
const countUnavailableTimestamps = () => {
  return getVideos()
    .map(getTimestampFromVideo)
    .filter((timestamp) => timestamp === null).length;
};

const countUnavailableVideos = () => {
  const unavailableVideoTitles = [
    "[Private video]",
    "[Deleted video]",
    "[Unavailable]",
    "[Video unavailable]",
    "[Restricted video]",
    "[Age restricted]"
  ];

  const videoTitles = document.querySelectorAll("a#video-title");

  let unavailableVideosCount = 0;

  videoTitles.forEach((videoTitle) => {
    if (unavailableVideoTitles.includes(videoTitle.title)) {
      unavailableVideosCount++;
    }
  });

  return unavailableVideosCount;
};

const processPlaylist = () => {
  setupPage();
  const playlistObserver = setupPlaylistObserver();
  const videos = getVideos();
  const timestamps = videos.map(getTimestampFromVideo);
  const totalDurationInSeconds =
    Array.isArray(timestamps) && timestamps.length > 0
      ? timestamps.reduce((a, b) => a + b)
      : 0;
  const playlistDuration = convertSecondsToTimestamp(totalDurationInSeconds);
  addPlaylistSummaryToPage({
    timestamps,
    playlistDuration,
    playlistObserver
  });
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
    if (window.ytpdc.playlistObserver) {
      window.ytpdc.playlistObserver?.disconnect();
      window.ytpdc.playlistObserver = null;
    }

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
 * Checks whether enough conditions hold true to request a page reload
 * when the playlist is mutated
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
 * This function decides when the playlist duration should be recalculated & how
 * @param {MutationRecord[]} mutationList
 * @param {MutationObserver} observer
 * @returns {MutationCallback}
 */
const onPlaylistMutated = (mutationList, observer) => {
  const playlistElement = document.querySelector(elementSelectors.playlist);

  if (mutationList.length === 1 && mutationList[0].type === "childList") {
    const mutation = mutationList[0];

    if (shouldRequestPageReload(mutation)) {
      // Problem encountered, request a page reload
      displayMessages([
        "Encountered a problem.",
        "Please reload this page to recalculate the playlist duration."
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
      removedVideo.querySelector("#video-title").textContent !==
      window.ytpdc.lastVideoInteractedWith.querySelector("#video-title")
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
  * Sets up a mutation observer on the playlist to detect when video(s) are
  * added or removed.
  * Upon detection it conditionally triggers a re-processing of the playlist
  * @returns {{
      disconnect: () => void,
      reconnect: () => void
    }}
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

const getVideos = () => {
  const playlistElement = document.querySelector(elementSelectors.playlist);
  const videos = playlistElement.getElementsByTagName(elementSelectors.video);
  return [...videos];
};

/**
 * Extracts a timestamp from a video container element
 * @param {Element} video
 * @returns {string}
 */
const getTimestampFromVideo = (video) => {
  if (!video) return null;

  const timestampElement = video.querySelector(elementSelectors.timestamp);
  if (!timestampElement) return null;

  const timestamp = timestampElement.innerText;
  if (!timestamp) return null;

  const timestampAsSeconds = convertTimestampToSeconds(timestamp);
  return timestampAsSeconds;
};

/**
 * Converts a numerical amount of seconds to a textual timestamp formatted as
 * hh:mm:ss
 * @param {number} seconds
 * @returns {string}
 */
const convertSecondsToTimestamp = (seconds) => {
  const hours = `${Math.floor(seconds / 3600)}`.padStart(2, "0");
  seconds %= 3600;
  const minutes = `${Math.floor(seconds / 60)}`.padStart(2, "0");
  const remainingSeconds = `${seconds % 60}`.padStart(2, "0");
  return `${hours}:${minutes}:${remainingSeconds}`;
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
    "Total duration:",
    `${playlistDuration}`,
    "#86efac"
  );
  containerElement.appendChild(totalDuration);

  const videosCounted = createSummaryItem(
    "Videos counted:",
    `${timestamps.length}`,
    "#fdba74"
  );
  containerElement.appendChild(videosCounted);

  const totalVideosInPlaylist = countTotalVideosInPlaylist();
  const videosNotCounted = createSummaryItem(
    "Videos not counted:",
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
    textElement.textContent = "Scroll down to count more videos";
    tooltipElement.appendChild(textElement);

    containerElement.appendChild(tooltipElement);
  }

  return containerElement;
};

/**
 * Converts a textual timestamp formatted as hh:mm:ss to its numerical value
 * represented in seconds
 * @param {string} timestamp
 * @returns {number}
 */
const convertTimestampToSeconds = (timestamp) => {
  let timeComponents = timestamp
    .split(":")
    .map((timeComponent) => parseInt(timeComponent, 10));

  let seconds = 0;
  let minutes = 1;

  while (timeComponents.length > 0) {
    let timeComponent = timeComponents.pop();
    if (isNaN(timeComponent)) continue;

    seconds += minutes * timeComponent;
    minutes *= 60;
  }

  return seconds;
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

const addPlaylistSummaryToPage = ({
  timestamps,
  playlistDuration,
  playlistObserver
}) => {
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

const countTotalVideosInPlaylist = () => {
  const totalVideosStat = document.querySelector(
    isNewDesign() ? config.statsContainer.main : config.statsContainer.fallback
  );

  if (!totalVideosStat) return null;

  const totalVideosCount = parseInt(
    totalVideosStat.innerText.replace(/\D/g, "")
  );

  return totalVideosCount;
};

const isDarkMode = () => {
  return document.documentElement.getAttribute("dark") !== null;
};

const isNewDesign = () => {
  const designAnchors = {
    new: document.querySelector(elementSelectors.designAnchor.new),
    old: document.querySelector(elementSelectors.designAnchor.old)
  };

  return designAnchors.new && designAnchors.old.getAttribute("hidden") !== null;
};

const createSortDropdown = (playlistObserver) => {
  const container = document.createElement("div");
  container.id = "ytpdc-sort-control";
  container.classList.add("container");

  const label = document.createElement("p");
  label.classList.add("label");
  label.textContent = "Sort by:";

  const group = document.createElement("div");
  group.classList.add("group");

  const dropdown = document.createElement("select");
  const sortTypes = generateSortTypes();
  const sortOptions = generateSortOptions(sortTypes);

  sortOptions.forEach((sortOption) => {
    dropdown.appendChild(sortOption);
  });

  dropdown.addEventListener("change", (event) => {
    window.ytpdc.sortDropdown.used = true;

    playlistObserver?.disconnect();

    const playlistElement = document.querySelector(elementSelectors.playlist);
    const videos = playlistElement.getElementsByTagName(elementSelectors.video);

    const [sortType, sortOrder] = event.target.value.split(":");
    const SortStrategy = sortTypes[sortType].strategy;
    const playlistSorter = new PlaylistSorter(new SortStrategy(), sortOrder);
    const sortedVideos = playlistSorter.sort(videos);

    playlistElement.replaceChildren(...sortedVideos);

    playlistObserver?.reconnect();
  });

  const caretDownIcon = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  caretDownIcon.style.width = "1em";
  caretDownIcon.style.height = "1em";
  caretDownIcon.setAttribute("viewBox", "0 0 256 256");
  caretDownIcon.innerHTML = `<path fill="currentColor" d="m216.49 104.49l-80
  80a12 12 0 0 1-17 0l-80-80a12 12 0 0 1 17-17L128 159l71.51-71.52a12 12 0 0 1
  17 17Z"/>`;

  container.appendChild(label);
  group.appendChild(dropdown);
  group.appendChild(caretDownIcon);
  container.appendChild(group);

  return container;
};

const main = () => {
  if (
    window.location.pathname === "/playlist" &&
    window.location.search.startsWith("?list=")
  ) {
    pollPlaylistReady();
  }
};

export { elementSelectors, main, getTimestampFromVideo };
