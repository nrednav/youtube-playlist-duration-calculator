/**
 * Channel-Name Extraction
 *
 * Locates a video's channel name by structural invariant, not by element
 * name. The invariant: the channel attribution is the <a> inside the video
 * item whose href begins "/@". YouTube cannot render a channel attribution
 * without a link to that channel, and the link path is forced by what a
 * channel IS. This holds across the renderer and viewmodel architectures
 * and survives element-name renames that would break a selector-based
 * extractor (".ytd-channel-name").
 *
 * Strategy contract: { value: string|null, confidence: number }
 *
 * Matches the timestamp extractor's contract so the sort layer can hold
 * one uniform extraction interface per datum instead of a per-architecture
 * selector fork.
 */

const CHANNEL_HANDLE_HREF_PREFIX = "/@";

/**
 * Extract a video's channel name by locating the channel-link anchor.
 *
 * Degrades gracefully: null input, no matching anchor, or an empty-text
 * anchor all return { value: null, confidence: 0 }. The extractor never
 * throws, so unavailable videos (private or deleted, which have no channel
 * link) surface as "data absent" rather than crashing downstream sorting.
 *
 * @param {Element|null} videoElement
 * @returns {{ value: string|null, confidence: number }}
 */
export const extractChannelName = (videoElement) => {
  if (!videoElement) {
    return { value: null, confidence: 0 };
  }

  const anchors = videoElement.querySelectorAll("a");
  let channelAnchor = null;

  for (const anchor of anchors) {
    const href = anchor.getAttribute("href") || "";
    if (href.startsWith(CHANNEL_HANDLE_HREF_PREFIX)) {
      channelAnchor = anchor;
      break;
    }
  }

  if (!channelAnchor) {
    return { value: null, confidence: 0 };
  }

  const name = (channelAnchor.textContent || "").trim();

  if (!name) {
    return { value: null, confidence: 0 };
  }

  return { value: name, confidence: 0.9 };
};
