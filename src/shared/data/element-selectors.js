export const elementSelectors = {
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
    new: ".immersive-header-content .metadata-action-bar",
    youtubePremium: "yt-content-metadata-view-model"
  },
  video: "ytd-playlist-video-renderer",
  playlist: "ytd-playlist-video-list-renderer #contents",
  channelName: ".ytd-channel-name",
  videoTitle: "#video-title",
  videoIndex: "yt-formatted-string#index",
  videoInfo: "yt-formatted-string#video-info",
  stats: {
    old: "#stats yt-formatted-string",
    new: ".metadata-stats yt-formatted-string"
  }
};
