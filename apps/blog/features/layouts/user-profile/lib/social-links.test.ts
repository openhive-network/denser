import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Node resolves neither the tsconfig path alias nor an extensionless import:
// point `@ui/…` at the package's TypeScript source.
const UI_ALIAS = '@ui/';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith(UI_ALIAS)) return nextResolve(specifier, context);
    const source = new URL(
      `../../../../../../packages/ui/${specifier.slice(UI_ALIAS.length)}.ts`,
      import.meta.url
    );
    return nextResolve(source.href, context);
  }
});

const { parseSocialLinks, normalizeSocialHandle } = await import('./social-links.ts');

const NPUB = 'npub1' + 'q'.repeat(58);

const meta = (social: unknown): string => JSON.stringify({ profile: { name: 'alice', social } });

describe('parseSocialLinks', () => {
  it('builds links from fixed templates for every supported key, in a stable order', () => {
    const links = parseSocialLinks(
      meta({
        nostr: NPUB,
        dc: 'alice.dc',
        bsky: 'alice.bsky.social',
        tg: 'alice_tg',
        yt: '@AliceTube',
        ig: 'alice.ig',
        x: 'alice_x'
      })
    );
    assert.deepEqual(links, [
      { key: 'x', handle: 'alice_x', url: 'https://x.com/alice_x' },
      { key: 'ig', handle: 'alice.ig', url: 'https://www.instagram.com/alice.ig' },
      { key: 'yt', handle: 'AliceTube', url: 'https://www.youtube.com/@AliceTube' },
      { key: 'tg', handle: 'alice_tg', url: 'https://t.me/alice_tg' },
      { key: 'bsky', handle: 'alice.bsky.social', url: 'https://bsky.app/profile/alice.bsky.social' },
      { key: 'dc', handle: 'alice.dc', url: null },
      { key: 'nostr', handle: NPUB, url: null }
    ]);
  });

  it('ignores unknown keys and non-string values', () => {
    assert.deepEqual(
      parseSocialLinks(meta({ facebook: 'alice', x: 42, ig: ['alice'], yt: { h: 'a' }, tg: null })),
      []
    );
  });

  it('returns nothing for malformed or missing metadata', () => {
    for (const raw of [undefined, '', '{not json', 'null', '[]', '"str"', '{"profile":"x"}', meta('alice'), meta([])]) {
      assert.deepEqual(parseSocialLinks(raw), [], `metadata ${JSON.stringify(raw)}`);
    }
  });

  it('drops handles that try to inject a path or a scheme', () => {
    const attempts = [
      'a/../../evil',
      'javascript:alert(1)',
      '..',
      '.',
      'a?b=c',
      'a#frag',
      'a b',
      'https://evil.example',
      '<script>',
      'a%2F..'
    ];
    for (const handle of attempts) {
      assert.deepEqual(
        parseSocialLinks(meta({ x: handle, ig: handle, yt: handle, tg: handle, bsky: handle, dc: handle, nostr: handle })),
        [],
        `handle ${JSON.stringify(handle)}`
      );
    }
  });

  it('drops handles outside the platform length limits', () => {
    assert.deepEqual(parseSocialLinks(meta({ x: 'a'.repeat(16), tg: 'abcd', nostr: 'npub1abc' })), []);
  });
});

describe('normalizeSocialHandle', () => {
  it('trims and drops a leading @ where the platform allows it', () => {
    assert.equal(normalizeSocialHandle('x', '  @alice '), 'alice');
    assert.equal(normalizeSocialHandle('nostr', `@${NPUB}`), null);
    assert.equal(normalizeSocialHandle('x', '@@alice'), null);
  });
});
