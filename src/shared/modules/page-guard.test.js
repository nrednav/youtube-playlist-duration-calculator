import assert from "node:assert";
import { describe, it } from "node:test";
import {
  isOperablePlaylistPage,
  OPERABLE_PLAYLIST_PATHNAME,
} from "./page-guard.js";

describe("page-guard module", () => {
  describe("isOperablePlaylistPage()", () => {
    it("permits the exact playlist pathname", () => {
      assert.strictEqual(
        isOperablePlaylistPage(OPERABLE_PLAYLIST_PATHNAME),
        true,
      );
      assert.strictEqual(isOperablePlaylistPage("/playlist"), true);
    });

    it("rejects /feed/playlists (the reported insertion bug)", () => {
      // Regression lock: the playlist summary was injected under the
      // "Playlists" title on /feed/playlists during the SPA transition
      // window from /playlist -> /feed/playlists. The pathname had
      // already flipped. The playlist renderer DOM had not yet been
      // torn down. This must remain false.
      assert.strictEqual(isOperablePlaylistPage("/feed/playlists"), false);
    });

    it("rejects other feed URLs", () => {
      assert.strictEqual(isOperablePlaylistPage("/feed/history"), false);
      assert.strictEqual(isOperablePlaylistPage("/feed/subscriptions"), false);
      assert.strictEqual(isOperablePlaylistPage("/feed/trending"), false);
    });

    it("rejects the watch page even with a list parameter in search", () => {
      // The predicate inspects pathname only. /watch?v=...&list=... is
      // NOT an operable page by this contract. If the extension ever
      // gains watch-page playlist continuation support, the
      // affirmative set grows here; /feed/playlists stays excluded.
      assert.strictEqual(isOperablePlaylistPage("/watch"), false);
    });

    it("rejects the root, channel pages, and the empty edge", () => {
      assert.strictEqual(isOperablePlaylistPage("/"), false);
      assert.strictEqual(
        isOperablePlaylistPage("/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw"),
        false,
      );
      assert.strictEqual(isOperablePlaylistPage(""), false);
    });

    it("requires exact match, not prefix", () => {
      // /playlists (plural, the feed) must not match /playlist (singular).
      assert.strictEqual(isOperablePlaylistPage("/playlists"), false);
      // A pathname that merely starts with /playlist must not match.
      assert.strictEqual(isOperablePlaylistPage("/playlists/abc"), false);
    });
  });
});
