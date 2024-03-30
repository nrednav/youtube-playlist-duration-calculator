import {
  PlaylistSorter,
  generateSortOptions,
  generateSortTypes
} from "./sorting";

const config = {
  videoElement: "ytd-playlist-video-renderer",
  videoElementsContainer: "ytd-playlist-video-list-renderer #contents",
  metadataContainer: {
    main: ".immersive-header-content .metadata-action-bar",
    fallback: "ytd-playlist-sidebar-renderer #items"
  },
  statsContainer: {
    main: ".metadata-stats yt-formatted-string",
    fallback: "#stats yt-formatted-string"
  },
  playlistSummaryContainer: {
    main: "#ytpdc-playlist-summary-new",
    fallback: "#ytpdc-playlist-summary-old"
  }
};

const elementSelectors = {
  timestamp: "ytd-thumbnail-overlay-time-status-renderer",
  // Design anchor = Element that helps distinguish between old & new layouts
  designAnchor: {
    old: "ytd-playlist-sidebar-renderer",
    new: "ytd-playlist-header-renderer"
  }
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

const displayLoader = () => {
  const playlistSummary = document.querySelector(
    isNewDesign()
      ? config.playlistSummaryContainer.main
      : config.playlistSummaryContainer.fallback
  );

  if (playlistSummary) {
    const loader = document.createElement("div");
    loader.id = "ytpdc-loader";
    loader.textContent = "Calculating...";

    playlistSummary.innerHTML = "";
    playlistSummary.appendChild(loader);
  }
};

const displayMessages = (messages) => {
  const playlistSummary = document.querySelector(
    isNewDesign()
      ? config.playlistSummaryContainer.main
      : config.playlistSummaryContainer.fallback
  );

  if (playlistSummary) {
    const container = document.createElement("div");
    container.id = "messages-container";

    messages.forEach((message) => {
      const item = document.createElement("p");
      item.textContent = message;
      container.appendChild(item);
    });

    playlistSummary.innerHTML = "";
    playlistSummary.appendChild(container);
  }
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
  configurePage();
  const playlistObserver = setupPlaylistObserver();
  setupEventListeners();
  const videos = getVideos();
  const timestamps = videos.map(getTimestampFromVideo);
  const totalDurationInSeconds =
    Array.isArray(timestamps) && timestamps.length > 0
      ? timestamps.reduce((a, b) => a + b)
      : 0;
  const playlistDuration = convertSecondsToTimestamp(totalDurationInSeconds);
  const playlistSummary = createPlaylistSummary({
    timestamps,
    playlistDuration,
    playlistObserver
  });
  addSummaryToPage(playlistSummary);
};

const configurePage = () => {
  if (window.ytpdc) return;
  window.ytpdc = {
    playlistObserver: false,
    setupEventListeners: false,
    sortDropdown: {
      used: false,
      element: null
    },
    lastVideoInteractedWith: null
  };
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
    mutation.removedNodes[0]?.tagName.toLowerCase() === config.videoElement &&
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
  const playlistElement = document.querySelector(config.videoElementsContainer);

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
  * Upon detection it triggers a re-processing of the playlist.
  * @returns {{
      disconnect: () => void,
      reconnect: () => void
    }}
  */
const setupPlaylistObserver = () => {
  if (window.ytpdc.playlistObserver) return window.ytpdc.playlistObserver;

  const playlistElement = document.querySelector(config.videoElementsContainer);
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

const setupEventListeners = () => {
  if (window.ytpdc.setupEventListeners) return;
  window.ytpdc.setupEventListeners = true;

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
      config.videoElement
    );
  };

  document
    .querySelector(config.videoElementsContainer)
    ?.addEventListener("click", onPlaylistInteractedWith);
};

const getVideos = () => {
  const videoElementsContainer = document.querySelector(
    config.videoElementsContainer
  );
  const videos = videoElementsContainer.getElementsByTagName(
    config.videoElement
  );
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

const createPlaylistSummary = ({
  timestamps,
  playlistDuration,
  playlistObserver
}) => {
  const container = document.createElement("div");
  container.id = (
    isNewDesign()
      ? config.playlistSummaryContainer.main
      : config.playlistSummaryContainer.fallback
  ).replace("#", "");
  container.classList.add("container");

  // Fallback styles for old design
  if (!isNewDesign()) {
    if (isDarkMode()) {
      container.style.color = "white";
    } else {
      container.style.background = "rgba(0,0,0,0.8)";
      container.style.color = "white";
    }
  }

  const totalDuration = createSummaryItem(
    "Total duration:",
    `${playlistDuration}`,
    "#86efac"
  );
  container.appendChild(totalDuration);

  const videosCounted = createSummaryItem(
    "Videos counted:",
    `${timestamps.length}`,
    "#fdba74"
  );
  container.appendChild(videosCounted);

  const totalVideosInPlaylist = countTotalVideosInPlaylist();
  const videosNotCounted = createSummaryItem(
    "Videos not counted:",
    `${
      totalVideosInPlaylist ? totalVideosInPlaylist - timestamps.length : "N/A"
    }`,
    "#fca5a5"
  );
  container.appendChild(videosNotCounted);

  if (totalVideosInPlaylist <= 100) {
    if (window.ytpdc.sortDropdown.element) {
      container.appendChild(window.ytpdc.sortDropdown.element);
    } else {
      const sortDropdown = createSortDropdown(playlistObserver);
      window.ytpdc.sortDropdown.element = sortDropdown;
      container.appendChild(sortDropdown);
    }
  }

  if (totalVideosInPlaylist >= 100) {
    const tooltip = document.createElement("div");
    tooltip.id = "ytpdc-playlist-summary-tooltip";

    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("preserveAspectRatio", "xMidYMid meet");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.innerHTML = `<path fill="white" fill-rule="evenodd" d="M12 1C5.925 1 1
    5.925 1 12s4.925 11 11 11s11-4.925 11-11S18.075 1 12 1Zm-.5 5a1 1 0 1 0 0
    2h.5a1 1 0 1 0 0-2h-.5ZM10 10a1 1 0 1 0 0 2h1v3h-1a1 1 0 1 0 0 2h4a1 1 0 1 0
    0-2h-1v-4a1 1 0 0 0-1-1h-2Z" clip-rule="evenodd"/>`;
    tooltip.appendChild(icon);

    const tooltipText = document.createElement("p");
    tooltipText.textContent = "Scroll down to count more videos";
    tooltip.appendChild(tooltipText);

    container.appendChild(tooltip);
  }

  return container;
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

const addSummaryToPage = (summary) => {
  const newDesign = isNewDesign();

  let metadataSection = document.querySelector(
    newDesign
      ? config.metadataContainer.main
      : config.metadataContainer.fallback
  );
  if (!metadataSection) return null;

  const previousSummary = document.querySelector(
    newDesign
      ? config.playlistSummaryContainer.main
      : config.playlistSummaryContainer.fallback
  );

  if (previousSummary) {
    previousSummary.parentNode.removeChild(previousSummary);
  }

  metadataSection.parentNode.insertBefore(summary, metadataSection.nextSibling);
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

    const videoElementsContainer = document.querySelector(
      config.videoElementsContainer
    );

    const videos = videoElementsContainer.getElementsByTagName(
      config.videoElement
    );

    const [sortType, sortOrder] = event.target.value.split(":");
    const SortStrategy = sortTypes[sortType].strategy;
    const playlistSorter = new PlaylistSorter(new SortStrategy(), sortOrder);
    const sortedVideos = playlistSorter.sort(videos);

    videoElementsContainer.replaceChildren(...sortedVideos);

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

export { elementSelectors, main, config, getTimestampFromVideo };
