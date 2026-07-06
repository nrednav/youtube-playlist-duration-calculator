/**
 * Mutation Shape Classifier
 *
 * The indivisible bridge between a territory event (a MutationRecord YouTube
 * delivered) and the map-level mutation handler in main.js.
 *
 * The handler previously branched on `mutationList.length === 1` alone,
 * which conflated two physically different events:
 *
 *   - a user-initiated video removal. Exactly one removed video, no added
 *     nodes, and a recorded last-interacted video.
 *   - a lazy-load append. Added nodes, no removed nodes, and no interaction.
 *
 * The misclassification dereferenced `window.ytpdc.lastVideoInteractedWith`,
 * which is null on long playlists before any interaction, and silently aborted the
 * only recalculation call on that branch. On playlists with >100 videos the
 * dominant mutation is the append, so the symptom was: no recalculation when
 * YouTube lazily loads more videos.
 */

/**
 * Decide whether a `childList` mutation is a user-initiated video removal
 * (possibly after sorting).
 *
 * Truth requires ALL of:
 *   - exactly one removed node
 *   - zero added nodes
 *   - the removed node's tag matches the active playlist's video tag
 *   - a recorded `lastInteracted` element (non-null)
 *
 * Any other shape, including a lazy-load append, returns false.
 *
 * @param {MutationRecord} mutation
 * @param {{ videoTag: string, lastInteracted: Element | null }} ctx
 * @returns {boolean}
 */
export const isRemovalMutation = (mutation, { videoTag, lastInteracted }) => {
  if (mutation.removedNodes.length !== 1) return false;
  if (mutation.addedNodes.length !== 0) return false;

  const removed = mutation.removedNodes[0];
  if (!removed) return false;

  if (removed.tagName?.toLowerCase() !== videoTag) return false;

  return lastInteracted != null;
};

/**
 * Decide whether a `childList` mutation is a lazy-load append.
 *
 * An append mutation has added nodes and no removed nodes. This is what
 * YouTube delivers when the user scrolls to the bottom of a long playlist
 * and the loader fetches more video renderers.
 *
 * @param {MutationRecord} mutation
 * @returns {boolean}
 */
export const isAppendMutation = (mutation) =>
  mutation.removedNodes.length === 0 && mutation.addedNodes.length > 0;
