// Make extension display as active 
chrome.runtime.sendMessage({ todo: "showPageAction" });

// Account for inter-playlist navigation
document.addEventListener("yt-navigate-finish", function navFinish() {
  if (getPageType() === "overview") {
    main();
  }
}, false);

// Start extension script
main();

// Functions
function main() {
  pollPlaylistReady();

  let observer = null;

  if (getPageType() === "overview") {
    observer = startPlaylistObserver();
  } else {
    if (observer) observer.disconnect();
  } 
}

function getPageType() {
  let pageUrl = window.location.href;
  let type = "";
  
  if (pageUrl.startsWith("https://www.youtube.com/playlist")) {
    type = "overview"
  }

  return type;
}

function pollPlaylistReady() {
  let interval = setInterval(() => {

    let videos = [];
    let pageType = getPageType();
    let parent = '';

    if (pageType === "overview") {
      videos = Array.from(document.querySelectorAll("ytd-playlist-video-renderer"));
      if (videos.length > 0) parent = videos[0].parentElement;
      else return;
    } else return;

    let playlistLength = getPlaylistLength(pageType);

    // Determine if timestamps are loaded too
    let timestamps = parent.querySelectorAll("ytd-thumbnail-overlay-time-status-renderer");
    timestamps = Array.from(timestamps);

    // Determine number of videos in playlist that are unplayable
    let unplayableLength = parent.querySelectorAll("a[title='[Private video]']").length + parent.querySelectorAll("a[title='[Deleted video]']").length;

    let playableLength = (unplayableLength > 0)
     ? videos.length - unplayableLength
     : videos.length;

    if (videos.length === timestamps.length || playableLength === timestamps.length) {

      if (playlistLength > 100 && videos.length >= 100) {
        createDurationElement(videos);
      } else if (videos.length === playlistLength) {
        createDurationElement(videos);
      }

      clearInterval(interval);
    }
  }, 1000);
}

function getPlaylistLength(pageType) {
  let playlistLength = 0;

  if (pageType === "overview") {
    let tag = "#stats.style-scope.ytd-playlist-sidebar-primary-info-renderer";
    playlistLength = document.querySelector(tag).children[0].innerText;
    playlistLength = playlistLength.split(" ")[0];
    playlistLength = playlistLength.replace(/\,+/, "")
  }

  return Number(playlistLength);
}

function createDurationElement(videos) {
  let parentElement = getPlaylistParentElement(); 

  let durationElement = document.createElement("div");
  durationElement.className = "playlistTotalDuration";
  durationElement.style.fontSize = '1.6rem';
  durationElement.style.fontWeight = 500;
  durationElement.style.color = 'var(--google-blue-500)';

  durationElement.innerHTML = `<span style='color: var(--yt-spec-text-primary);'>Playlist Duration (1-${videos.length}):</span> ${calculateDuration(videos)}`;

  let currentDurationElement = parentElement.querySelector(".playlistTotalDuration");

  if (currentDurationElement) {
    parentElement.replaceChild(durationElement, currentDurationElement);
  } else {
    parentElement.appendChild(durationElement);
  }
}

function startPlaylistObserver() {
  let targetNode = null;

  if (getPageType() === "overview") {
    targetNode = document.querySelector("ytd-playlist-video-renderer");
    if (targetNode) targetNode = targetNode.parentElement;
    else return;
  } else return;

  const config = {childList: true};

  const callback = function(mutationsList, observer) {
      for(let mutation of mutationsList) {
          if (mutation.type === 'childList') {
            pollPlaylistReady();
          }
      }
  };

  const observer = new MutationObserver(callback);
  observer.observe(targetNode, config);

  return observer;
}

function getPlaylistParentElement() {
  let userPlaylist = document.querySelector("#title-form");
  let parentElementTag = "";

  if (userPlaylist) {
    parentElementTag = "#stats";
  } else {
    let stats = document.querySelector("#stats");
    let previousTotalDuration = stats.querySelector(".playlistTotalDuration");
    if (previousTotalDuration) stats.removeChild(previousTotalDuration);

    parentElementTag = "#title.style-scope.ytd-playlist-sidebar-primary-info-renderer";
  }

  return document.querySelector(parentElementTag);
}
