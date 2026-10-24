import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toMessageView, type ChatEventInput } from './message-view.ts';
import { linkify } from './linkify.ts';

const event = (overrides: Partial<ChatEventInput>): ChatEventInput => ({
  eventId: '$event',
  type: 'm.room.message',
  sender: '@bob:example.org',
  senderName: 'Bob',
  avatarMxc: 'mxc://example.org/bob',
  timestamp: 1_700_000_000_000,
  content: { msgtype: 'm.text', body: 'hello' },
  isState: false,
  redacted: false,
  ...overrides
});

const contentOf = (overrides: Partial<ChatEventInput>) => toMessageView(event(overrides))?.content;

describe('toMessageView', () => {
  it('shows a text message with its sender, avatar and time', () => {
    assert.deepEqual(toMessageView(event({})), {
      eventId: '$event',
      senderId: '@bob:example.org',
      senderName: 'Bob',
      avatarMxc: 'mxc://example.org/bob',
      timestamp: 1_700_000_000_000,
      emote: false,
      content: { kind: 'text', text: 'hello' }
    });
  });

  it("falls back to the sender's Matrix id for a sender without a display name", () => {
    assert.equal(toMessageView(event({ senderName: '' }))?.senderName, '@bob:example.org');
  });

  it('shows notices and emotes as text, an emote marked as one', () => {
    assert.deepEqual(contentOf({ content: { msgtype: 'm.notice', body: 'bot says' } }), { kind: 'text', text: 'bot says' });
    const emote = toMessageView(event({ content: { msgtype: 'm.emote', body: 'waves' } }));
    assert.equal(emote?.emote, true);
    assert.deepEqual(emote?.content, { kind: 'text', text: 'waves' });
  });

  it('keeps the formatting of an HTML message and drops everything the sanitizer does not allow', () => {
    const content = contentOf({
      content: {
        msgtype: 'm.text',
        body: 'plain',
        format: 'org.matrix.custom.html',
        formatted_body:
          '<b>bold</b> <img src="x" onerror="alert(1)"><script>alert(2)</script>' +
          '<a href="javascript:alert(3)">bad</a> <a href="https://hive.blog" onclick="x()" target="_self">good</a>' +
          '<p style="color:red" class="x">para</p>'
      }
    });
    assert.deepEqual(content, {
      kind: 'html',
      html:
        '<b>bold</b> <a target="_blank" rel="noopener noreferrer">bad</a> ' +
        '<a href="https://hive.blog" target="_blank" rel="noopener noreferrer">good</a><p>para</p>'
    });
  });

  it('shows a reply without the quoted message it replies to', () => {
    const reply = { 'm.relates_to': { 'm.in_reply_to': { event_id: '$original' } } };
    assert.deepEqual(
      contentOf({
        content: {
          msgtype: 'm.text',
          body: '> <@carol:example.org> original\n> more\n\nthe reply',
          format: 'org.matrix.custom.html',
          formatted_body: '<mx-reply><blockquote>original</blockquote></mx-reply>the reply',
          ...reply
        }
      }),
      { kind: 'html', html: 'the reply' }
    );
    assert.deepEqual(contentOf({ content: { msgtype: 'm.text', body: '> quoted\n\nthe reply', ...reply } }), {
      kind: 'text',
      text: 'the reply'
    });
  });

  it('shows the plain body when the HTML sanitizes to nothing, or is in another format', () => {
    const html = { msgtype: 'm.text', body: 'plain', format: 'org.matrix.custom.html' };
    assert.deepEqual(contentOf({ content: { ...html, formatted_body: '<script>x</script>' } }), {
      kind: 'text',
      text: 'plain'
    });
    assert.deepEqual(contentOf({ content: { ...html, format: 'text/markdown', formatted_body: '<b>x</b>' } }), {
      kind: 'text',
      text: 'plain'
    });
  });

  it('puts a placeholder for an encrypted event', () => {
    assert.deepEqual(contentOf({ type: 'm.room.encrypted', content: { algorithm: 'm.megolm.v1.aes-sha2' } }), {
      kind: 'encrypted'
    });
  });

  it('puts a placeholder for messages and events it cannot show', () => {
    for (const overrides of [
      { content: { msgtype: 'm.image', body: 'cat.png', url: 'mxc://example.org/cat' } },
      { content: { msgtype: 'm.text' } },
      { type: 'm.sticker', content: { body: 'sticker' } },
      { type: 'm.poll.start', content: {} }
    ]) {
      assert.deepEqual(contentOf(overrides), { kind: 'unsupported' }, JSON.stringify(overrides));
    }
  });

  it('leaves out state events, redacted messages, reactions, redactions and edits', () => {
    for (const overrides of [
      { type: 'm.room.member', isState: true, content: { membership: 'join' } },
      { redacted: true, content: {} },
      { type: 'm.reaction', content: { 'm.relates_to': { rel_type: 'm.annotation', key: '👍' } } },
      { type: 'm.room.redaction', content: { redacts: '$x' } },
      { content: { msgtype: 'm.text', body: '* fixed', 'm.relates_to': { rel_type: 'm.replace', event_id: '$x' } } }
    ]) {
      assert.equal(toMessageView(event(overrides)), null, JSON.stringify(overrides));
    }
  });
});

describe('linkify', () => {
  it('makes the http(s) links of plain text links, leaving the punctuation around them out', () => {
    assert.deepEqual(linkify('see https://hive.blog/trending, and (http://example.org/a?b=1).'), [
      { text: 'see ' },
      { text: 'https://hive.blog/trending', href: 'https://hive.blog/trending' },
      { text: ', and (' },
      { text: 'http://example.org/a?b=1', href: 'http://example.org/a?b=1' },
      { text: ').' }
    ]);
  });

  it('makes nothing else a link', () => {
    assert.deepEqual(linkify('javascript:alert(1) or www.example.org or ftp://x'), [
      { text: 'javascript:alert(1) or www.example.org or ftp://x' }
    ]);
    assert.deepEqual(linkify(''), []);
  });
});
