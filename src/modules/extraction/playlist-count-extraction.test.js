import assert from "node:assert";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";
import { extractPlaylistCount } from "./playlist-count-extraction.js";

/**
 * Build a page-header metadata view-model with the given interleaved text
 * spans (delimiters are inserted automatically between consecutive text
 * spans, mirroring YouTube's actual layout).
 *
 * Each entry of `texts` is rendered as a `ytContentMetadataViewModelMetadataText`
 * span. The surrounding `<yt-content-metadata-view-model>` carries the
 * `ytPageHeaderViewModelContentMetadata` class, matching real YouTube layout
 * so the page-header scope selector resolves.
 */
const buildHeader = (texts) => {
  const textSpans = texts
    .map(
      (t) =>
        `<span class="ytAttributedStringHost ytContentMetadataViewModelMetadataText ytAttributedStringWhiteSpacePreWrap ytAttributedStringLinkInheritColor" dir="auto" role="text">${t}</span>`,
    )
    .join(
      '<span aria-hidden="true" class="ytContentMetadataViewModelDelimiter">•</span>',
    );

  return `<yt-content-metadata-view-model class="ytPageHeaderViewModelContentMetadata ytPageHeaderViewModelContentMetadataOverlay ytContentMetadataViewModelHost"><div class="ytContentMetadataViewModelMetadataRow" role="group">${textSpans}</div></yt-content-metadata-view-model>`;
};

const docFrom = (innerHtml) =>
  new JSDOM(`<body>${innerHtml}</body>`).window.document;

describe("extractPlaylistCount, structural-invariant contract", () => {
  it("extracts the count from the viewmodel playlist metadata (exact user DOM)", () => {
    const html =
      '<yt-content-metadata-view-model class="ytPageHeaderViewModelContentMetadata ytPageHeaderViewModelContentMetadataOverlay ytContentMetadataViewModelHost">' +
      '<div class="ytContentMetadataViewModelMetadataRow" role="group">' +
      "<yt-avatar-stack-view-model></yt-avatar-stack-view-model>" +
      "</div>" +
      '<div class="ytContentMetadataViewModelMetadataRow" role="group">' +
      '<span class="ytAttributedStringHost ytContentMetadataViewModelMetadataText ytAttributedStringWhiteSpacePreWrap ytAttributedStringLinkInheritColor" dir="auto" role="text">Playlist</span>' +
      '<span aria-hidden="true" class="ytContentMetadataViewModelDelimiter">•</span>' +
      '<span class="ytAttributedStringHost ytContentMetadataViewModelMetadataText ytAttributedStringWhiteSpacePreWrap ytAttributedStringLinkInheritColor" dir="auto" role="text">154 videos</span>' +
      '<span aria-hidden="true" class="ytContentMetadataViewModelDelimiter">•</span>' +
      '<span class="ytAttributedStringHost ytContentMetadataViewModelMetadataText ytAttributedStringWhiteSpacePreWrap ytAttributedStringLinkInheritColor" dir="auto" role="text">858,009 views</span>' +
      "</div>" +
      "</yt-content-metadata-view-model>";

    const result = extractPlaylistCount(docFrom(html));

    assert.strictEqual(result.value, 154);
    assert.strictEqual(result.confidence, 0.9);
    assert.strictEqual(result.strategyName, "metadata-flanked");
  });

  it("extracts the count from the renderer playlist metadata (Private pattern)", () => {
    const html = buildHeader(["Playlist", "Private", "2 videos", "1 view"]);

    const result = extractPlaylistCount(docFrom(html));

    assert.strictEqual(result.value, 2);
  });

  it("extracts a large count with thousands separators", () => {
    const html = buildHeader(["Playlist", "1,234 videos", "858 views"]);
    assert.strictEqual(extractPlaylistCount(docFrom(html)).value, 1234);
  });

  it("returns null when a digit-bearing span has only a leading delimiter (not flanked)", () => {
    // YouTube always renders the playlist count flanked by BOTH a leading
    // and trailing delimiter. The trailing one precedes the views span.
    // A span with only a leading delimiter is therefore NOT the count by
    // the structural rule, and must not be extracted.
    const html = buildHeader(["Playlist", "78 videos"]);
    assert.strictEqual(extractPlaylistCount(docFrom(html)).value, null);
  });

  it("returns null when the page-header metadata view-model is absent", () => {
    const doc = docFrom("<div>no metadata here</div>");
    const result = extractPlaylistCount(doc);

    assert.strictEqual(result.value, null);
    assert.strictEqual(result.confidence, 0);
    assert.strictEqual(result.strategyName, "none");
  });

  it("returns null when no digit-bearing span is flanked by two delimiters", () => {
    // Only one text span, no flanking possible.
    const html = buildHeader(["Just a label"]);
    assert.strictEqual(extractPlaylistCount(docFrom(html)).value, null);
  });

  it("returns null when the flanked digit-bearing span is in a per-video (NON page-header) view-model", () => {
    // Regression lock: the per-video yt-content-metadata-view-model carries
    // only ytContentMetadataViewModelHost, NOT ytPageHeaderViewModelContentMetadata.
    // The extractor must scope to the page-header variant so a per-video row
    // ([views] • [date]) is never mistaken for the playlist count.
    const html =
      '<yt-content-metadata-view-model class="ytContentMetadataViewModelHost">' +
      '<div class="ytContentMetadataViewModelMetadataRow" role="group">' +
      '<span class="ytAttributedStringHost ytContentMetadataViewModelMetadataText ytAttributedStringWhiteSpacePreWrap ytAttributedStringLinkInheritColor" dir="auto" role="text">1.7M views</span>' +
      '<span aria-hidden="true" class="ytContentMetadataViewModelDelimiter">•</span>' +
      '<span class="ytAttributedStringHost ytContentMetadataViewModelMetadataText ytAttributedStringWhiteSpacePreWrap ytAttributedStringLinkInheritColor" dir="auto" role="text">2 years ago</span>' +
      "</div>" +
      "</yt-content-metadata-view-model>";

    assert.strictEqual(extractPlaylistCount(docFrom(html)).value, null);
  });

  it("does not confuse the trailing view-count span for the count when count is absent", () => {
    // No flanked digit span exists, so no count is returned even though a
    // digit-bearing "858 views" span is present. The trailing span is not
    // flanked (no delimiter after it).
    const html = buildHeader(["Playlist", "858 views"]);
    assert.strictEqual(extractPlaylistCount(docFrom(html)).value, null);
  });

  it("does not match a non-count label that happens to be flanked", () => {
    // "Private" is flanked but contains no digits, so it is skipped.
    const html = buildHeader(["Playlist", "Private", "858 views"]);
    assert.strictEqual(extractPlaylistCount(docFrom(html)).value, null);
  });
});
