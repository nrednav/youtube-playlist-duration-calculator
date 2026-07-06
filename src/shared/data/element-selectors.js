export const elementSelectors = {
  timestamp: "ytd-thumbnail-overlay-time-status-renderer",
  // Design anchor = Element that helps distinguish between old & new layouts
  designAnchor: {
    old: "ytd-playlist-sidebar-renderer",
    new: "ytd-playlist-header-renderer",
  },
  playlistSummary: {
    old: "#ytpdc-playlist-summary-old",
    new: "#ytpdc-playlist-summary-new",
  },
  playlistMetadata: [
    {
      selector: ".yt-page-header-view-model__page-header-content",
      queryMethod: "querySelectorAllAndFilter",
    },
    {
      selector: ".ytPageHeaderViewModelContent",
      queryMethod: "querySelectorAllAndFilter",
    },
    {
      selector: ".immersive-header-content .metadata-action-bar",
      queryMethod: "querySelector",
    },
    {
      selector: "ytd-playlist-sidebar-renderer #items",
      queryMethod: "querySelector",
    },
    {
      selector: ".yt-flexible-actions-view-model-wiz__action-row",
      queryMethod: "querySelector",
    },
  ],
  video: "ytd-playlist-video-renderer",
  playlist: "ytd-playlist-video-list-renderer #contents",
  videoTitle: "#video-title",
  videoIndex: "yt-formatted-string#index",
  videoInfo: "yt-formatted-string#video-info",
  stats: {
    old: "#stats yt-formatted-string",
    new: ".metadata-stats yt-formatted-string",
  },
};

export const desyncIndicators = {
  /**
   * Detects which YouTube playlist rendering architecture is currently active.
   *
   * Variants:
   * - "renderer": Traditional ytd-*-renderer CustomElements (e.g., Watch Later)
   * - "viewmodel": New yt-*-view-model + badge-shape architecture (e.g., Liked Videos)
   * - "unknown": Neither architecture detected
   *
   * @returns {{ known: boolean, variant: string }}
   */
  detectVariant(doc = document) {
    const checks = [
      {
        variant: "renderer",
        known: !!doc.querySelector("ytd-playlist-video-list-renderer"),
      },
      {
        variant: "viewmodel",
        known:
          !doc.querySelector("ytd-playlist-video-list-renderer") &&
          !!doc.querySelector("yt-lockup-view-model"),
      },
    ];

    const match = checks.find((check) => check.known);

    return match || { known: false, variant: "unknown" };
  },
};
