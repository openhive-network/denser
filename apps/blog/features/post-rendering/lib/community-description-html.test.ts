import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

const { toCommunityDescriptionHtml } = await import('./community-description-html.ts');

// Description text as the renderer's sanitizer leaves it: `<` and `>` escaped, `"` kept raw.
const CLASS_LIKE_TEXT = 'x class="videoWrapper &lt;b&gt;x&lt;/b&gt;"';
const UPPER_CASE_CLASS_LIKE_TEXT = 'x class="videoWrapper &lt;B&gt;x&lt;/B&gt;"';

describe('toCommunityDescriptionHtml', () => {
  it('keeps class-like text of a Markdown description as escaped text', () => {
    const html = toCommunityDescriptionHtml(`<p>${CLASS_LIKE_TEXT}</p>`);
    assert.equal(html, `<p>${CLASS_LIKE_TEXT}</p>`);
    assert.doesNotMatch(html, /<b>/i);
  });

  it('keeps class-like text of an HTML description as escaped text', () => {
    const html = toCommunityDescriptionHtml(CLASS_LIKE_TEXT);
    assert.equal(html, CLASS_LIKE_TEXT);
  });

  it('creates no element from upper-case tag names in text', () => {
    const html = toCommunityDescriptionHtml(`<p>${UPPER_CASE_CLASS_LIKE_TEXT}</p>`);
    assert.equal(html, `<p>${UPPER_CASE_CLASS_LIKE_TEXT}</p>`);
    assert.doesNotMatch(html, /<b>/i);
  });

  it('leaves class-like text next to a real video wrapper as text', () => {
    const html = toCommunityDescriptionHtml(`<div class="videoWrapper"><p>${CLASS_LIKE_TEXT}</p></div>`);
    assert.equal(html, `<div><p>${CLASS_LIKE_TEXT}</p></div>`);
  });

  it('removes the videoWrapper class of a real embedded video, keeping its other classes', () => {
    const html = toCommunityDescriptionHtml(
      '<div class="threeSpeakWrapper videoWrapper"><div class="threespeak-facade embed-facade" data-embed="threespeak" data-threespeak-id="alice/abc"><span class="embed-facade-label">3Speak</span><button class="embed-play-btn"></button></div></div>'
    );
    assert.equal(html, '<div class="threeSpeakWrapper">https://play.3speak.tv/watch?v=alice/abc</div>');
  });

  it('shows an embedded player iframe as its URL', () => {
    const html = toCommunityDescriptionHtml(
      '<div class="videoWrapper"><iframe src="https://open.spotify.com/embed/track/1?a=1&amp;b=2" width="300"></iframe></div>'
    );
    assert.equal(html, '<div>https://open.spotify.com/embed/track/1?a=1&amp;b=2</div>');
  });

  it('gives links, code and sub elements the sidebar classes', () => {
    const html = toCommunityDescriptionHtml(
      '<p><a href="https://example.com/?a=1&amp;b=2" class="keep">link</a> <code class="x">c</code> <sub class="small">s</sub> <sub>t</sub></p>'
    );
    assert.equal(
      html,
      '<p><a href="https://example.com/?a=1&amp;b=2" class=" text-destructive break-words">link</a> <code class="whitespace-normal">c</code> <sub class="small leading-[150%]">s</sub> <sub class="leading-[150%]">t</sub></p>'
    );
  });

  it('keeps the links the renderer allows', () => {
    const html = toCommunityDescriptionHtml('<p><a href="/trending">a</a> <a href="hive://x">b</a></p>');
    assert.equal(
      html,
      '<p><a href="/trending" class=" text-destructive break-words">a</a> <a href="hive://x" class=" text-destructive break-words">b</a></p>'
    );
  });

  it('keeps inline styles as the renderer wrote them', () => {
    const html = toCommunityDescriptionHtml('<div style="overflow-x: auto; width: 100%;"><table></table></div>');
    assert.equal(html, '<div style="overflow-x: auto; width: 100%;"><table></table></div>');
  });

  it('prints no sanitize-html warning', () => {
    const warn = mock.method(console, 'warn', () => {});
    try {
      toCommunityDescriptionHtml('<p><a href="https://example.com">link</a> <code>c</code></p>');
      assert.equal(warn.mock.callCount(), 0);
    } finally {
      warn.mock.restore();
    }
  });
});
