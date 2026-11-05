import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { withTwitchParent, deferTwitchIframes } = await import('./twitch-iframes.ts');

const HOST = 'denser.example.org';
// The iframe dagamers.xyz puts in its posts, as the renderer's sanitizer writes it.
const DAGAMERS_SRC =
  'https://player.twitch.tv/?video=v2919479459&parent=peakd.com&parent=hive.blog&parent=steemit.com&parent=ecency.com&autoplay=false';
const sanitizedIframe = (src: string) =>
  `<iframe src="${src.replace(/&/g, '&amp;')}" width="640" height="480" frameborder="0" loading="lazy"></iframe>`;

const parentsOf = (src: string) => new URL(src).searchParams.getAll('parent');

describe('withTwitchParent', () => {
  it('adds the hostname to the parents of a Twitch player src and keeps the others', () => {
    const src = withTwitchParent(DAGAMERS_SRC, HOST);
    assert.deepEqual(parentsOf(src), ['peakd.com', 'hive.blog', 'steemit.com', 'ecency.com', HOST]);
    const params = new URL(src).searchParams;
    assert.equal(params.get('video'), 'v2919479459');
    assert.equal(params.get('autoplay'), 'false');
    assert.equal(new URL(src).hostname, 'player.twitch.tv');
  });

  it('adds the hostname to a Twitch clips src', () => {
    const src = withTwitchParent('https://clips.twitch.tv/embed?clip=FunnyClip&parent=peakd.com', HOST);
    assert.deepEqual(parentsOf(src), ['peakd.com', HOST]);
    assert.equal(new URL(src).searchParams.get('clip'), 'FunnyClip');
  });

  it('adds a parent to a src without one', () => {
    assert.equal(
      withTwitchParent('https://player.twitch.tv/?channel=ninja', HOST),
      `https://player.twitch.tv/?channel=ninja&parent=${HOST}`
    );
  });

  it('resolves a protocol-relative Twitch src as https', () => {
    assert.equal(
      withTwitchParent('//player.twitch.tv/?channel=ninja', HOST),
      `https://player.twitch.tv/?channel=ninja&parent=${HOST}`
    );
  });

  it('does not add the hostname twice', () => {
    const once = withTwitchParent(DAGAMERS_SRC, HOST);
    assert.equal(withTwitchParent(once, HOST), once);
    assert.equal(parentsOf(withTwitchParent(once, HOST)).filter((parent) => parent === HOST).length, 1);
  });

  it('leaves the src of another provider unchanged', () => {
    const youtube = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    assert.equal(withTwitchParent(youtube, HOST), youtube);
    const lookalike = 'https://player.twitch.tv.example.com/?channel=ninja';
    assert.equal(withTwitchParent(lookalike, HOST), lookalike);
  });
});

describe('deferTwitchIframes', () => {
  it('moves the src of a Twitch player iframe to data-twitch-src, unchanged', () => {
    const html = deferTwitchIframes(`<center>${sanitizedIframe(DAGAMERS_SRC)}</center>`);
    assert.equal(
      html,
      `<center><iframe data-twitch-src="${DAGAMERS_SRC.replace(/&/g, '&amp;')}" width="640" height="480" frameborder="0" loading="lazy"></iframe></center>`
    );
    assert.doesNotMatch(html, /\ssrc=/);
  });

  it('defers a clips iframe too', () => {
    const html = deferTwitchIframes(sanitizedIframe('https://clips.twitch.tv/embed?clip=FunnyClip'));
    assert.match(html, /^<iframe data-twitch-src="https:\/\/clips\.twitch\.tv\/embed\?clip=FunnyClip"/);
  });

  it('leaves iframes of other providers and other elements unchanged', () => {
    const html = [
      sanitizedIframe('https://www.youtube.com/embed/dQw4w9WgXcQ'),
      '<img src="https://images.hive.blog/x.png">',
      '<a href="https://player.twitch.tv/?channel=ninja">ninja</a>'
    ].join('');
    assert.equal(deferTwitchIframes(html), html);
  });

  it('defers only the Twitch iframe among several', () => {
    const youtube = sanitizedIframe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    const html = deferTwitchIframes(`${youtube}<p>text</p>${sanitizedIframe(DAGAMERS_SRC)}`);
    assert.ok(html.startsWith(`${youtube}<p>text</p><iframe data-twitch-src=`));
  });
});
