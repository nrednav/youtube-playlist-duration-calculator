const config = {
  videoElement: "ytd-playlist-video-renderer",
  videoElementsContainer: "ytd-playlist-video-list-renderer #contents",
  timestampContainer: "ytd-thumbnail-overlay-time-status-renderer",
  metadataContainer: {
    main: ".immersive-header-content .metadata-action-bar",
    fallback: "ytd-playlist-sidebar-renderer #items"
  },
  statsContainer: {
    main: ".metadata-stats yt-formatted-string",
    fallback: "#stats yt-formatted-string"
  },
  // Design anchor = Element that helps distinguish between old & new layout
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
      document.querySelector(config.timestampContainer) &&
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
      ? "#ytpdc-playlist-summary-new"
      : "#ytpdc-playlist-summary-old"
  );

  if (playlistSummary) {
    const loading = document.createElement("div");
    loading.style.minHeight = "128px";
    loading.style.width = "100%";
    loading.style.display = "flex";
    loading.style.justifyContent = "center";
    loading.style.alignItems = "center";
    loading.textContent = "Calculating...";

    playlistSummary.innerHTML = "";
    playlistSummary.appendChild(loading);
  }
};

const countUnavailableTimestamps = () => {
  const timestamps = getTimestamps(getVideos());
  return timestamps.filter((timestamp) => timestamp === null).length;
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
  setupPlaylistObserver();
  setupEventListeners();
  const videos = getVideos();
  const timestamps = getTimestamps(videos);
  const totalDurationInSeconds = timestamps.reduce((a, b) => a + b);
  const playlistDuration = formatTimestamp(totalDurationInSeconds);
  const playlistSummary = createPlaylistSummary({
    timestamps,
    playlistDuration
  });
  addSummaryToPage(playlistSummary);
};

const configurePage = () => {
  if (window.ytpdc) return;
  window.ytpdc = { playlistObserver: false, interPlaylistNavigation: false };
};

const setupPlaylistObserver = () => {
  if (window.ytpdc.playlistObserver) return;
  window.ytpdc.playlistObserver = true;

  const playlistObserver = new MutationObserver((_) => {
    pollPlaylistReady();
  });

  const targetNode = document.querySelector(config.videoElementsContainer);
  if (targetNode) {
    playlistObserver.observe(targetNode, { childList: true });
  }
};

const setupEventListeners = () => {
  if (!window.ytpdc.interPlaylistNavigation) {
    window.ytpdc.interPlaylistNavigation = true;
    document.addEventListener(
      "yt-navigate-finish",
      () => pollPlaylistReady(),
      false
    );
  }
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

const getTimestamps = (videos) => {
  return videos.map((video) => {
    if (!video) return null;

    const timestampContainer = video.querySelector(config.timestampContainer);
    if (!timestampContainer) return null;

    const formattedTimestamp = timestampContainer.innerText;
    if (!formattedTimestamp) return null;

    const timestamp = unformatTimestamp(formattedTimestamp);
    return timestamp;
  });
};

const formatTimestamp = (timestamp) => {
  let totalSeconds = timestamp;
  const hours = `${Math.floor(totalSeconds / 3600)}`.padStart(2, "0");
  totalSeconds %= 3600;
  const minutes = `${Math.floor(totalSeconds / 60)}`.padStart(2, "0");
  const seconds = `${totalSeconds % 60}`.padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

const createPlaylistSummary = ({ timestamps, playlistDuration }) => {
  const summaryContainer = document.createElement("div");

  // Styles for new design
  summaryContainer.style.display = "flex";
  summaryContainer.style.flexDirection = "column";
  summaryContainer.style.justifyContent = "center";
  summaryContainer.style.alignItems = "start";
  summaryContainer.style.minHeight = "128px";
  summaryContainer.style.margin = "16px 0px";
  summaryContainer.style.padding = "16px";
  summaryContainer.style.borderRadius = "16px";
  summaryContainer.style.background = "rgba(255,255,255,0.2)";
  summaryContainer.style.fontSize = "1.5rem";

  // Fallback styles for old design
  if (!isNewDesign()) {
    if (isDarkMode()) {
      summaryContainer.style.color = "white";
    } else {
      summaryContainer.style.background = "rgba(0,0,0,0.8)";
      summaryContainer.style.color = "white";
    }
  }

  // Total Duration
  const totalDuration = createSummaryItem(
    "Total duration:",
    `${playlistDuration}`,
    "#86efac"
  );
  summaryContainer.appendChild(totalDuration);

  // Videos counted
  const videosCounted = createSummaryItem(
    "Videos counted:",
    `${timestamps.length}`,
    "#fdba74"
  );
  summaryContainer.appendChild(videosCounted);

  // Videos not counted
  const totalVideosInPlaylist = countTotalVideosInPlaylist();
  const videosNotCounted = createSummaryItem(
    "Videos not counted:",
    `${
      totalVideosInPlaylist ? totalVideosInPlaylist - timestamps.length : "N/A"
    }`,
    "#fca5a5"
  );
  summaryContainer.appendChild(videosNotCounted);

  // Tooltip
  if (timestamps.length >= 100) {
    const tooltip = document.createElement("div");
    tooltip.style.marginTop = "16px";
    tooltip.style.display = "flex";
    tooltip.style.flexDirection = "row";
    tooltip.style.alignItems = "center";

    const icon = document.createElement("div");
    icon.style.color = "#000";
    icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path fill="white" fill-rule="evenodd" d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11s11-4.925 11-11S18.075 1 12 1Zm-.5 5a1 1 0 1 0 0 2h.5a1 1 0 1 0 0-2h-.5ZM10 10a1 1 0 1 0 0 2h1v3h-1a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2h-1v-4a1 1 0 0 0-1-1h-2Z" clip-rule="evenodd"/></svg>`;
    tooltip.appendChild(icon);

    const tooltipText = document.createElement("p");
    tooltipText.style.paddingLeft = "8px";
    tooltipText.textContent = "Scroll down to count more videos";
    tooltip.appendChild(tooltipText);

    summaryContainer.appendChild(tooltip);
  }

  return summaryContainer;
};

const unformatTimestamp = (formattedTimestamp) => {
  let timeComponents = formattedTimestamp
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
  container.style.margin = "8px 0px";
  container.style.display = "flex";
  container.style.flexDirection = "row";
  container.style.justifyContent = "between";

  const labelContainer = document.createElement("p");
  labelContainer.textContent = label;

  const valueContainer = document.createElement("p");
  valueContainer.style.color = valueColor;
  valueContainer.style.fontWeight = 700;
  valueContainer.style.paddingLeft = "8px";
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
    newDesign ? "#ytpdc-playlist-summary-new" : "#ytpdc-playlist-summary-old"
  );

  if (previousSummary) {
    previousSummary.parentNode.removeChild(previousSummary);
  }

  summary.id = newDesign
    ? "ytpdc-playlist-summary-new"
    : "ytpdc-playlist-summary-old";

  metadataSection.parentNode.insertBefore(summary, metadataSection.nextSibling);
};

const countTotalVideosInPlaylist = () => {
  const totalVideosStat = document.querySelector(
    isNewDesign() ? config.statsContainer.main : config.statsContainer.fallback
  );

  if (!totalVideosStat) return null;

  const totalVideoCount = parseInt(
    totalVideosStat.innerText.replace(/\D/g, "")
  );

  return totalVideoCount;
};

const isDarkMode = () => {
  return document.documentElement.getAttribute("dark") !== null;
};

const isNewDesign = () => {
  const newDesignAnchor = document.querySelector(config.designAnchor.new);
  const oldDesignAnchor = document.querySelector(config.designAnchor.old);

  const isNewDesign =
    newDesignAnchor && oldDesignAnchor.getAttribute("hidden") !== null;

  return isNewDesign;
};

export { pollPlaylistReady };
