// Library
const displayLoader = () => {
  const playlistSummary = document.querySelector("#ytpdc-playlist-summary");
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

const pollPlaylistReady = () => {
  displayLoader();

  const maxPollCount = 60;
  let pollCount = 0;

  let playlistPoll = setInterval(() => {
    if (pollCount >= maxPollCount) clearInterval(playlistPoll);

    if (document.querySelector("ytd-playlist-video-list-renderer")) {
      clearInterval(playlistPoll);
      start();
    }

    pollCount++;
  }, 1000);
};

const configurePage = () => {
  if (window.ytpdc) return;
  window.ytpdc = { playlistObserver: false, interPlaylistNavigation: false };
};

const setupPlaylistObserver = () => {
  if (window.ytpdc.playlistObserver) return;
  window.ytpdc.playlistObserver = true;

  const playlistObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) pollPlaylistReady();
    });
  });

  const targetNode = document.querySelector(
    "ytd-playlist-video-list-renderer #contents"
  );
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
  const videos = document.getElementsByTagName("ytd-playlist-video-renderer");
  return [...videos];
};

const unformatTimestamp = (formattedTimestamp) => {
  let components = formattedTimestamp.split(":");
  let seconds = 0;
  let minutes = 1;

  while (components.length > 0) {
    seconds += minutes * parseInt(components.pop(), 10);
    minutes *= 60;
  }

  return seconds;
};

const formatTimestamp = (timestamp) => {
  let totalSeconds = timestamp;
  const hours = `${Math.floor(totalSeconds / 3600)}`.padStart(2, "0");
  totalSeconds %= 3600;
  const minutes = `${Math.floor(totalSeconds / 60)}`.padStart(2, "0");
  const seconds = `${totalSeconds % 60}`.padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

const getTimestamps = (videos) => {
  return videos.map((video) => {
    if (!video) return null;

    const timestampContainer = video.querySelector(
      "ytd-thumbnail-overlay-time-status-renderer"
    );
    if (!timestampContainer) return null;

    const formattedTimestamp = timestampContainer.innerText;
    if (!formattedTimestamp) return null;

    const timestamp = unformatTimestamp(formattedTimestamp);
    return timestamp;
  });
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

const createPlaylistSummary = ({ videos, playlistDuration }) => {
  const summaryContainer = document.createElement("div");
  summaryContainer.id = "ytpdc-playlist-summary";

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
    `${videos.length}`,
    "#fdba74"
  );
  summaryContainer.appendChild(videosCounted);

  // Videos not counted
  const totalVideosInPlaylist = countTotalVideosInPlaylist();
  const videosNotCounted = createSummaryItem(
    "Videos not counted:",
    `${totalVideosInPlaylist ? totalVideosInPlaylist - videos.length : "N/A"}`,
    "#fca5a5"
  );
  summaryContainer.appendChild(videosNotCounted);

  // Tooltip
  if (videos.length >= 100) {
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

const addSummaryToPage = (summaryContainer) => {
  let metadataSection = document.querySelector(
    ".immersive-header-content .metadata-action-bar"
  );
  if (!metadataSection) return null;

  const playlistSummary = document.querySelector("#ytpdc-playlist-summary");

  if (playlistSummary) {
    playlistSummary.parentNode.removeChild(playlistSummary);
  }

  metadataSection.parentNode.insertBefore(
    summaryContainer,
    metadataSection.nextSibling
  );
};

const countTotalVideosInPlaylist = () => {
  const totalVideosStat = document.querySelector(
    ".metadata-stats yt-formatted-string"
  );

  if (!totalVideosStat) return null;

  const totalVideoCount = parseInt(totalVideosStat.firstChild.innerText);

  return totalVideoCount;
};
